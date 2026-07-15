# Fushuma Chain-Migration Snapshot Toolkit

Tooling to snapshot **native FUMA balances** and **ERC-20 holder balances** on
Fushuma (Chain ID `121224`) at a fixed block, and emit a **Merkle airdrop-claim
bundle** that a distributor contract on the new chain can verify. Built for the
migration to new blockchain technology tracked at <https://fumascan.com>.

- Library: [`src/lib/snapshot/`](../../src/lib/snapshot) (pure + testable)
- CLIs: [`build-snapshot.ts`](./build-snapshot.ts), [`verify-snapshot.ts`](./verify-snapshot.ts)
- Claim contract: [`contracts/migration/FumaMigrationDistributor.sol`](../../contracts/migration/FumaMigrationDistributor.sol)

## What it produces

For each asset (native FUMA + each configured ERC-20), under `<out>/<block>/`:

```
manifest.json              # chainId, block, params, per-asset {root, numClaims, tokenTotal}, excluded summary
balances/<SYMBOL>.json     # normalized, deduped holder balances (audit trail)
claims/<SYMBOL>.json       # merkleRoot + { address -> { amount, proof } } for on-chain claiming
excluded/<SYMBOL>.json     # everything left OUT of the airdrop + why (burn/system/contract/dust)
```

Nothing is dropped silently: every excluded address is recorded with a reason
and balance in `excluded/*.json` and summarized in `manifest.json`. This is
where contract-custodied user funds surface (see "Contract-custodied funds").

