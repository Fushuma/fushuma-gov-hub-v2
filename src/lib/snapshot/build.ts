/**
 * Pure snapshot-building logic: raw per-asset balances -> normalized balances,
 * Merkle claim bundles, an excluded-balances report, and a manifest. No network
 * or filesystem access here, so it is fully unit-testable offline.
 *
 * Nothing is dropped silently: every address removed from the airdrop (burn
 * address, system/protocol contract, other contract, or dust) is recorded in
 * the excluded report with a reason and its balance, so the migration team can
 * see exactly what was left out (e.g. FUMA locked in VotingEscrow / veFUMA, or
 * LP funds in the pool managers) and attribute it deliberately.
 */

import { getAddress } from "viem";
import type {
  Address,
  AssetBalances,
  AssetBalancesJSON,
  AssetClaimBundle,
  AssetSpec,
  BalanceEntry,
  Claim,
  SnapshotManifest,
} from "./types";
import { buildMerkle, LEAF_ENCODING, type MerkleEntry } from "./merkle";
import { BURN_ADDRESSES, SYSTEM_CONTRACTS, type SnapshotConfig } from "./config";

export type ExclusionReason = "burn" | "system-contract" | "contract" | "dust";

export interface ExcludedEntry {
  address: Address;
  balance: string;
  reason: ExclusionReason;
  /** For system contracts, the human name (e.g. "VotingEscrow"). */
  label?: string;
}

export interface AssetExcludedJSON {
  asset: AssetSpec;
  chainId: number;
  block: string;
  count: number;
  totalExcluded: string;
  byReason: Record<string, { count: number; total: string }>;
  entries: ExcludedEntry[];
}

const burnSet = new Set(BURN_ADDRESSES.map((a) => a.toLowerCase()));
const systemNameByAddress = new Map<string, string>(
  Object.entries(SYSTEM_CONTRACTS).map(([name, addr]) => [addr.toLowerCase(), name]),
);

export interface PartitionResult {
  kept: BalanceEntry[];
  excluded: ExcludedEntry[];
}

/**
 * Split raw balance rows into kept (airdropped) and excluded, aggregating
 * duplicate addresses and checksumming. Kept entries are sorted by descending
 * balance; excluded entries by descending balance too.
 */
export function partitionBalances(
  raw: BalanceEntry[],
  cfg: Pick<SnapshotConfig, "minBalanceWei" | "includeContracts" | "excludedAddresses">,
): PartitionResult {
  const merged = new Map<string, BalanceEntry>();
  for (const row of raw) {
    let account: Address;
    try {
      account = getAddress(row.address);
    } catch {
      continue; // skip malformed addresses
    }
    const key = account.toLowerCase();
    const prev = merged.get(key);
    if (prev) {
      prev.balance += row.balance;
      prev.isContract = prev.isContract || row.isContract;
    } else {
      merged.set(key, { address: account, balance: row.balance, isContract: row.isContract });
    }
  }

  const excludedLower = new Set(
    Array.from(cfg.excludedAddresses).map((a) => a.toLowerCase()),
  );

  const kept: BalanceEntry[] = [];
  const excluded: ExcludedEntry[] = [];

  for (const entry of merged.values()) {
    const lower = entry.address.toLowerCase();
    if (excludedLower.has(lower)) {
      const label = systemNameByAddress.get(lower);
      excluded.push({
        address: entry.address,
        balance: entry.balance.toString(),
        reason: burnSet.has(lower) ? "burn" : "system-contract",
        ...(label ? { label } : {}),
      });
      continue;
    }
    if (!cfg.includeContracts && entry.isContract) {
      excluded.push({ address: entry.address, balance: entry.balance.toString(), reason: "contract" });
      continue;
    }
    if (entry.balance < cfg.minBalanceWei) {
      excluded.push({ address: entry.address, balance: entry.balance.toString(), reason: "dust" });
      continue;
    }
    kept.push(entry);
  }

  const byBalanceDesc = (a: { balance: bigint | string }, b: { balance: bigint | string }) => {
    const ab = BigInt(a.balance);
    const bb = BigInt(b.balance);
    return ab === bb ? 0 : ab > bb ? -1 : 1;
  };
  kept.sort((a, b) => {
    if (a.balance === b.balance) return a.address.toLowerCase() < b.address.toLowerCase() ? -1 : 1;
    return a.balance > b.balance ? -1 : 1;
  });
  excluded.sort(byBalanceDesc);

  return { kept, excluded };
}

/**
 * Aggregate raw balance rows into a clean, deduplicated, airdrop-eligible set.
 * Thin wrapper over partitionBalances kept for callers that only want the kept
 * entries.
 */
export function normalizeBalances(
  raw: BalanceEntry[],
  cfg: Pick<SnapshotConfig, "minBalanceWei" | "includeContracts" | "excludedAddresses">,
): BalanceEntry[] {
  return partitionBalances(raw, cfg).kept;
}

