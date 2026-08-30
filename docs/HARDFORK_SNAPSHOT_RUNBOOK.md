# Fushuma Hard-Fork Snapshot Runbook

**Network:** Fushuma zkEVM+ Mainnet · **Chain ID:** 121224
**Tooling:** `scripts/snapshot/` · **Status:** ready to run

This is the procedure for freezing the network state before a hard fork,
proving the freeze is correct, and publishing it so the community can check it
independently.

---

## 0. Decide which kind of fork you are doing

This changes what the snapshot is *for*, and it is worth being explicit before
anything else. The two are frequently conflated, and the difference decides
whether a missing storage preimage is a footnote or a launch blocker.

| | **In-place fork** | **Re-launch fork** |
|---|---|---|
| What happens | New client release activates new rules at block N | New chain starts from a new genesis seeded with old state |
| Chain state | Carried forward in the existing database | Rebuilt from an exported alloc |
| Snapshot's role | **Audit record + rollback insurance** | **The source of truth for the new genesis** |
| Needs `debug_*` + preimages | Nice to have | **Mandatory** |
| Needs chaindata backup | **Mandatory** | Strongly recommended |

Most hard forks are **in-place**. If you are shipping a client release that
turns on new rules at a block height, you are in the left column: the snapshot
is your proof of what the chain looked like at the fork, and your ability to
answer "did anyone lose funds?" with data instead of assurances.

Only go down the right column if you are genuinely starting a new chain.

---

## 1. What you need before the fork window

### Node requirements

Run the export against a node **you control**. A public RPC will not expose the
debug namespace, and will rate-limit a multi-hour scan.

```bash
geth \
  --http --http.api eth,net,web3,debug \
  --gcmode archive \
  --cache.preimages \
  --http.addr 127.0.0.1 --http.port 8545
```

Three flags matter, for three different reasons:

- `--http.api ...,debug` — without it there is no full state dump at all. The
  exporter falls back to log replay, which captures balances but **not contract
  storage**.
- `--gcmode archive` — lets the export be re-run and audited afterwards. A
  pruned node can only answer for the last ~128 blocks.
- `--cache.preimages` — the one that bites people. Without it, geth returns
  account and storage keys as **hashes**, and a hash cannot be turned back into
  an address or a storage slot. The dump still records balances, but it cannot
  seed a genesis. **This flag must be set from the start of sync** — turning it
  on later does not backfill preimages for existing state.

If the export node was synced without `--cache.preimages` and you need a
re-launch genesis, you must re-sync before the fork. Budget for that: it is the
single most common way this goes wrong, and it is not fixable on the day.

### Confirm the node is ready

```bash
pnpm snapshot:preflight -- --rpc http://127.0.0.1:8545
```

This checks chain identity, sync state, historical state depth, the debug
namespace, whether preimages are present, the `eth_getLogs` cap, batch support,
and that every tracked contract has code. It exits non-zero if anything blocks
a snapshot, so it can gate a release step.

Run it **days before the fork**, not on the day. Everything it flags is a
node-configuration problem, and most take a re-sync to fix.

---

## 2. Freeze block selection

Pick a block that is:

- **Far enough back to be final.** The default is `head - 64`. Do not go below
  ~32 on a live chain.
- **Announced in advance.** Publish the height before it passes, so nobody can
  argue the freeze point was chosen after seeing the balances.
- **Fixed.** Pass it explicitly with `--block N` so a re-run reproduces the same
  snapshot rather than silently drifting forward with the chain head.

```bash
# See what the tool would pick, without exporting anything
pnpm snapshot -- --rpc http://127.0.0.1:8545 --steps pin
```

---

## 3. Back up the chaindata

**This is the actual "whole network snapshot", and no RPC export replaces it.**
It is what lets you roll the network back if the fork goes wrong.

