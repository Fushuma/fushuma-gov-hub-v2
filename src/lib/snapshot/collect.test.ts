import { describe, it, expect } from "vitest";
import { getAddress } from "viem";
import { collectAll } from "./collect";
import { buildSnapshot } from "./build";
import { verifyClaimBundle } from "./verify";
import { loadConfig } from "./config";
import type { AssetSpec } from "./types";
import { NATIVE_SENTINEL } from "./types";

function addr(i: number) {
  return getAddress(`0x${i.toString(16).padStart(40, "0")}`);
}

/** Minimal in-memory Blockscout v2 mock with pagination. */
function makeMockFetch(data: {
  native: Array<{ hash: string; coin_balance: string; is_contract?: boolean }>;
  tokens: Record<string, Array<{ hash: string; value: string; is_contract?: boolean }>>;
}) {
  const PAGE = 2;
  return async (url: string) => {
    const u = new URL(url);
    const page = Number(u.searchParams.get("page") ?? "1");
    const start = (page - 1) * PAGE;

    const respond = (items: unknown[], hasMore: boolean) => ({
      ok: true,
      status: 200,
      json: async () => ({ items, next_page_params: hasMore ? { page: page + 1 } : null }),
      text: async () => "",
    });

    if (u.pathname.endsWith("/api/v2/addresses")) {
      const items = data.native.slice(start, start + PAGE).map((a) => ({
        hash: a.hash,
        coin_balance: a.coin_balance,
        is_contract: a.is_contract ?? false,
      }));
      return respond(items, start + PAGE < data.native.length);
    }

    const m = u.pathname.match(/\/api\/v2\/tokens\/([^/]+)\/holders$/);
    if (m) {
      const token = m[1];
      const holders = data.tokens[token] ?? data.tokens[token.toLowerCase()] ?? [];
      const items = holders.slice(start, start + PAGE).map((h) => ({
        address: { hash: h.hash, is_contract: h.is_contract ?? false },
        value: h.value,
      }));
      return respond(items, start + PAGE < holders.length);
    }

    return { ok: false, status: 404, json: async () => ({}), text: async () => "not found" };
  };
}

describe("collectAll (mocked explorer, no pinning)", () => {
  const usdc: AssetSpec = { kind: "erc20", symbol: "USDC", decimals: 6, address: addr(0xabc) };
  const cfg = loadConfig({
    chainId: 121224,
    assets: [
      { kind: "native", symbol: "FUMA", decimals: 18, address: NATIVE_SENTINEL },
      usdc,
    ],
    pinBalancesAtBlock: false,
    minBalanceWei: 1n,
    includeContracts: false,
  });

  const mockFetch = makeMockFetch({
    native: [
      { hash: addr(1), coin_balance: "1000000000000000000" },
      { hash: addr(2), coin_balance: "2000000000000000000" },
      { hash: addr(3), coin_balance: "3000000000000000000" },
      { hash: addr(4), coin_balance: "0" }, // filtered out (zero)
    ],
    tokens: {
      [addr(0xabc)]: [
        { hash: addr(1), value: "1000000" },
        { hash: addr(5), value: "5000000" },
      ],
    },
  });

  it("enumerates across multiple pages and both asset types", async () => {
    const { rawByAsset, block } = await collectAll(cfg, { explorer: { fetchImpl: mockFetch } });
    expect(block).toBe("latest");

    const native = rawByAsset.find((r) => r.asset.symbol === "FUMA")!;
    // 4 items, one has zero balance and is dropped by the explorer filter.
    expect(native.entries.map((e) => e.address).sort()).toEqual([addr(1), addr(2), addr(3)].sort());

    const token = rawByAsset.find((r) => r.asset.symbol === "USDC")!;
    expect(token.entries).toHaveLength(2);
  });

  it("feeds a verifiable snapshot through the full pipeline", async () => {
    const { rawByAsset } = await collectAll(cfg, { explorer: { fetchImpl: mockFetch } });
    const snap = buildSnapshot(rawByAsset, cfg, "2026-07-15T00:00:00Z");

    expect(snap.manifest.assets.map((a) => a.symbol).sort()).toEqual(["FUMA", "USDC"]);
    for (const a of snap.assets) {
      if (a.bundle) expect(verifyClaimBundle(a.bundle).ok).toBe(true);
    }

    // FUMA total = 1+2+3 FUMA
    const fuma = snap.manifest.assets.find((a) => a.symbol === "FUMA")!;
    expect(fuma.tokenTotal).toBe((6n * 10n ** 18n).toString());
  });
});
