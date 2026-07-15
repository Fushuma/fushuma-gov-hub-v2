/**
 * RPC layer: pin balances to an exact block so the snapshot is deterministic
 * and independent of whatever "current" values the explorer reports.
 *
 * Native balances use `eth_getBalance(addr, block)`. ERC-20 balances use
 * `balanceOf(addr)` at the block — via a Multicall3 contract when one is
 * configured (SNAPSHOT_MULTICALL3), otherwise via individual `eth_call`s that
 * the viem HTTP transport batches into JSON-RPC batch requests.
 *
 * Reading historical balances requires an archive node. If the node only keeps
 * recent state, set SNAPSHOT_BLOCK to a recent block or disable pinning
 * (SNAPSHOT_PIN_AT_BLOCK=false) and trust the explorer's current values.
 */

import { createPublicClient, http, defineChain, getAddress, erc20Abi, parseAbiItem } from "viem";
import type { PublicClient } from "viem";
import type { Address, BalanceEntry } from "./types";
import type { SnapshotConfig } from "./config";

const TRANSFER_EVENT = parseAbiItem(
  "event Transfer(address indexed from, address indexed to, uint256 value)",
);

const env = (typeof process !== "undefined" ? process.env : {}) as Record<string, string | undefined>;

export function makeChain(cfg: SnapshotConfig) {
  return defineChain({
    id: cfg.chainId,
    name: "Fushuma",
    nativeCurrency: { name: "FUMA", symbol: "FUMA", decimals: 18 },
    rpcUrls: { default: { http: [cfg.rpcUrl] } },
  });
}

export function makeClient(cfg: SnapshotConfig): PublicClient {
  return createPublicClient({
    chain: makeChain(cfg),
    // batch: true coalesces concurrent eth_calls into JSON-RPC batch requests.
    transport: http(cfg.rpcUrl, { batch: true, retryCount: cfg.maxRetries }),
  });
}

/** Resolve a config block string to a concrete block number for consistency. */
export async function resolveBlockNumber(client: PublicClient, block: string): Promise<bigint> {
  if (block === "latest" || block === "") {
    return client.getBlockNumber();
  }
  if (block.startsWith("0x")) return BigInt(block);
  return BigInt(block);
}

/** Run async tasks with bounded concurrency, preserving input order. */
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  const workers = new Array(Math.max(1, Math.min(limit, items.length))).fill(0).map(async () => {
    while (true) {
      const i = cursor++;
      if (i >= items.length) return;
      results[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}

/** Read native FUMA balances for a set of addresses at a fixed block. */
export async function pinNativeBalances(
  client: PublicClient,
  addresses: Address[],
  blockNumber: bigint,
  cfg: SnapshotConfig,
): Promise<Map<string, bigint>> {
  const out = new Map<string, bigint>();
  await mapWithConcurrency(addresses, cfg.requestConcurrency, async (addr) => {
    const bal = await client.getBalance({ address: getAddress(addr), blockNumber });
    out.set(addr.toLowerCase(), bal);
  });
  return out;
}

/** Read ERC-20 balances for a set of addresses at a fixed block. */
export async function pinTokenBalances(
  client: PublicClient,
  token: Address,
  addresses: Address[],
  blockNumber: bigint,
  cfg: SnapshotConfig,
): Promise<Map<string, bigint>> {
  const out = new Map<string, bigint>();
  const multicall3 = env.SNAPSHOT_MULTICALL3 as Address | undefined;

  if (multicall3) {
    const BATCH = 500;
    for (let i = 0; i < addresses.length; i += BATCH) {
      const chunk = addresses.slice(i, i + BATCH);
      const res = await client.multicall({
        multicallAddress: multicall3,
        allowFailure: true,
        blockNumber,
        contracts: chunk.map((addr) => ({
          address: getAddress(token),
          abi: erc20Abi,
          functionName: "balanceOf" as const,
          args: [getAddress(addr)],
        })),
      });
      res.forEach((r, j) => {
        // A failed balanceOf is NOT "balance is zero" — it signals a real
        // problem (bad node response, wrong token). Surface it loudly rather
        // than silently zeroing a holder out of the airdrop.
        if (r.status !== "success") {
          throw new Error(
            `balanceOf(${chunk[j]}) failed at block ${blockNumber} for token ${token}: ${String(r.error)}`,
          );
        }
        out.set(chunk[j].toLowerCase(), r.result as bigint);
      });
    }
    return out;
  }

  // viem's http transport already retries transient transport errors; if a read
  // still throws here it is persistent, so let it abort the run rather than
  // recording a false zero balance.
  await mapWithConcurrency(addresses, cfg.requestConcurrency, async (addr) => {
    const bal = (await client.readContract({
      address: getAddress(token),
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [getAddress(addr)],
      blockNumber,
    })) as bigint;
    out.set(addr.toLowerCase(), bal);
  });
  return out;
}

/**
 * Extract every distinct non-zero holder address from a batch of ERC-20
 * Transfer logs. Pure and testable. Returns lowercased addresses.
 */
export function extractHolderAddresses(
  logs: Array<{ args?: { from?: string; to?: string } }>,
): Set<string> {
  const set = new Set<string>();
  for (const log of logs) {
    const from = log.args?.from;
    const to = log.args?.to;
    if (from && from !== "0x0000000000000000000000000000000000000000") set.add(from.toLowerCase());
    if (to && to !== "0x0000000000000000000000000000000000000000") set.add(to.toLowerCase());
  }
  return set;
}

/**
 * Enumerate the complete historical holder SET of an ERC-20 by replaying its
 * Transfer events from `deployBlock` to `toBlock` in chunks. Balances are NOT
 * read here — the caller pins them at the block. This is the correct source
 * for a historical snapshot (it captures addresses that later went to zero),
 * unlike the explorer's current-holders list.
 */
export async function enumerateTokenHoldersFromLogs(
  client: PublicClient,
  token: Address,
  toBlock: bigint,
  cfg: SnapshotConfig,
  log: (msg: string) => void = () => {},
): Promise<BalanceEntry[]> {
  const holders = new Set<string>();
  const start = cfg.deployBlock;
  const chunk = cfg.logChunkSize > 0n ? cfg.logChunkSize : 50000n;

  for (let from = start; from <= toBlock; from += chunk) {
    const to = from + chunk - 1n > toBlock ? toBlock : from + chunk - 1n;
    const logs = await client.getLogs({
      address: getAddress(token),
      event: TRANSFER_EVENT,
      fromBlock: from,
      toBlock: to,
    });
    for (const a of extractHolderAddresses(logs as Array<{ args?: { from?: string; to?: string } }>)) {
      holders.add(a);
    }
    log(`  [logs ${token}] scanned ${from}-${to}, ${holders.size} unique holders so far`);
  }

  return Array.from(holders).map((address) => ({ address: address as Address, balance: 0n }));
}

/**
 * Detect which addresses are contracts at a block (has non-empty bytecode).
 * Used with the log source, where the explorer's is_contract flag is absent,
 * so contract-exclusion still works.
 */
export async function detectContracts(
  client: PublicClient,
  addresses: Address[],
  blockNumber: bigint,
  cfg: SnapshotConfig,
): Promise<Map<string, boolean>> {
  const out = new Map<string, boolean>();
  await mapWithConcurrency(addresses, cfg.requestConcurrency, async (addr) => {
    const code = await client.getCode({ address: getAddress(addr), blockNumber });
    out.set(addr.toLowerCase(), !!code && code !== "0x");
  });
  return out;
}