```bash
# 1. Stop the node cleanly. A copy of a running database is not a backup.
systemctl stop fushuma-node

# 2. Copy the data directory
tar -C /var/lib/fushuma -cf - chaindata \
  | zstd -T0 -3 \
  > /backup/fushuma-chaindata-block-<N>.tar.zst

# 3. Checksum it, so you can prove the restore is the same bytes
sha256sum /backup/fushuma-chaindata-block-<N>.tar.zst \
  | tee /backup/fushuma-chaindata-block-<N>.sha256

# 4. Restart
systemctl start fushuma-node
```

Take this on **at least two independent machines**, and copy one off-site.
A backup that only exists on the machine you are about to upgrade is not a
backup.

---

## 4. Run the export

```bash
pnpm snapshot -- \
  --rpc http://127.0.0.1:8545 \
  --block <N> \
  --full-verify
```

Output lands in `snapshots/fushuma-121224-block-<N>/`:

```
block.json                    the frozen block header
state/accounts.ndjson         every account: balance, nonce, code
state/storage.ndjson          every contract storage slot
accounts/native-merkle.json   Merkle root over native FUMA balances
tokens/<token>-holders.ndjson holder balances, replayed and verified
tokens/<token>-merkle.json    per-token Merkle root
protocol/ve-locks.ndjson      every veNFT lock, owner and voting power
protocol/proposals.ndjson     proposals with tallies and state
protocol/grants.ndjson        grants, including unclaimed amounts
protocol/launchpad-icos.ndjson ICOs and their vesting contracts
bridge/config.json            authorities, threshold, token backing, supported chains
bridge/processed-claims.ndjson every (fromChainId, txId) already claimed
bridge/outbound-deposits.ndjson transfers that left Fushuma
manifest.json                 SHA-256 of every file + one snapshot hash
```

**Runtime.** Dominated by the storage dump and the log scans. Expect tens of
minutes on a local node; hours against a remote or rate-limited one. The
discovery scan checkpoints after every range, so an interrupted run resumes
rather than starting over.

**Useful flags**

| Flag | Why |
|---|---|
| `--full-verify` | Re-read *every* replayed token balance on chain, not a sample. Slower. Use it for the real thing. |
| `--log-range N` | Blocks per `eth_getLogs` call. Lower it if the node caps queries; preflight tells you the cap. |
| `--batch-size N` / `--concurrency N` | Throughput. Lower both if the node returns 429s. |
| `--steps a,b` | Re-run only some steps, e.g. `--steps tokens` after fixing a token address. |
| `--skip-state-dump` | Skip the debug dump even where available. |

**Auth.** A node behind a token: set `SNAPSHOT_RPC_HEADERS="Authorization: Bearer <token>"`.
It is read from the environment and never written to the manifest, so it does
not end up in shell history, a process list, or the published artifacts.

### Read the warnings

The run ends with a warning list. Treat every entry as a blocker until you have
explained it. The ones that matter most:

- *"State dump is missing key preimages"* — the dump cannot become a genesis
  alloc. Fatal for a re-launch, a footnote for an in-place fork.
- *"Token balance replay did not verify"* — the replayed holder set disagrees
  with the chain. **Do not migrate those balances.** Usually a token with
  non-standard Transfer semantics (rebasing, fee-on-transfer, a mint path that
  does not emit). Investigate before proceeding.
- *"[voting-escrow] Sum of lock amounts does not equal totalLocked()"* — locks
  were missed, or the contract's own accounting has drifted. Either way the
  governance weights in this snapshot are wrong.
- *"Addresses that only ever received value via an internal call..."* — you ran
  without the debug namespace, so the account set may be incomplete.

A reorg at any point during the export aborts the whole run. That is
deliberate: a snapshot that mixes two chains is worse than no snapshot, because
it looks complete.

---

## 5. Verify before you publish

Verify on a **different machine**, ideally against a **different node**:

```bash
pnpm snapshot:verify -- \
  --dir snapshots/fushuma-121224-block-<N> \
  --rpc <second node>
```