/** Serialize a normalized balance set to the on-disk JSON shape. */
export function serializeBalances(
  asset: AssetSpec,
  chainId: number,
  block: string,
  entries: BalanceEntry[],
): AssetBalancesJSON {
  const total = entries.reduce((acc, e) => acc + e.balance, 0n);
  return {
    asset,
    chainId,
    block,
    count: entries.length,
    totalBalance: total.toString(),
    entries: entries.map((e) => ({
      address: e.address,
      balance: e.balance.toString(),
      ...(e.isContract ? { isContract: true } : {}),
    })),
  };
}

/** Serialize the excluded set for an asset, summarized by reason. */
export function serializeExcluded(
  asset: AssetSpec,
  chainId: number,
  block: string,
  excluded: ExcludedEntry[],
): AssetExcludedJSON {
  const byReason: Record<string, { count: number; total: string }> = {};
  let total = 0n;
  for (const e of excluded) {
    total += BigInt(e.balance);
    const r = byReason[e.reason] ?? { count: 0, total: "0" };
    r.count += 1;
    r.total = (BigInt(r.total) + BigInt(e.balance)).toString();
    byReason[e.reason] = r;
  }
  return {
    asset,
    chainId,
    block,
    count: excluded.length,
    totalExcluded: total.toString(),
    byReason,
    entries: excluded,
  };
}

/**
 * Build the Merkle claim bundle for one asset from its normalized balances.
 * Returns `null` if there is nothing to claim (no eligible holders).
 */
export function buildClaimBundle(
  asset: AssetSpec,
  chainId: number,
  block: string,
  entries: BalanceEntry[],
): AssetClaimBundle | null {
  const merkleEntries: MerkleEntry[] = entries
    .filter((e) => e.balance > 0n)
    .map((e) => ({ account: e.address, amount: e.balance }));

  if (merkleEntries.length === 0) return null;

  const { root, claims } = buildMerkle(merkleEntries);

  const claimsOut: Record<Address, Claim> = {};
  let tokenTotal = 0n;
  for (const [account, { amount, proof }] of Object.entries(claims)) {
    claimsOut[account as Address] = { amount: amount.toString(), proof };
    tokenTotal += amount;
  }

  return {
    asset,
    chainId,
    block,
    merkleRoot: root,
    leafEncoding: LEAF_ENCODING,
    numClaims: merkleEntries.length,
    tokenTotal: tokenTotal.toString(),
    claims: claimsOut,
  };
}

export interface BuiltAsset {
  balances: AssetBalancesJSON;
  bundle: AssetClaimBundle | null;
  excluded: AssetExcludedJSON;
}

export interface BuiltSnapshot {
  manifest: SnapshotManifest;
  assets: BuiltAsset[];
}

/**
 * Turn a collection of raw per-asset balances into a full snapshot: normalized
 * balances + claim bundles + excluded report + manifest. `generatedAt` is
 * passed in by callers (scripts) because timestamps are impure.
 */
export function buildSnapshot(
  rawByAsset: AssetBalances[],
  cfg: SnapshotConfig,
  generatedAt?: string,
): BuiltSnapshot {
  const builtAssets: BuiltAsset[] = [];
  const manifestAssets: SnapshotManifest["assets"] = [];
  const manifestExcluded: SnapshotManifest["excluded"] = [];

  for (const raw of rawByAsset) {
    const { kept, excluded } = partitionBalances(raw.entries, cfg);
    const balances = serializeBalances(raw.asset, raw.chainId, raw.block, kept);
    const excludedJson = serializeExcluded(raw.asset, raw.chainId, raw.block, excluded);
    const bundle = buildClaimBundle(raw.asset, raw.chainId, raw.block, kept);
    builtAssets.push({ balances, bundle, excluded: excludedJson });

    if (bundle) {
      manifestAssets.push({
        symbol: raw.asset.symbol,
        kind: raw.asset.kind,
        address: raw.asset.address,
        decimals: raw.asset.decimals,
        merkleRoot: bundle.merkleRoot,
        numClaims: bundle.numClaims,
        tokenTotal: bundle.tokenTotal,
      });
    }
    if (excluded.length > 0) {
      manifestExcluded.push({
        symbol: raw.asset.symbol,
        excludedCount: excludedJson.count,
        totalExcluded: excludedJson.totalExcluded,
        byReason: excludedJson.byReason,
      });
    }
  }

  const manifest: SnapshotManifest = {
    chainId: cfg.chainId,
    block: cfg.block,
    generatedAt,
    params: {
      minBalanceWei: cfg.minBalanceWei.toString(),
      includeContracts: cfg.includeContracts,
      pinnedAtBlock: cfg.pinBalancesAtBlock,
      tokenHolderSource: cfg.tokenHolderSource,
      excludedAddresses: Array.from(cfg.excludedAddresses),
    },
    assets: manifestAssets,
    excluded: manifestExcluded,
  };

  return { manifest, assets: builtAssets };
}
