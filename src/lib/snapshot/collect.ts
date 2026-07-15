/**
 * Collector: turn config into raw per-asset balances by enumerating holders
 * from the explorer and (optionally) pinning their balances at a fixed block
 * over RPC.
 *
 * Network access is confined to this module (explorer + RPC). Everything it
 * returns feeds the pure builder in build.ts. Dependencies are injectable so
 * the pipeline can be exercised offline with fixtures.
 */

import type { PublicClient } from "viem";
import type { AssetBalances, AssetSpec, BalanceEntry } from "./types";
import type { SnapshotConfig } from "./config";
import { enumerateNativeHolders, enumerateTokenHolders, type ExplorerOptions } from "./explorer";
import { makeClient, resolveBlockNumber, pinNativeBalances, pinTokenBalances } from "./rpc";

export interface CollectDeps {
  /** Injectable explorer options (e.g. a mock fetch) for testing. */
  explorer?: ExplorerOptions;
  /** Pre-built RPC client (defaults to one built from cfg). */
  client?: PublicClient;
  /** Progress logger. */
  log?: (msg: string) => void;
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
 * Collect balances for a single asset. Enumerates holders from the explorer,
 * then either re-reads balances at `blockNumber` (pinning) or keeps the
 * explorer-reported values.
 */
export async function collectAsset(
  asset: AssetSpec,
  cfg: SnapshotConfig,
  blockNumber: bigint | null,
  deps: CollectDeps,
): Promise<AssetBalances> {
  const log = deps.log ?? (() => {});
  const blockLabel = blockNumber != null ? blockNumber.toString() : cfg.block;

  log(`[${asset.symbol}] enumerating holders...`);
  const enumerated =
    asset.kind === "native"
      ? await enumerateNativeHolders(cfg, deps.explorer)
      : await enumerateTokenHolders(cfg, asset.address!, deps.explorer);

  log(`[${asset.symbol}] ${enumerated.length} holders enumerated`);

  // Preserve is-contract metadata keyed by lowercased address.
  const meta = new Map<string, boolean>();
  for (const e of enumerated) meta.set(e.address.toLowerCase(), e.isContract ?? false);

  if (!cfg.pinBalancesAtBlock || blockNumber == null) {
    return { asset, chainId: cfg.chainId, block: blockLabel, entries: enumerated };
  }

  const client = deps.client ?? makeClient(cfg);
  const addresses = enumerated.map((e) => e.address);
  log(`[${asset.symbol}] pinning ${addresses.length} balances at block ${blockNumber}...`);

  const balances =
    asset.kind === "native"
      ? await pinNativeBalances(client, addresses, blockNumber, cfg)
      : await pinTokenBalances(client, asset.address!, addresses, blockNumber, cfg);

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

  if (cfg.pinBalancesAtBlock) {
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