This re-hashes every file against the manifest, rebuilds every Merkle root from
the holder data, confirms the freeze block is still canonical, and re-reads a
sample of balances on chain. It exits non-zero if anything fails.

Two people should run this independently and compare the `snapshotHash`. If the
hashes differ, stop and find out why before anything is announced.

---

## 6. Publish the commitment

Before the fork, publish:

- **Snapshot hash** — `snapshotHash` from `manifest.json`
- **Freeze block number and hash**
- **State root**
- **Merkle roots** — native FUMA, and each token

`SNAPSHOT.txt.json` holds exactly this set, ready to quote.

Publishing the roots is what makes the snapshot checkable. Any holder can hash
their own `(address, balance)` pair and verify it is in the tree, without
downloading anything or trusting the team's summary. The Merkle format is
OpenZeppelin `MerkleProof`-compatible, so the same root drives a claim contract
if balances have to be re-distributed.

---

## 7. Genesis alloc — re-launch forks only

```bash
pnpm snapshot:genesis -- --dir snapshots/fushuma-121224-block-<N>
```

Produces `genesis-alloc.json` and a `genesis-template.json` skeleton.

The builder **refuses to emit** accounts or slots whose key preimage is
missing, and exits non-zero. This is not a nuisance check: an alloc silently
missing storage slots produces contracts with the wrong internal state — token
balances that do not exist, owners that are not owners, pools with the wrong
reserves — and the damage is only visible after launch. `--allow-incomplete`
keeps the file for auditing but never makes it safe to launch from.

Before launching, fill in the fork activation blocks in the template and review
`gasLimit`, `difficulty` and `extraData` against the target client release.

---

## 7b. The bridge — the part that can lose real money

The bridge is deployed at **one address on seven chains**: Fushuma plus
Ethereum, BSC, Polygon, Arbitrum, Unichain and Base. **The six foreign
deployments do not fork with you.** They keep running, still believing in chain
121224, still holding the token pairs and authority set they were configured
with. Everything below follows from that.

### Two ways a migration loses money here

**1. Losing the processed-claim set → the bridge gets drained.**
`isTxProcessed(fromChainId, txId)` is the only thing stopping a historical
inbound transfer from being claimed a second time. It is a mapping, so it
cannot be read out by calling the contract. The snapshot rebuilds it by
replaying every `Claim` and `ClaimToContract` log — which carry `txId` and
`fromChainId` explicitly — into `bridge/processed-claims.ndjson`, then reads a
sample back through `isTxProcessed` to prove the reconstruction. If any claim
found in the logs does not read back as processed, the run warns and **that set
must not be used to seed replay protection**.

On an EVM-equivalent re-launch the storage dump carries the mapping verbatim
and this is belt-and-braces. On a non-EVM migration the log replay is the
*only* way to recover it.

**2. Losing in-flight inbound transfers → user funds are stranded.**
A deposit made on Ethereum that had not been claimed on Fushuma at the freeze
block exists only as a log on Ethereum. The foreign bridge has already taken
the funds. Fork without accounting for it and nothing on the new chain knows
anything is owed.

These are invisible from Fushuma, so they need a separate cross-chain pass:

```bash
cp bridge-chains.example.json bridge-chains.json   # fill in RPCs + deployment blocks
pnpm snapshot:bridge-inbound -- \
  --dir snapshots/fushuma-121224-block-<N> \
  --chains bridge-chains.json
```

It scans each foreign chain for deposits addressed to Fushuma, subtracts the
claims already recorded on the Fushuma side, and writes what is left to
`bridge/inbound-unclaimed.ndjson` — your outstanding liability list.

A chain missing from the config is reported as **NOT SCANNED**, never as empty.
Silence there would read as "nothing pending", which is precisely the mistake
that strands funds.

The matching rule is that a Fushuma `Claim.txId` is the deposit's transaction
hash on the source chain. The tool prints a match rate per chain; a near-zero
rate means the rule does not hold for this deployment rather than that
everything is outstanding, and it warns accordingly. Verify one case by hand
before treating a large list as real.

