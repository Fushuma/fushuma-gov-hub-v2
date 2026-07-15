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
manifest.json              # chainId, block, params, and per-asset {root, numClaims, tokenTotal}
balances/<SYMBOL>.json     # normalized, deduped holder balances (audit trail)
claims/<SYMBOL>.json       # merkleRoot + { address -> { amount, proof } } for on-chain claiming
```

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

# Include contract-held balances in the trees (default: excluded, only EOAs)
pnpm snapshot:build -- --block 1234567 --include-contracts

# Drop dust below a threshold (base units), e.g. < 0.001 FUMA
pnpm snapshot:build -- --block 1234567 --min-balance 1000000000000000
```

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
| `SNAPSHOT_INCLUDE_CONTRACTS` | `false` | Include contract balances |
| `SNAPSHOT_PIN_AT_BLOCK` | `true` | Re-read balances at block over RPC |
| `SNAPSHOT_MULTICALL3` | _(none)_ | Multicall3 address to batch ERC-20 reads |
| `SNAPSHOT_CONCURRENCY` | `8` | Parallel RPC requests |
| `SNAPSHOT_MAX_RETRIES` | `5` | Retries per explorer/RPC request |

Assets default to native FUMA plus the deployed WFUMA/USDC/USDT tokens
(`docs/DEPLOYED_CONTRACTS.md`). Add more tokens by editing `KNOWN_ERC20S` in
`src/lib/snapshot/config.ts`.

## Methodology & caveats

- **Enumerate then pin.** The explorer is trusted only to discover the *set* of
  holders. Actual claimable amounts are re-read at the exact block over RPC, so
  the result is deterministic and independent of the explorer's live values
  (disable with `--no-pin`).
- **WFUMA vs FUMA.** Wrapped FUMA (WFUMA) is snapshotted as an ERC-20 in its own
  tree. If the migration credits WFUMA holders in native FUMA instead, merge the
  WFUMA balances into the native tree before building (or drop the native
  balance held by the WFUMA contract to avoid double-counting). Decide the
  policy explicitly.
- **Contracts.** DEX pools, the bridge, launchpad, and vesting contracts hold
  large balances that are protocol-owned, not user-owned. They are excluded by
  default and flagged in `balances/*.json` (`isContract: true`). Re-seed them on
  the new chain deliberately rather than airdropping to the old addresses.
- **Totals.** `tokenTotal` in each bundle is the exact amount the distributor
  must be funded with for that asset. Fund with at least that amount.

See [`contracts/migration/README.md`](../../contracts/migration/README.md) for
deploying and operating the claim contract.
