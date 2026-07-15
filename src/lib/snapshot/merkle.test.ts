import { describe, it, expect } from "vitest";
import { keccak256, encodeAbiParameters, concatHex, getAddress } from "viem";
import {
  buildMerkle,
  leafHash,
  hashPair,
  processProof,
  verifyProof,
  LEAF_ENCODING,
  type MerkleEntry,
} from "./merkle";
import type { Address, Hex } from "./types";

/** Deterministic pseudo-address generator (no Math.random for reproducibility). */
function addr(i: number): Address {
  const hex = i.toString(16).padStart(40, "0");
  return getAddress(`0x${hex}`);
}

describe("leafHash", () => {
  it("matches the double-keccak(abi.encode(account, amount)) definition", () => {
    const account = addr(1);
    const amount = 12345n;
    const inner = keccak256(
      encodeAbiParameters([{ type: "address" }, { type: "uint256" }], [account, amount]),
    );
    const expected = keccak256(inner);
    expect(leafHash(account, amount)).toBe(expected);
  });

  it("is sensitive to both account and amount", () => {
    expect(leafHash(addr(1), 1n)).not.toBe(leafHash(addr(2), 1n));
    expect(leafHash(addr(1), 1n)).not.toBe(leafHash(addr(1), 2n));
  });

  it("exposes the leaf encoding used by the distributor contract", () => {
    expect(LEAF_ENCODING).toEqual(["address", "uint256"]);
  });
});

describe("hashPair (commutative sorted keccak)", () => {
  it("is order-independent", () => {
    const a = keccak256("0x01") as Hex;
    const b = keccak256("0x02") as Hex;
    expect(hashPair(a, b)).toBe(hashPair(b, a));
  });

  it("sorts ascending by value before hashing (matches OZ MerkleProof)", () => {
    const a = ("0x" + "11".repeat(32)) as Hex;
    const b = ("0x" + "22".repeat(32)) as Hex;
    // smaller (a) first
    expect(hashPair(a, b)).toBe(keccak256(concatHex([a, b])));
    expect(hashPair(b, a)).toBe(keccak256(concatHex([a, b])));
  });
});

describe("buildMerkle", () => {
  it("handles a single-entry tree: root == leaf, empty proof", () => {
    const account = addr(7);
    const amount = 999n;
    const { root, claims } = buildMerkle([{ account, amount }]);
    expect(root).toBe(leafHash(account, amount));
    expect(claims[account].proof).toEqual([]);
    expect(verifyProof(root, account, amount, [])).toBe(true);
  });

  it("produces proofs that verify for every leaf (contract mirror)", () => {
    const entries: MerkleEntry[] = Array.from({ length: 17 }, (_, i) => ({
      account: addr(i + 1),
      amount: BigInt((i + 1) * 1000),
    }));
    const { root, claims } = buildMerkle(entries);
    for (const e of entries) {
      const c = claims[getAddress(e.account)];
      expect(c).toBeDefined();
      expect(verifyProof(root, e.account, e.amount, c.proof)).toBe(true);
      // Independent fold matches the root too.
      expect(processProof(leafHash(e.account, e.amount), c.proof)).toBe(root);
    }
  });

  it("is independent of input order (same root for shuffled input)", () => {
    const base: MerkleEntry[] = Array.from({ length: 11 }, (_, i) => ({
      account: addr(i + 1),
      amount: BigInt(i + 1),
    }));
    const shuffled = [...base].reverse();
    expect(buildMerkle(shuffled).root).toBe(buildMerkle(base).root);
  });

  it("rejects a proof with a tampered amount", () => {
    const entries: MerkleEntry[] = [
      { account: addr(1), amount: 100n },
      { account: addr(2), amount: 200n },
      { account: addr(3), amount: 300n },
    ];
    const { root, claims } = buildMerkle(entries);
    const proof = claims[addr(1)].proof;
    expect(verifyProof(root, addr(1), 100n, proof)).toBe(true);
    expect(verifyProof(root, addr(1), 101n, proof)).toBe(false);
  });

  it("rejects one holder's proof used for a different holder", () => {
    const entries: MerkleEntry[] = [
      { account: addr(1), amount: 100n },
      { account: addr(2), amount: 200n },
      { account: addr(3), amount: 300n },
      { account: addr(4), amount: 400n },
    ];
    const { root, claims } = buildMerkle(entries);
    // addr(2) tries to use addr(1)'s proof with their own amount
    expect(verifyProof(root, addr(2), 200n, claims[addr(1)].proof)).toBe(false);
  });

  it("throws on duplicate accounts", () => {
    expect(() =>
      buildMerkle([
        { account: addr(1), amount: 1n },
        { account: addr(1), amount: 2n },
      ]),
    ).toThrow(/duplicate/i);
  });

  it("throws on non-positive amounts", () => {
    expect(() => buildMerkle([{ account: addr(1), amount: 0n }])).toThrow();
  });

  it("throws on empty input", () => {
    expect(() => buildMerkle([])).toThrow(/zero entries/i);
  });

  it("scales to a large tree with all proofs valid (even leaf count)", () => {
    const N = 1000;
    const entries: MerkleEntry[] = Array.from({ length: N }, (_, i) => ({
      account: addr(i + 1),
      amount: BigInt(i + 1) * 10n ** 18n,
    }));
    const { root, claims } = buildMerkle(entries);
    // Spot-check a representative sample across the tree, plus the ends.
    const sample = [0, 1, 2, 499, 500, 501, N - 2, N - 1];
    for (const i of sample) {
      const e = entries[i];
      expect(verifyProof(root, e.account, e.amount, claims[getAddress(e.account)].proof)).toBe(true);
    }
  });
});
