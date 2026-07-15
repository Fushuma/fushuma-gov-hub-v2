import { describe, it, expect } from "vitest";
import { getAddress } from "viem";
import {
  normalizeBalances,
  partitionBalances,
  serializeBalances,
  serializeExcluded,
  buildClaimBundle,
  buildSnapshot,
} from "./build";
import { verifyClaimBundle } from "./verify";
import { loadConfig, SYSTEM_CONTRACTS } from "./config";
import type { AssetBalances, AssetSpec, BalanceEntry } from "./types";
import { NATIVE_SENTINEL } from "./types";

function addr(i: number) {
  return getAddress(`0x${i.toString(16).padStart(40, "0")}`);
}

const NATIVE: AssetSpec = { kind: "native", symbol: "FUMA", decimals: 18, address: NATIVE_SENTINEL };
const cfgBase = loadConfig({ chainId: 121224, includeContracts: false, minBalanceWei: 1n });

describe("normalizeBalances", () => {
  it("merges duplicate addresses by summing", () => {
    const raw: BalanceEntry[] = [
      { address: addr(1), balance: 100n },
      { address: addr(1).toLowerCase() as `0x${string}`, balance: 50n },
    ];
    const out = normalizeBalances(raw, cfgBase);
    expect(out).toHaveLength(1);
    expect(out[0].balance).toBe(150n);
    expect(out[0].address).toBe(addr(1)); // checksummed
  });

  it("drops excluded (burn) addresses", () => {
    const raw: BalanceEntry[] = [
      { address: "0x0000000000000000000000000000000000000000", balance: 100n },
      { address: "0x000000000000000000000000000000000000dEaD", balance: 100n },
      { address: addr(5), balance: 100n },
    ];
    const out = normalizeBalances(raw, cfgBase);
    expect(out.map((e) => e.address)).toEqual([addr(5)]);
  });

  it("drops contracts unless includeContracts is set", () => {
    const raw: BalanceEntry[] = [
      { address: addr(2), balance: 100n, isContract: true },
      { address: addr(3), balance: 100n, isContract: false },
    ];
    expect(normalizeBalances(raw, { ...cfgBase, includeContracts: false }).map((e) => e.address)).toEqual([
      addr(3),
    ]);
    expect(
      normalizeBalances(raw, { ...cfgBase, includeContracts: true }).map((e) => e.address).sort(),
    ).toEqual([addr(2), addr(3)].sort());
  });

  it("drops balances below the dust threshold", () => {
    const raw: BalanceEntry[] = [
      { address: addr(1), balance: 5n },
      { address: addr(2), balance: 100n },
    ];
    const out = normalizeBalances(raw, { ...cfgBase, minBalanceWei: 10n });
    expect(out.map((e) => e.address)).toEqual([addr(2)]);
  });

  it("sorts by descending balance", () => {
    const raw: BalanceEntry[] = [
      { address: addr(1), balance: 10n },
      { address: addr(2), balance: 30n },
      { address: addr(3), balance: 20n },
    ];
    expect(normalizeBalances(raw, cfgBase).map((e) => e.balance)).toEqual([30n, 20n, 10n]);
  });

  it("skips malformed addresses without throwing", () => {
    const raw = [
      { address: "not-an-address" as `0x${string}`, balance: 100n },
      { address: addr(9), balance: 100n },
    ];
    const out = normalizeBalances(raw, cfgBase);
    expect(out.map((e) => e.address)).toEqual([addr(9)]);
  });
});

describe("partitionBalances (excluded report)", () => {
  it("always excludes system/protocol contracts, even with includeContracts", () => {
    const veFUMA = SYSTEM_CONTRACTS.VotingEscrow;
    const raw: BalanceEntry[] = [
      { address: veFUMA, balance: 50_000n * 10n ** 18n }, // user FUMA locked in veFUMA
      { address: addr(7), balance: 100n },
    ];
    const cfg = loadConfig({ includeContracts: true, minBalanceWei: 1n });
    const { kept, excluded } = partitionBalances(raw, cfg);
    expect(kept.map((e) => e.address)).toEqual([addr(7)]);
    const ve = excluded.find((e) => e.address.toLowerCase() === veFUMA.toLowerCase())!;
    expect(ve.reason).toBe("system-contract");
    expect(ve.label).toBe("VotingEscrow");
    expect(ve.balance).toBe((50_000n * 10n ** 18n).toString());
  });

  it("classifies burn, contract, and dust exclusions with reasons", () => {
    const cfg = loadConfig({ includeContracts: false, minBalanceWei: 10n });
    const raw: BalanceEntry[] = [
      { address: "0x000000000000000000000000000000000000dEaD", balance: 999n },
      { address: addr(2), balance: 100n, isContract: true },
      { address: addr(3), balance: 5n }, // dust
      { address: addr(4), balance: 100n }, // kept
    ];
    const { kept, excluded } = partitionBalances(raw, cfg);
    expect(kept.map((e) => e.address)).toEqual([addr(4)]);
    const reasons = Object.fromEntries(excluded.map((e) => [e.address.toLowerCase(), e.reason]));
    expect(reasons["0x000000000000000000000000000000000000dead"]).toBe("burn");
    expect(reasons[addr(2).toLowerCase()]).toBe("contract");
    expect(reasons[addr(3).toLowerCase()]).toBe("dust");
  });

  it("serializeExcluded summarizes totals by reason", () => {
    const cfg = loadConfig({ includeContracts: false, minBalanceWei: 10n });
    const raw: BalanceEntry[] = [
      { address: addr(2), balance: 100n, isContract: true },
      { address: addr(5), balance: 200n, isContract: true },
      { address: addr(3), balance: 5n },
    ];
    const { excluded } = partitionBalances(raw, cfg);
    const s = serializeExcluded(NATIVE, 121224, "1", excluded);
    expect(s.count).toBe(3);
    expect(s.totalExcluded).toBe("305");
    expect(s.byReason.contract).toEqual({ count: 2, total: "300" });
    expect(s.byReason.dust).toEqual({ count: 1, total: "5" });
  });
});