The Merkle tree is byte-for-byte compatible with
[`@openzeppelin/merkle-tree`](https://github.com/OpenZeppelin/merkle-tree)
(`StandardMerkleTree`) and with OpenZeppelin's Solidity `MerkleProof`
(commutative/sorted-pair hashing). Leaves are:

```
leaf = keccak256(bytes.concat(keccak256(abi.encode(account, amount))))
```

Every proof is re-verified through a line-for-line mirror of the on-chain
verification path before it is written, so a bundle that passes generation is
guaranteed claimable.

## Prerequisites

- Node 22+, `pnpm` (already used by this repo).
- **Network access to `https://rpc.fushuma.com` and `https://fumascan.com`** for
  live collection. Fumascan runs Blockscout; its v2 REST API is used to
  enumerate holders. Some sandboxed/CI egress policies block these hosts — run
  the live step from an environment that can reach them.
- An **archive node** if you pin balances at a historical block (the default).
  If your RPC only serves recent state, either target a recent block or pass
  `--no-pin` to trust the explorer's current balances.

## Usage

### 1. Build the snapshot (live)

```bash
# Pin balances at a specific block (recommended: choose the agreed migration block)
pnpm snapshot:build -- --block 1234567 --out snapshot-out

# Historically-complete ERC-20 holder set via Transfer-log replay (needs archive RPC)
pnpm snapshot:build -- --block 1234567 --token-source logs --deploy-block 0

# Include unknown contract-held balances (system/protocol contracts stay excluded)
pnpm snapshot:build -- --block 1234567 --include-contracts

# Drop dust below a threshold (base units), e.g. < 0.001 FUMA
pnpm snapshot:build -- --block 1234567 --min-balance 1000000000000000

# Supplement enumeration with extra addresses (e.g. from your own archive query)
pnpm snapshot:build -- --block 1234567 --holders extra-addresses.txt
```

Flags: `--out`, `--block`, `--fixture`, `--include-contracts`, `--min-balance`,
`--no-pin`, `--token-source explorer|logs`, `--deploy-block`, `--holders`.

### 2. Verify the output

```bash
pnpm snapshot:verify -- snapshot-out/1234567
```

Recomputes every leaf, folds every proof exactly as the distributor will, and
checks roots/totals against `manifest.json`.

### 3. Offline dry-run (no network)

```bash
pnpm snapshot:build -- --fixture scripts/snapshot/fixtures/sample-balances.json --out snapshot-out
pnpm snapshot:verify -- snapshot-out/1000000
```

## Configuration

All knobs read from environment variables (see `src/lib/snapshot/config.ts`),
overridable by CLI flags:

| Env var | Default | Meaning |
| --- | --- | --- |
| `SNAPSHOT_RPC_URL` | `https://rpc.fushuma.com` | JSON-RPC endpoint |
| `SNAPSHOT_EXPLORER_API_URL` | `https://fumascan.com` | Blockscout base URL |
| `SNAPSHOT_EXPLORER_API_KEY` | _(none)_ | Optional explorer API key |
| `SNAPSHOT_BLOCK` | `latest` | Block to pin balances at |
| `SNAPSHOT_MIN_BALANCE_WEI` | `1` | Drop balances below this |
| `SNAPSHOT_INCLUDE_CONTRACTS` | `false` | Include unknown contract balances |
| `SNAPSHOT_PIN_AT_BLOCK` | `true` | Re-read balances at block over RPC |
| `SNAPSHOT_TOKEN_HOLDER_SOURCE` | `explorer` | ERC-20 holder source: `explorer` or `logs` |
| `SNAPSHOT_DEPLOY_BLOCK` | `0` | Earliest block for `logs` Transfer replay |
| `SNAPSHOT_LOG_CHUNK` | `50000` | Block span per `getLogs` request |
| `SNAPSHOT_MULTICALL3` | _(none)_ | Multicall3 address to batch ERC-20 reads |
| `SNAPSHOT_CONCURRENCY` | `8` | Parallel RPC requests |
| `SNAPSHOT_MAX_RETRIES` | `5` | Retries per explorer/RPC request |

Assets default to native FUMA plus the deployed WFUMA/USDC/USDT tokens
(`docs/DEPLOYED_CONTRACTS.md`). Add more tokens by editing `KNOWN_ERC20S` in
`src/lib/snapshot/config.ts`.

## Methodology & caveats

Read these before trusting a snapshot for a real migration — two of them can
cause real users to lose funds if ignored.

- **Enumerate then pin.** The explorer is trusted only to discover the *set* of
  holders. Actual claimable amounts are re-read at the exact block over RPC, so
  the result is deterministic and independent of the explorer's live values
  (disable with `--no-pin`, which then forces `--block latest`).

- **Holder completeness (can lose funds).** The explorer lists *current*
  holders. If you pin at a past block, anyone who moved their balance to zero
  **after** that block is not enumerated and would be omitted, even though they
  held funds at the snapshot block. Mitigations:
  - For ERC-20s, use `--token-source logs`: it replays `Transfer` events up to
    the block for a historically-complete holder set (requires an archive RPC).
  - For native FUMA there are no `Transfer` logs, so either take the snapshot at
    (or very near) chain head (`--block latest`, so enumeration and balances
    agree), or supply a complete address list via `--holders` (e.g. derived from
    an archive/trace export).

- **Contract-custodied funds (can lose funds).** Balances held by protocol
  contracts are excluded by default and listed in `excluded/*.json`. Crucially,
  some of these are **user** funds in custody, not protocol-owned:
  - **VotingEscrow / veFUMA** holds users' locked FUMA,
  - **CLPoolManager / BinPoolManager** hold LP-deposited tokens,
  - **Vesting / Launchpad / Bridge** hold escrowed user funds.

  Airdropping to these contract addresses on the new chain would strand the
  funds, so they are excluded — but that means the underlying users are not made
  whole by the base snapshot. Review `excluded/*.json`, then attribute those
  balances to the real users with dedicated adapters (read veFUMA locks, LP
  shares, vesting schedules) and feed the per-user amounts back in (e.g. via a
  fixture or `--holders` + a custom balance source). This is a deliberate policy
  decision, surfaced loudly rather than hidden.

- **WFUMA vs FUMA.** Wrapped FUMA is snapshotted as an ERC-20 in its own tree.
  The WFUMA contract's *native* balance (the wrapped backing) is always excluded
  as a system contract, so there is no double-count in the default run. If you
  instead want to credit WFUMA holders in native FUMA, merge the WFUMA tree into
  the native one and keep the exclusion.

- **Token coverage.** Only WFUMA/USDC/USDT are configured by default. Any other
  ERC-20 with user balances must be added to `KNOWN_ERC20S`
  (`src/lib/snapshot/config.ts`); a forgotten token = total loss for its
  holders. Cross-check against Fumascan's token list.

- **Totals.** `tokenTotal` in each bundle is the exact amount the distributor
  must be funded with for that asset. Fund with at least that amount.

See [`contracts/migration/README.md`](../../contracts/migration/README.md) for
deploying and operating the claim contract.
