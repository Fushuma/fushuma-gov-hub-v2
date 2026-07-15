/**
 * Collector: turn config into raw per-asset balances by enumerating holders
 * and (optionally) pinning their balances at a fixed block over RPC.
 *
 * Network access is confined to this module (explorer + RPC). Everything it
 * returns feeds the pure builder in build.ts. Dependencies are injectable so
 * the pipeline can be exercised offline with fixtures.
 *
 * Holder enumeration for ERC-20s has two sources (cfg.tokenHolderSource):
 *   - "explorer": fast, but the explorer lists CURRENT holders, so addresses
 *     that went to zero after the snapshot block are missed.
 *   - "logs": replays Transfer events up to the block for a historically
 *     complete set. Correct for a historical snapshot; requires an archive RPC.
 * Native FUMA can only be enumerated from the explorer (no Transfer logs), so a
 * historical native snapshot is most accurate taken at (or near) chain head.
 */

import type { PublicClient } from "viem";
import type { AssetBalances, AssetSpec, BalanceEntry } from "./types";
import type { SnapshotConfig } from "./config";
import { enumerateNativeHolders, enumerateTokenHolders, type ExplorerOptions } from "./explorer";
import {
  makeClient,
  resolveBlockNumber,
  pinNativeBalances,
  pinTokenBalances,
  enumerateTokenHoldersFromLogs,
  detectContracts,
} from "./rpc";

export interface CollectDeps {
  /** Injectable explorer options (e.g. a mock fetch) for testing. */
  explorer?: ExplorerOptions;
  /** Pre-built RPC client (defaults to one built from cfg). */
  client?: PublicClient;
  /** Progress logger. */
  log?: (msg: string) => void;
  /**
   * Supplemental holder addresses to union into every asset's candidate set
   * before pinning (e.g. addresses recovered from an archive/log replay that
   * the explorer's current list misses). Balances are read at the block; those
   * that resolve to below the dust threshold are dropped as usual.
   */
  extraHolders?: `0x${string}`[];
}

function toEntries(map: Map<string, bigint>, meta: Map<string, boolean>): BalanceEntry[] {
  const out: BalanceEntry[] = [];
  for (const [addr, balance] of map.entries()) {
    out.push({
      address: addr as `0x${string}`,
      balance,
      isContract: meta.get(addr) ?? false,
    });
  }
  return out;
}

/**
 * Collect balances for a single asset. Enumerates holders, then either re-reads
 * balances at `blockNumber` (pinning) or keeps the explorer-reported values.
 */
export async function collectAsset(
  asset: AssetSpec,
  cfg: SnapshotConfig,
  blockNumber: bigint | null,
  deps: CollectDeps,
): Promise<AssetBalances> {
  const log = deps.log ?? (() => {});
  const blockLabel = blockNumber != null ? blockNumber.toString() : cfg.block;
  const useLogs = asset.kind === "erc20" && cfg.tokenHolderSource === "logs";

  if (useLogs && (blockNumber == null || !cfg.pinBalancesAtBlock)) {
    throw new Error(
      `tokenHolderSource="logs" requires pinning at a concrete block; enable pinBalancesAtBlock and set a block`,
    );
  }

  // Warn when the address set is taken from the explorer's CURRENT holders but
  // balances are pinned to a past block: anyone who exited after the block is
  // silently missing. See H2 in scripts/snapshot/README.md.
  if (
    !useLogs &&
    cfg.pinBalancesAtBlock &&
    blockNumber != null &&
    cfg.block !== "latest"
  ) {
    log(
      `[${asset.symbol}] WARNING: enumerating current holders but pinning at block ${blockNumber}. ` +
        `Holders who moved funds to zero after this block will be omitted. ` +
        (asset.kind === "erc20"
          ? `Set tokenHolderSource="logs" for a historically-complete set.`
          : `Take the native snapshot at/near chain head, or supply an explicit holder list.`),
    );
  }

  log(`[${asset.symbol}] enumerating holders (${useLogs ? "logs" : "explorer"})...`);
  const client = deps.client ?? (cfg.pinBalancesAtBlock || useLogs ? makeClient(cfg) : undefined);

  let enumerated: BalanceEntry[];
  if (useLogs) {
    enumerated = await enumerateTokenHoldersFromLogs(client!, asset.address!, blockNumber!, cfg, log);
  } else if (asset.kind === "native") {
    enumerated = await enumerateNativeHolders(cfg, deps.explorer);
  } else {
    enumerated = await enumerateTokenHolders(cfg, asset.address!, deps.explorer);
  }
  // Union in any supplemental holders not already enumerated.
  if (deps.extraHolders?.length) {
    const present = new Set(enumerated.map((e) => e.address.toLowerCase()));
    let added = 0;
    for (const addr of deps.extraHolders) {
      if (!present.has(addr.toLowerCase())) {
        enumerated.push({ address: addr, balance: 0n });
        present.add(addr.toLowerCase());
        added += 1;
      }
    }
    if (added) log(`[${asset.symbol}] +${added} supplemental holder(s)`);
  }
  log(`[${asset.symbol}] ${enumerated.length} holders enumerated`);

  // Preserve is-contract metadata keyed by lowercased address.
  const meta = new Map<string, boolean>();
  for (const e of enumerated) meta.set(e.address.toLowerCase(), e.isContract ?? false);

  if (!cfg.pinBalancesAtBlock || blockNumber == null) {
    return { asset, chainId: cfg.chainId, block: blockLabel, entries: enumerated };
  }

  const addresses = enumerated.map((e) => e.address);
  log(`[${asset.symbol}] pinning ${addresses.length} balances at block ${blockNumber}...`);

  // The log source has no is_contract flag; detect contracts on-chain so
  // contract-exclusion still works.
  if (useLogs && !cfg.includeContracts) {
    const detected = await detectContracts(client!, addresses, blockNumber, cfg);
    for (const [k, v] of detected.entries()) meta.set(k, v);
  }

  const balances =
    asset.kind === "native"
      ? await pinNativeBalances(client!, addresses, blockNumber, cfg)
      : await pinTokenBalances(client!, asset.address!, addresses, blockNumber, cfg);

  return {
    asset,
    chainId: cfg.chainId,
    block: blockLabel,
    entries: toEntries(balances, meta),
  };
}

/** Collect balances for every configured asset. */
export async function collectAll(cfg: SnapshotConfig, deps: CollectDeps = {}): Promise<{
  block: string;
  rawByAsset: AssetBalances[];
}> {
  const log = deps.log ?? (() => {});
  let blockNumber: bigint | null = null;

  const needsClient = cfg.pinBalancesAtBlock || cfg.tokenHolderSource === "logs";
  if (needsClient) {
    const client = deps.client ?? makeClient(cfg);
    deps.client = client;
    blockNumber = await resolveBlockNumber(client, cfg.block);
    log(`Pinning all balances at block ${blockNumber}`);
  }

  const rawByAsset: AssetBalances[] = [];
  for (const asset of cfg.assets) {
    rawByAsset.push(await collectAsset(asset, cfg, blockNumber, deps));
  }

  return { block: blockNumber != null ? blockNumber.toString() : cfg.block, rawByAsset };
}