describe("serializeBalances", () => {
  it("computes count and total, stringifies balances", () => {
    const entries: BalanceEntry[] = [
      { address: addr(1), balance: 100n },
      { address: addr(2), balance: 250n },
    ];
    const s = serializeBalances(NATIVE, 121224, "500", entries);
    expect(s.count).toBe(2);
    expect(s.totalBalance).toBe("350");
    expect(s.entries[0].balance).toBe("100");
  });
});

describe("buildClaimBundle", () => {
  it("builds a bundle whose every proof verifies and whose total is exact", () => {
    const entries: BalanceEntry[] = Array.from({ length: 25 }, (_, i) => ({
      address: addr(i + 1),
      balance: BigInt(i + 1) * 10n ** 18n,
    }));
    const bundle = buildClaimBundle(NATIVE, 121224, "500", entries)!;
    expect(bundle).not.toBeNull();
    expect(bundle.numClaims).toBe(25);
    const expectedTotal = entries.reduce((a, e) => a + e.balance, 0n);
    expect(bundle.tokenTotal).toBe(expectedTotal.toString());

    const report = verifyClaimBundle(bundle);
    expect(report.ok).toBe(true);
    expect(report.errors).toEqual([]);
    expect(report.numClaims).toBe(25);
  });

  it("returns null when there is nothing to claim", () => {
    expect(buildClaimBundle(NATIVE, 121224, "500", [])).toBeNull();
    expect(buildClaimBundle(NATIVE, 121224, "500", [{ address: addr(1), balance: 0n }])).toBeNull();
  });
});

describe("buildSnapshot", () => {
  it("assembles a manifest across assets and keeps bundles verifiable", () => {
    const usdc: AssetSpec = { kind: "erc20", symbol: "USDC", decimals: 6, address: addr(0xabc) };
    const raw: AssetBalances[] = [
      {
        asset: NATIVE,
        chainId: 121224,
        block: "500",
        entries: [
          { address: addr(1), balance: 10n ** 18n },
          { address: addr(2), balance: 2n * 10n ** 18n },
        ],
      },
      {
        asset: usdc,
        chainId: 121224,
        block: "500",
        entries: [{ address: addr(1), balance: 1_000_000n }],
      },
    ];
    const cfg = loadConfig({ chainId: 121224, block: "500" });
    const snap = buildSnapshot(raw, cfg, "2026-07-15T00:00:00Z");

    expect(snap.manifest.assets).toHaveLength(2);
    expect(snap.manifest.block).toBe("500");
    expect(snap.manifest.generatedAt).toBe("2026-07-15T00:00:00Z");

    for (const a of snap.assets) {
      if (a.bundle) {
        expect(verifyClaimBundle(a.bundle).ok).toBe(true);
      }
    }

    const fuma = snap.manifest.assets.find((a) => a.symbol === "FUMA")!;
    expect(fuma.tokenTotal).toBe((3n * 10n ** 18n).toString());
    expect(fuma.numClaims).toBe(2);
  });

  it("omits empty assets from the manifest but keeps them in assets with null bundle", () => {
    const empty: AssetSpec = { kind: "erc20", symbol: "DEAD", decimals: 18, address: addr(0xdead) };
    const raw: AssetBalances[] = [
      { asset: NATIVE, chainId: 121224, block: "1", entries: [{ address: addr(1), balance: 5n }] },
      { asset: empty, chainId: 121224, block: "1", entries: [] },
    ];
    const snap = buildSnapshot(raw, loadConfig({ chainId: 121224, block: "1", minBalanceWei: 1n }));
    expect(snap.manifest.assets.map((a) => a.symbol)).toEqual(["FUMA"]);
    expect(snap.assets.find((a) => a.balances.asset.symbol === "DEAD")!.bundle).toBeNull();
  });
});
