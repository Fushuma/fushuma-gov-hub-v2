/**
 * Shared types for the Fushuma chain-migration snapshot toolkit.
 *
 * The snapshot captures native FUMA balances and ERC-20 holder balances at a
 * fixed block, then emits a Merkle airdrop-claim bundle that a distributor
 * contract on the new chain can verify.
 *
 * On-disk formats use decimal strings for token amounts because JSON cannot
 * represent `bigint`. All in-memory math uses `bigint`.
 */

export type Address = `0x${string}`;
export type Hex = `0x${string}`;

/** Sentinel used for the native asset (FUMA) in configs and outputs. */
export const NATIVE_SENTINEL: Address = "0x0000000000000000000000000000000000000000";

export type AssetKind = "native" | "erc20";

/** Describes one asset to snapshot. */
export interface AssetSpec {
  kind: AssetKind;
  /** Human symbol, e.g. "FUMA", "USDC". Used for output filenames. */
  symbol: string;
  /** Token decimals (18 for native FUMA). Informational only. */
  decimals: number;
  /**
   * ERC-20 contract address. Omitted / zero-address for native FUMA.
   * Lower-cased for map keys; checksummed on output.
   */
  address?: Address;
}

/** A single (holder, balance) row, in-memory. */
export interface BalanceEntry {
  address: Address;
  balance: bigint;
  /** Whether the holder address is a contract (from the explorer, if known). */
  isContract?: boolean;
}

/** Serialized balance row (balance as decimal string). */
export interface BalanceEntryJSON {
  address: Address;
  balance: string;
  isContract?: boolean;
}

/** Raw per-asset balance set, before Merkle construction. */
export interface AssetBalances {
  asset: AssetSpec;
  chainId: number;
  /** Block the balances were pinned to (or "latest" if not pinned). */
  block: string;
  entries: BalanceEntry[];
}

export interface AssetBalancesJSON {
  asset: AssetSpec;
  chainId: number;
  block: string;
  count: number;
  totalBalance: string;
  entries: BalanceEntryJSON[];
}

/** One holder's claim: the amount they can claim and the Merkle proof. */
export interface Claim {
  amount: string; // decimal string
  proof: Hex[];
}

/** The Merkle claim bundle for a single asset. */
export interface AssetClaimBundle {
  asset: AssetSpec;
  chainId: number;
  block: string;
  merkleRoot: Hex;
  /** ABI types of the leaf tuple, for auditors: ["address","uint256"]. */
  leafEncoding: readonly string[];
  numClaims: number;
  /** Sum of all claimable amounts — the exact amount the distributor must hold. */
  tokenTotal: string;
  /** address (checksummed) -> claim */
  claims: Record<Address, Claim>;
}

/** Top-level manifest tying every asset bundle together. */
export interface SnapshotManifest {
  chainId: number;
  block: string;
  /** ISO timestamp, injected by the caller (scripts) — not generated here. */
  generatedAt?: string;
  /** Config knobs that affect the result, recorded for reproducibility. */
  params: {
    minBalanceWei: string;
    includeContracts: boolean;
    /** Whether balances were re-read at `block` over RPC (vs explorer-current). */
    pinnedAtBlock: boolean;
    /** How ERC-20 holders were enumerated. */
    tokenHolderSource: "explorer" | "logs";
    excludedAddresses: Address[];
  };
  assets: Array<{
    symbol: string;
    kind: AssetKind;
    address?: Address;
    decimals: number;
    merkleRoot: Hex;
    numClaims: number;
    tokenTotal: string;
  }>;
  /** Per-asset summary of everything left out of the airdrop (never silent). */
  excluded: Array<{
    symbol: string;
    excludedCount: number;
    totalExcluded: string;
    byReason: Record<string, { count: number; total: string }>;
  }>;
}
