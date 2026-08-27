/**
 * Merkle tree over snapshot entries.
 *
 * Two uses in the hard fork:
 *  1. A single root published before the fork, so anyone can verify their own
 *     balance made it into the snapshot without trusting the exported files.
 *  2. If any balance has to be re-distributed on the forked chain, the same
 *     root drives an on-chain claim contract.
 *
 * Hashing is commutative (the pair is sorted before hashing), which is what
 * OpenZeppelin's MerkleProof.verify expects, and leaves are double-hashed to
 * rule out the second-preimage attack where an internal node is replayed as a
 * leaf.
 */

import { concatHex, encodeAbiParameters, keccak256, parseAbiParameters } from 'viem';
import { normalizeAddress, type Hex } from './hex';

export interface MerkleEntry {
  address: string;
  /** Interpreted as uint256 - wei for native FUMA, base units for a token. */
  amount: bigint;
}

export interface MerkleTree {
  root: Hex;
  /** layers[0] is the sorted leaf set; the last layer is the single root. */
  layers: Hex[][];
  leafIndex: Map<Hex, number>;
}

const ENTRY_PARAMS = parseAbiParameters('address, uint256');

/** keccak256(keccak256(abi.encode(address, uint256))) */
export function hashEntry(entry: MerkleEntry): Hex {
  const encoded = encodeAbiParameters(ENTRY_PARAMS, [
    normalizeAddress(entry.address),
    entry.amount,
  ]);
  return keccak256(keccak256(encoded));
}

function hashPair(a: Hex, b: Hex): Hex {
  return a <= b ? keccak256(concatHex([a, b])) : keccak256(concatHex([b, a]));
}

/**
 * Build a tree from raw leaf hashes. Leaves are sorted and de-duplicated so
 * the root depends only on the set of entries, never on file ordering - two
 * independent exports of the same chain state must produce the same root.
 */
export function buildTreeFromLeaves(leaves: readonly Hex[]): MerkleTree {
  if (leaves.length === 0) {
    throw new Error('Cannot build a Merkle tree with no leaves');
  }

  const sorted = [...new Set(leaves)].sort();
  const layers: Hex[][] = [sorted];

  while (layers[layers.length - 1].length > 1) {
    const current = layers[layers.length - 1];
    const next: Hex[] = [];
    for (let i = 0; i < current.length; i += 2) {
      if (i + 1 === current.length) {
        // Odd node out: promote it unchanged rather than hashing it with
        // itself, which would let it stand in for a two-leaf subtree.
        next.push(current[i]);
      } else {
        next.push(hashPair(current[i], current[i + 1]));
      }
    }
    layers.push(next);
  }

  const leafIndex = new Map<Hex, number>();
  sorted.forEach((leaf, i) => leafIndex.set(leaf, i));

  return { root: layers[layers.length - 1][0], layers, leafIndex };
}

export function buildTree(entries: readonly MerkleEntry[]): MerkleTree {
  return buildTreeFromLeaves(entries.map(hashEntry));
}

export function getProof(tree: MerkleTree, leaf: Hex): Hex[] {
  const index = tree.leafIndex.get(leaf);
  if (index === undefined) {
    throw new Error(`Leaf is not part of this tree: ${leaf}`);
  }

  const proof: Hex[] = [];
  let position = index;

  for (let level = 0; level < tree.layers.length - 1; level += 1) {
    const layer = tree.layers[level];
    const isRight = position % 2 === 1;
    const siblingIndex = isRight ? position - 1 : position + 1;

    if (siblingIndex < layer.length) {
      proof.push(layer[siblingIndex]);
      position = Math.floor(position / 2);
    } else {
      // Promoted node - it moves up a level without gaining a proof element.
      position = Math.floor(position / 2);
    }
  }

  return proof;
}

export function verifyProof(root: Hex, leaf: Hex, proof: readonly Hex[]): boolean {
  let computed = leaf;
  for (const sibling of proof) {
    computed = hashPair(computed, sibling);
  }
  return computed === root;
}
