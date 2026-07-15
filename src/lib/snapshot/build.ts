/**
 * Pure snapshot-building logic: raw per-asset balances -> normalized balances,
 * Merkle claim bundles, and a manifest. No network or filesystem access here,
 * so it is fully unit-testable offline.
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
import type { SnapshotConfig } from "./config";

/**
 * Aggregate raw balance rows into a clean, deduplicated set:
 *  - sum duplicate addresses,
 *  - checksum addresses,
 *  - drop excluded addresses,
 *  - drop contracts unless includeContracts,
 *  - drop balances below minBalanceWei.
 *
 * Returns entries sorted by descending balance (stable, deterministic).
 */
export function normalizeBalances(
  raw: BalanceEntry[],
  cfg: Pick<SnapshotConfig, "minBalanceWei" | "includeContracts" | "excludedAddresses">,
): BalanceEntry[] {
  const merged = new Map<string, BalanceEntry>();

  for (const row of raw) {
    let account: Address;
    try {
      account = getAddress(row.address);
    } catch {
      // Skip malformed addresses rather than poison the whole run.
      continue;
    }
    const key = account.toLowerCase();
    const prev = merged.get(key);
    if (prev) {
      prev.balance += row.balance;
      // Any source marking it a contract wins.
      prev.isContract = prev.isContract || row.isContract;
    } else {
      merged.set(key, { address: account, balance: row.balance, isContract: row.isContract });
    }
  }

  const excludedLower = new Set(
    Array.from(cfg.excludedAddresses).map((a) => a.toLowerCase()),
  );

  const out: BalanceEntry[] = [];
  for (const entry of merged.values()) {
    if (excludedLower.has(entry.address.toLowerCase())) continue;
    if (!cfg.includeContracts && entry.isContract) continue;
    if (entry.balance < cfg.minBalanceWei) continue;
    out.push(entry);
  }

  out.sort((a, b) => {
    if (a.balance === b.balance) {
      return a.address.toLowerCase() < b.address.toLowerCase() ? -1 : 1;
    }
    return a.balance > b.balance ? -1 : 1;
  });
  return out;
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
}

export interface BuiltSnapshot {
  manifest: SnapshotManifest;
  assets: BuiltAsset[];
}

/**
 * Turn a collection of raw per-asset balances into a full snapshot: normalized
 * balances + claim bundles + manifest. `generatedAt` is passed in by callers
 * (scripts) because timestamps are impure.
 */
export function buildSnapshot(
  rawByAsset: AssetBalances[],
  cfg: SnapshotConfig,
  generatedAt?: string,
): BuiltSnapshot {
  const builtAssets: BuiltAsset[] = [];
  const manifestAssets: SnapshotManifest["assets"] = [];

  for (const raw of rawByAsset) {
    const normalized = normalizeBalances(raw.entries, cfg);
    const balances = serializeBalances(raw.asset, raw.chainId, raw.block, normalized);
    const bundle = buildClaimBundle(raw.asset, raw.chainId, raw.block, normalized);
    builtAssets.push({ balances, bundle });

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
  }

  const manifest: SnapshotManifest = {
    chainId: cfg.chainId,
    block: cfg.block,
    generatedAt,
    params: {
      minBalanceWei: cfg.minBalanceWei.toString(),
      includeContracts: cfg.includeContracts,
      excludedAddresses: Array.from(cfg.excludedAddresses),
    },
    assets: manifestAssets,
  };

  return { manifest, assets: builtAssets };
}
