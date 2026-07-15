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

import { createPublicClient, http, defineChain, getAddress, erc20Abi } from "viem";
import type { PublicClient } from "viem";
import type { Address } from "./types";
import type { SnapshotConfig } from "./config";

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
        out.set(chunk[j].toLowerCase(), r.status === "success" ? (r.result as bigint) : 0n);
      });
    }
    return out;
  }

  await mapWithConcurrency(addresses, cfg.requestConcurrency, async (addr) => {
    try {
      const bal = (await client.readContract({
        address: getAddress(token),
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [getAddress(addr)],
        blockNumber,
      })) as bigint;
      out.set(addr.toLowerCase(), bal);
    } catch {
      out.set(addr.toLowerCase(), 0n);
    }
  });
  return out;
}
