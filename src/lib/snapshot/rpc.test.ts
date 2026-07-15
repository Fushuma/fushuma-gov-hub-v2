import { describe, it, expect } from "vitest";
import { extractHolderAddresses } from "./rpc";

const A = "0x1111111111111111111111111111111111111111";
const B = "0x2222222222222222222222222222222222222222";
const ZERO = "0x0000000000000000000000000000000000000000";

describe("extractHolderAddresses (Transfer-log replay)", () => {
  it("collects distinct non-zero from/to addresses", () => {
    const logs = [
      { args: { from: ZERO, to: A } }, // mint to A
      { args: { from: A, to: B } }, // A -> B
      { args: { from: B, to: ZERO } }, // burn from B
    ];
    const set = extractHolderAddresses(logs);
    expect([...set].sort()).toEqual([A, B].sort());
  });

  it("excludes the zero address (mint source / burn sink)", () => {
    const set = extractHolderAddresses([{ args: { from: ZERO, to: ZERO } }]);
    expect(set.size).toBe(0);
  });

  it("lowercases and dedupes", () => {
    const set = extractHolderAddresses([
      { args: { from: A.toUpperCase().replace("0X", "0x"), to: B } },
      { args: { from: A, to: B } },
    ]);
    expect(set.has(A.toLowerCase())).toBe(true);
    expect(set.size).toBe(2);
  });

  it("tolerates logs with missing args", () => {
    const set = extractHolderAddresses([{}, { args: {} }, { args: { to: A } }]);
    expect([...set]).toEqual([A.toLowerCase()]);
  });
});