### Reconnecting after the fork

`bridge/config.json` is the checklist. On the new chain you must reproduce:

- the **authority set**, and which authorities are `required`
- `threshold` and `minRequiredAuthorities`
- the **token pairs** and each token's `tokenDeposits` backing
- `isSupported` for every partner chain
- `feeTo`, `getBridgeFee` per token, `contractCaller`, `tokenImplementation`

Then **re-seed `isTxProcessed` from `processed-claims.ndjson` before opening
claims.** Opening the bridge first and backfilling after is the drain scenario.

On the foreign side, whoever owns those bridges has to point them at the new
Fushuma: `setSupportedChain`, and re-created token pairs if the chain ID or any
token address changes. That is six separate transactions on six chains, by the
bridge owner, and it is not something this repo can do for you.

**If the chain ID changes**, assume every foreign pairing breaks until proven
otherwise, and check whether authority signatures are chain-ID-bound before
committing to a new ID.

### Settle before you fork

The cleanest migration has an empty in-flight set. Consider `freeze()`ing the
bridge some hours before the freeze block, letting outstanding claims drain,
and confirming `inbound-unclaimed.ndjson` is empty or a short, known list.

---

## 8. Rollback plan

Decide the abort criteria **before** the fork, and write them down:

- Chain does not produce blocks within N minutes of the fork height
- Validators split across two chains
- State root mismatch between independent implementations

To roll back: stop all nodes, restore the chaindata backup from §3, verify the
checksum matches, restart on the pre-fork client release, confirm the head
matches the freeze block, then resume.

The snapshot is what tells you whether the rollback was clean: re-run
`snapshot:verify --rpc <restored node>` and confirm the freeze block hash and
balances still match.

---

## 9. After the fork

1. Re-run the export at the first post-fork block.
2. Diff the two: native supply, token supplies, veNFT lock total, grant
   unclaimed totals. Anything that moved and should not have is a bug worth
   catching in the first hour, not the first week.
3. Publish the post-fork snapshot hash alongside the pre-fork one.
4. Archive both snapshot directories with the chaindata backup.

---

## Timeline

| When | Action |
|---|---|
| T-7 days | `snapshot:preflight`. Fix node config. Re-sync if preimages are missing. |
| T-3 days | Full rehearsal against a testnet or a forked local node. Time the run. |
| T-2 days | Announce the freeze block height. Run `snapshot:bridge-inbound` to see the current in-flight bridge backlog. |
| T-1 day | Second chaindata backup, off-site copy. |
| T-0 | Freeze block passes → chaindata backup → export → verify on a second machine → publish hashes → fork. |
| T+1 hour | Post-fork export and diff. |

---

## Known limitations

Stated plainly, because knowing where a tool stops is part of trusting it.

1. **Without the debug namespace, contract storage is not captured.** Balances
   and protocol state are, but a genesis cannot be built from it.
2. **Without preimages, the state dump cannot become a genesis alloc.** It
   remains a valid balance record.
3. **Log-replay discovery misses internal-only recipients.** An address that
   only ever received value through an internal call, and never emitted or was
   indexed in an event, is invisible to standard RPC. Only affects the fallback
   path.
4. **Token replay assumes standard ERC-20 Transfer semantics.** Rebasing and
   fee-on-transfer tokens will fail the on-chain check — which is the point:
   they are flagged, not silently exported wrong.
5. **The exporter reads; it never writes to the chain.** It needs no keys and
   holds no funds.
6. **Foreign bridge state is not snapshotted, only reconciled against.** The six
   foreign deployments are outside this chain and outside this tooling; the
   inbound scan reads their logs but cannot capture or migrate their state.
7. **Vesting beneficiaries and LP positions have no domain-level export.** Their
   storage is captured in the state dump, so an EVM-equivalent fork carries
   them, but a non-EVM migration would need them reconstructed. Confirmed with
   the team as unused as of this writing.
