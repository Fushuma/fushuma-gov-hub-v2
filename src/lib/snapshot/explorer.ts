/**
 * Blockscout (Fumascan) explorer client used to *enumerate the set of holders*.
 *
 * The explorer is the practical way to discover every address that has ever
 * held FUMA or a given token. We only trust it for the address SET — actual
 * claimable balances are re-read at the snapshot block over RPC (see rpc.ts),
 * unless `pinBalancesAtBlock` is disabled.
 *
 * Fumascan runs Blockscout, which exposes a v2 REST API:
 *   GET /api/v2/addresses                    -> paginated native-coin holders
 *   GET /api/v2/tokens/{hash}/holders        -> paginated token holders
 * Pagination is driven by the `next_page_params` object echoed back on each
 * page. `fetchImpl` is injectable so the collector can be tested offline.
 */

import type { Address, BalanceEntry } from "./types";
import type { SnapshotConfig } from "./config";

type FetchLike = (url: string, init?: { headers?: Record<string, string> }) => Promise<{
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
  text: () => Promise<string>;
}>;

export interface ExplorerOptions {
  fetchImpl?: FetchLike;
  /** Called after each page is fetched, for progress reporting. */
  onProgress?: (info: { kind: string; fetched: number }) => void;
  /** Hard cap on pages (safety valve). 0 = unlimited. */
  maxPages?: number;
}

interface V2AddressItem {
  hash: string;
  coin_balance: string | null;
  is_contract?: boolean;
}

interface V2TokenHolderItem {
  address: { hash: string; is_contract?: boolean };
  value: string;
}

interface V2Page<T> {
  items: T[];
  next_page_params: Record<string, string | number> | null;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function defaultFetch(): FetchLike {
  if (typeof fetch === "undefined") {
    throw new Error("global fetch is unavailable; pass fetchImpl to the explorer client");
  }
  return fetch as unknown as FetchLike;
}

function buildQuery(params: Record<string, string | number | undefined>): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  }
  return parts.length ? `?${parts.join("&")}` : "";
}

async function fetchJsonWithRetry<T>(
  url: string,
  cfg: SnapshotConfig,
  fetchImpl: FetchLike,
): Promise<T> {
  const headers: Record<string, string> = { accept: "application/json" };
  let lastErr: unknown;
  for (let attempt = 0; attempt <= cfg.maxRetries; attempt++) {
    try {
      const res = await fetchImpl(url, { headers });
      if (res.status === 429 || res.status >= 500) {
        throw new Error(`explorer HTTP ${res.status}`);
      }
      if (!res.ok) {
        throw new Error(`explorer HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
      }
      return (await res.json()) as T;
    } catch (err) {
      lastErr = err;
      if (attempt < cfg.maxRetries) {
        await sleep(Math.min(1000 * 2 ** attempt, 16000));
      }
    }
  }
  throw new Error(`explorer request failed after ${cfg.maxRetries + 1} attempts: ${String(lastErr)}`);
}

/**
 * Walk a Blockscout v2 paginated endpoint, yielding all items.
 */
async function paginate<T>(
  baseUrl: string,
  cfg: SnapshotConfig,
  fetchImpl: FetchLike,
  opts: ExplorerOptions,
  kind: string,
): Promise<T[]> {
  const items: T[] = [];
  let next: Record<string, string | number> | null | undefined = undefined;
  let page = 0;
  const apiKeyParam = cfg.explorerApiKey ? { apikey: cfg.explorerApiKey } : {};
  const seenCursors = new Set<string>();

  do {
    const query = buildQuery({ ...(next ?? {}), ...apiKeyParam });
    const url = `${baseUrl}${query}`;
    const data = await fetchJsonWithRetry<V2Page<T>>(url, cfg, fetchImpl);
    if (Array.isArray(data.items)) {
      items.push(...data.items);
    }
    next = data.next_page_params ?? null;
    page += 1;
    opts.onProgress?.({ kind, fetched: items.length });
    if (opts.maxPages && page >= opts.maxPages) break;

    // Guard against a misbehaving API that returns a repeating (or empty)
    // cursor forever: stop if we've seen this exact cursor before, or if a
    // non-null cursor advanced with an empty page.
    if (next) {
      const cursorKey = JSON.stringify(next);
      if (seenCursors.has(cursorKey)) {
        throw new Error(`explorer pagination stalled: repeated cursor for ${kind}`);
      }
      seenCursors.add(cursorKey);
    }
  } while (next);

  return items;
}

/** Enumerate every address holding native FUMA (address + reported balance). */
export async function enumerateNativeHolders(
  cfg: SnapshotConfig,
  opts: ExplorerOptions = {},
): Promise<BalanceEntry[]> {
  const fetchImpl = opts.fetchImpl ?? defaultFetch();
  const base = `${cfg.explorerApiUrl.replace(/\/$/, "")}/api/v2/addresses`;
  const items = await paginate<V2AddressItem>(base, cfg, fetchImpl, opts, "native-holders");
  return items
    .filter((it) => it.coin_balance != null && it.coin_balance !== "0")
    .map((it) => ({
      address: it.hash as Address,
      balance: BigInt(it.coin_balance as string),
      isContract: it.is_contract === true,
    }));
}

/** Enumerate every holder of an ERC-20 token (address + reported balance). */
export async function enumerateTokenHolders(
  cfg: SnapshotConfig,
  token: Address,
  opts: ExplorerOptions = {},
): Promise<BalanceEntry[]> {
  const fetchImpl = opts.fetchImpl ?? defaultFetch();
  const base = `${cfg.explorerApiUrl.replace(/\/$/, "")}/api/v2/tokens/${token}/holders`;
  const items = await paginate<V2TokenHolderItem>(base, cfg, fetchImpl, opts, `token-holders:${token}`);
  return items
    .filter((it) => it.value != null && it.value !== "0" && it.address?.hash)
    .map((it) => ({
      address: it.address.hash as Address,
      balance: BigInt(it.value),
      isContract: it.address.is_contract === true,
    }));
}
