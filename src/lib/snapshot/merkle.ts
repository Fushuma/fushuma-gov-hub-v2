/**
 * OpenZeppelin-compatible "standard" Merkle tree for the migration airdrop.
 *
 * The tree here is byte-for-byte compatible with `@openzeppelin/merkle-tree`
 * (`StandardMerkleTree`) and with OpenZeppelin's Solidity `MerkleProof.verify`
 * using commutative (sorted-pair) hashing. That compatibility is what lets the
 * on-chain distributor accept exactly the proofs this module generates.
 *
 * Leaf hashing (double keccak, the OZ standard, second-preimage resistant):
 *     leaf = keccak256(bytes.concat(keccak256(abi.encode(account, amount))))
 *
 * Node hashing (commutative / sorted, matches OZ MerkleProof default):
 *     node = keccak256(sort(left, right))
 *
 * We deliberately re-implement the algorithm (rather than depend on the OZ JS
 * package) so the toolkit stays dependency-light, and we cross-check every
 * generated proof against `processProof` — a line-for-line mirror of the
 * Solidity verification path — before emitting it. If the tree builder were
 * ever wrong, the cross-check would throw.
 */

import { keccak256, encodeAbiParameters, concatHex, getAddress } from "viem";
import type { Address, Hex } from "./types";

/** ABI types of the leaf tuple. Must match the distributor contract exactly. */
export const LEAF_ENCODING = ["address", "uint256"] as const;

/**
 * Double-keccak leaf hash — identical to what the Solidity distributor computes:
 *   keccak256(bytes.concat(keccak256(abi.encode(account, amount))))
 */
export function leafHash(account: Address, amount: bigint): Hex {
  const inner = keccak256(
    encodeAbiParameters(
      [{ type: "address" }, { type: "uint256" }],
      [getAddress(account), amount],
    ),
  );
  // keccak256 of the 32-byte inner digest (bytes.concat of a single element).
  return keccak256(inner);
}

/**
 * Commutative hash of two 32-byte nodes: keccak256 of the pair sorted
 * ascending by big-endian value. For equal-length 32-byte words, lexicographic
 * byte order equals numeric order, so BigInt comparison is exact.
 */
export function hashPair(a: Hex, b: Hex): Hex {
  return BigInt(a) < BigInt(b)
    ? keccak256(concatHex([a, b]))
    : keccak256(concatHex([b, a]));
}

/**
 * Mirror of Solidity `MerkleProof.processProof` (default commutative variant).
 * Folds the proof into the leaf and returns the computed root. On-chain
 * verification is exactly `processProof(leaf, proof) == root`.
 */
export function processProof(leaf: Hex, proof: readonly Hex[]): Hex {
  return proof.reduce<Hex>((acc, node) => hashPair(acc, node), leaf);
}

/** Verify a proof the same way the contract will. */
export function verifyProof(
  root: Hex,
  account: Address,
  amount: bigint,
  proof: readonly Hex[],
): boolean {
  return processProof(leafHash(account, amount), proof) === root;
}

function compareHex(a: Hex, b: Hex): number {
  const x = BigInt(a);
  const y = BigInt(b);
  return x < y ? -1 : x > y ? 1 : 0;
}

/**
 * Build the flat tree array from leaf hashes already sorted ascending.
 * Layout matches OZ: leaves occupy the tail, internal nodes the head, with
 * children of node i at 2i+1 and 2i+2.
 */
function makeTree(sortedLeaves: Hex[]): Hex[] {
  const n = sortedLeaves.length;
  const tree: Hex[] = new Array(2 * n - 1);
  for (let i = 0; i < n; i++) {
    tree[tree.length - 1 - i] = sortedLeaves[i];
  }
  for (let i = tree.length - 1 - n; i >= 0; i--) {
    tree[i] = hashPair(tree[2 * i + 1], tree[2 * i + 2]);
  }
  return tree;
}

/** Collect sibling hashes from a leaf up to the root. */
function proofForIndex(tree: Hex[], treeIndex: number): Hex[] {
  const proof: Hex[] = [];
  let i = treeIndex;
  while (i > 0) {
    const sibling = i % 2 === 0 ? i - 1 : i + 1;
    proof.push(tree[sibling]);
    i = Math.floor((i - 1) / 2);
  }
  return proof;
}

export interface MerkleEntry {
  account: Address;
  amount: bigint;
}

export interface MerkleResult {
  root: Hex;
  /** checksummed account -> { amount, proof } */
  claims: Record<Address, { amount: bigint; proof: Hex[] }>;
}

/**
 * Build a standard Merkle tree over (account, amount) leaves and return the
 * root plus a proof for every entry.
 *
 * Preconditions enforced here:
 *  - every account is unique (callers must aggregate duplicates first),
 *  - every amount is > 0 (zero-value leaves are meaningless to claim).
 *
 * Every emitted proof is verified against the root via the Solidity mirror
 * before returning; a mismatch throws rather than shipping a bad bundle.
 */
export function buildMerkle(entries: MerkleEntry[]): MerkleResult {
  if (entries.length === 0) {
    throw new Error("buildMerkle: cannot build a tree with zero entries");
  }

  const seen = new Set<string>();
  const prepared = entries.map((e) => {
    const account = getAddress(e.account);
    const key = account.toLowerCase();
    if (seen.has(key)) {
      throw new Error(`buildMerkle: duplicate account ${account} — aggregate before building`);
    }
    seen.add(key);
    if (e.amount <= 0n) {
      throw new Error(`buildMerkle: non-positive amount for ${account}`);
    }
    return { account, amount: e.amount, leaf: leafHash(account, e.amount) };
  });

  // Sort by leaf hash ascending (OZ order) while remembering original entries.
  const sorted = [...prepared].sort((a, b) => compareHex(a.leaf, b.leaf));
  const tree = makeTree(sorted.map((e) => e.leaf));
  const root = tree[0];

  const claims: MerkleResult["claims"] = {};
  sorted.forEach((entry, k) => {
    const treeIndex = tree.length - 1 - k;
    const proof = proofForIndex(tree, treeIndex);
    // Belt-and-suspenders: the contract must accept this exact proof.
    if (processProof(entry.leaf, proof) !== root) {
      throw new Error(`buildMerkle: internal proof verification failed for ${entry.account}`);
    }
    claims[entry.account] = { amount: entry.amount, proof };
  });

  return { root, claims };
}
