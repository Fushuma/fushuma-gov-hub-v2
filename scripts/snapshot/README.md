# Snapshot tooling

Exports the Fushuma network state at a frozen block, for a hard fork.

**Start with [`docs/HARDFORK_SNAPSHOT_RUNBOOK.md`](../../docs/HARDFORK_SNAPSHOT_RUNBOOK.md)** —
it covers the procedure, node requirements and timeline. This file is the tool
reference.

## Commands

```bash
pnpm snapshot:preflight -- --rpc <url>      # can this node produce a snapshot?
pnpm snapshot -- --rpc <url> --block <N>    # the export
pnpm snapshot:verify -- --dir <dir>         # re-check a produced snapshot
pnpm snapshot:genesis -- --dir <dir>        # build a genesis alloc (re-launch only)
```

## Layout

```
lib/
  config.ts     CLI flags, env, output paths
  rpc.ts        batching JSON-RPC client: retries, backoff, adaptive batch size
  abi.ts        batched contract reads; reverts returned, not thrown
  out.ts        NDJSON streaming with SHA-256, progress reporting
  registry.ts   which contracts and tokens are covered
steps/
  pin.ts        freeze-block selection and reorg detection
  state-dump.ts debug_accountRange + debug_storageRangeAt
  discover.ts   address discovery by block/log replay (fallback path)
  accounts.ts   native FUMA balances + Merkle commitment
  tokens.ts     ERC-20 holder sets, replayed and verified on chain
  protocol.ts   governance, gauges, grants, launchpad
  manifest.ts   file hashes rolled into one snapshot hash
```

Pure, unit-tested logic lives in [`src/lib/snapshot/`](../../src/lib/snapshot):
Merkle tree, balance ledger, hex and range helpers. Run `pnpm test` to exercise
them.

## Design notes

**Everything reads at one block.** Reads are addressed by block hash where the
node supports EIP-1898, and the freeze block hash is re-checked at the end. A
reorg mid-export aborts the run rather than producing a snapshot that mixes two
chains.

**Two geth footguns are handled in `state-dump.ts`.** `debug_accountRange(N)`
returns state *after* block N; `debug_storageRangeAt(N, 0)` returns state
*before* block N's first transaction. Storage is therefore read at `N+1` with
`txIndex 0`. Separately, both APIs return hashed keys unless the node kept
preimages — missing preimages are counted and reported, never silently
exported as if complete.

**Replayed balances are always checked against the chain.** Token holder sets
are rebuilt from `Transfer` logs, then validated three ways: replayed supply vs
`totalSupply()`, sum of balances vs replayed supply, and `balanceOf()` re-read
at the freeze block. A token that fails any of them is marked unverified.

**Reverts are data.** Enumerating veNFT ids hits burned tokens; enumerating
proposals hits unset slots. The RPC layer returns per-call errors instead of
throwing, so one revert cannot end a multi-hour export.

**Output is deterministic.** Addresses are lowercased, holders sorted, Merkle
leaves sorted and de-duplicated. Two independent runs against the same chain
state produce the same `snapshotHash` — which is what makes third-party
verification meaningful.

## Environment

| Variable | Purpose |
|---|---|
| `SNAPSHOT_RPC_URL` | Default RPC endpoint (`--rpc` overrides) |
| `SNAPSHOT_OUT_DIR` | Default output directory (`--out` overrides) |
| `SNAPSHOT_RPC_HEADERS` | Auth headers, `"Key: value"` comma-separated. Kept out of CLI args and the manifest so credentials do not leak into shell history or published artifacts. |

Falls back to `NEXT_PUBLIC_FUSHUMA_RPC_URL` and `NEXT_PUBLIC_FUSHUMA_CHAIN_ID`.

## Adding a contract or token

Edit `lib/registry.ts`. Governance addresses are imported from
`src/lib/governance/contracts.ts`, so a redeployment there is picked up
automatically. DeFi, launchpad and bridge addresses mirror
`docs/DEPLOYED_CONTRACTS.md`.

To export a new contract's domain state, add a section function in
`steps/protocol.ts` — each one enumerates from an on-chain counter and checks
its total against whatever aggregate the contract exposes.

## Memory

The state dump and the exports stream to disk, so a large chain does not need a
large heap. The Merkle build holds leaves in memory. For a very large account
set:

```bash
NODE_OPTIONS=--max-old-space-size=8192 pnpm snapshot -- --block <N>
```
