/**
 * Re-verification of an emitted claim bundle. Recomputes every leaf and folds
 * every proof exactly the way the on-chain distributor will, and checks the
 * advertised total against the sum of claim amounts. Used by the `verify` CLI
 * for post-generation auditing and by the test-suite.
 */

import type { Address, AssetClaimBundle } from "./types";
import { processProof, leafHash } from "./merkle";

export interface VerifyReport {
  ok: boolean;
  symbol: string;
  numClaims: number;
  checkedTotal: string;
  errors: string[];
}

export function verifyClaimBundle(bundle: AssetClaimBundle): VerifyReport {
  const errors: string[] = [];
  let total = 0n;
  let n = 0;

  for (const [account, claim] of Object.entries(bundle.claims)) {
    n += 1;
    let amount: bigint;
    try {
      amount = BigInt(claim.amount);
    } catch {
      errors.push(`${account}: unparseable amount ${claim.amount}`);
      continue;
    }
    if (amount <= 0n) {
      errors.push(`${account}: non-positive amount`);
    }
    total += amount;

    const computed = processProof(leafHash(account as Address, amount), claim.proof);
    if (computed !== bundle.merkleRoot) {
      errors.push(`${account}: proof does not resolve to merkleRoot`);
    }
  }

  if (n !== bundle.numClaims) {
    errors.push(`numClaims mismatch: header ${bundle.numClaims} vs actual ${n}`);
  }
  if (total.toString() !== bundle.tokenTotal) {
    errors.push(`tokenTotal mismatch: header ${bundle.tokenTotal} vs sum ${total.toString()}`);
  }

  return {
    ok: errors.length === 0,
    symbol: bundle.asset.symbol,
    numClaims: n,
    checkedTotal: total.toString(),
    errors,
  };
}
