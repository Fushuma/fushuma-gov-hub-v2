import { describe, expect, it } from 'vitest';

import {
  addressToTopic,
  hexToBigInt,
  normalizeAddress,
  toHash32,
  toQuantity,
  topicToAddress,
  trimLeadingZeros,
  ZERO_ADDRESS,
} from './hex';
import { BalanceLedger } from './ledger';
import { buildTree, buildTreeFromLeaves, getProof, hashEntry, verifyProof } from './merkle';
import { bisectRange, chunk, sequence, splitBlockRange } from './ranges';
import type { Hex } from './hex';

const addr = (n: number): string => `0x${n.toString(16).padStart(40, '0')}`;

describe('hex helpers', () => {
  it('lowercases addresses so output sorts deterministically', () => {
    expect(normalizeAddress('0xBcA7B11c788dBb85bE92627ef1e60a2A9B7e2c6E')).toBe(
      '0xbca7b11c788dbb85be92627ef1e60a2a9b7e2c6e',
    );
  });

  it('rejects anything that is not a 20-byte address', () => {
    expect(() => normalizeAddress('0x1234')).toThrow();
    expect(() => normalizeAddress('not-an-address')).toThrow();
  });

  it('treats "0x" as zero, as nodes return for empty quantities', () => {
    expect(hexToBigInt('0x')).toBe(0n);
    expect(hexToBigInt('0x0')).toBe(0n);
    expect(hexToBigInt('0xff')).toBe(255n);
  });

  it('emits minimal quantities without leading zeros', () => {
    expect(toQuantity(0)).toBe('0x0');
    expect(toQuantity(255n)).toBe('0xff');
    expect(() => toQuantity(-1n)).toThrow();
  });

  it('round-trips an address through a padded log topic', () => {
    const a = normalizeAddress(addr(0x1234));
    expect(topicToAddress(addressToTopic(a))).toBe(a);
  });

  it('pads storage slots to 32 bytes and trims values for genesis alloc', () => {
    expect(toHash32(1n)).toBe(`0x${'0'.repeat(63)}1`);
    expect(trimLeadingZeros(toHash32(255n))).toBe('0xff');
    expect(trimLeadingZeros(toHash32(0n))).toBe('0x0');
  });
});

describe('BalanceLedger', () => {
  it('rebuilds balances from mints and transfers', () => {
    const ledger = new BalanceLedger();
    ledger.applyTransfer({ from: ZERO_ADDRESS, to: addr(1), value: 100n });
    ledger.applyTransfer({ from: addr(1), to: addr(2), value: 30n });

    expect(ledger.balanceOf(addr(1))).toBe(70n);
    expect(ledger.balanceOf(addr(2))).toBe(30n);

    const summary = ledger.summary();
    expect(summary.derivedSupply).toBe(100n);
    expect(summary.sumOfBalances).toBe(100n);
    expect(summary.anomalies).toEqual([]);
  });

  it('nets a self-transfer to zero', () => {
    const ledger = new BalanceLedger();
    ledger.applyTransfer({ from: ZERO_ADDRESS, to: addr(1), value: 50n });
    ledger.applyTransfer({ from: addr(1), to: addr(1), value: 50n });
    expect(ledger.balanceOf(addr(1))).toBe(50n);
    expect(ledger.summary().anomalies).toEqual([]);
  });

  it('removes burned supply and keeps the burn address out of holders', () => {
    const ledger = new BalanceLedger();
    ledger.applyTransfer({ from: ZERO_ADDRESS, to: addr(1), value: 100n });
    ledger.applyTransfer({ from: addr(1), to: ZERO_ADDRESS, value: 40n });

    const summary = ledger.summary();
    expect(summary.totalBurned).toBe(40n);
    expect(summary.derivedSupply).toBe(60n);
    expect(summary.sumOfBalances).toBe(60n);
    expect(ledger.holders().map((h) => h.address)).toEqual([normalizeAddress(addr(1))]);
  });

  it('flags a negative balance instead of silently exporting it', () => {
    const ledger = new BalanceLedger();
    // Replaying an outbound transfer we never saw funded - i.e. a missed log.
    ledger.applyTransfer({ from: addr(9), to: addr(1), value: 5n });

    const summary = ledger.summary();
    expect(summary.anomalies).toHaveLength(1);
    expect(summary.anomalies[0]).toMatchObject({
      address: normalizeAddress(addr(9)),
      balance: -5n,
      reason: 'negative-balance',
    });
  });

  it('returns holders sorted by address for reproducible output', () => {
    const ledger = new BalanceLedger();
    for (const n of [5, 1, 3, 2]) {
      ledger.applyTransfer({ from: ZERO_ADDRESS, to: addr(n), value: 1n });
    }
    const addresses = ledger.holders().map((h) => h.address);
    expect(addresses).toEqual([...addresses].sort());
  });

  it('rejects a negative transfer value', () => {
    const ledger = new BalanceLedger();
    expect(() => ledger.applyTransfer({ from: addr(1), to: addr(2), value: -1n })).toThrow();
  });
});

describe('merkle tree', () => {
  it('produces a verifiable proof for every leaf, at every tree size', () => {
    // Odd sizes exercise the promoted-node path, which is where an off-by-one
    // in proof generation would hide.
    for (let size = 1; size <= 33; size += 1) {
      const entries = Array.from({ length: size }, (_, i) => ({
        address: addr(i + 1),
        amount: BigInt(i + 1) * 10n ** 18n,
      }));
      const tree = buildTree(entries);

      for (const entry of entries) {
        const leaf = hashEntry(entry);
        expect(verifyProof(tree.root, leaf, getProof(tree, leaf))).toBe(true);
      }
    }
  });

  it('rejects a proof for an amount that was not in the tree', () => {
    const entries = [
      { address: addr(1), amount: 100n },
      { address: addr(2), amount: 200n },
    ];
    const tree = buildTree(entries);
    const honest = hashEntry(entries[0]);
    const forged = hashEntry({ address: addr(1), amount: 999n });

    expect(verifyProof(tree.root, forged, getProof(tree, honest))).toBe(false);
  });

  it('is independent of input ordering', () => {
    const entries = [
      { address: addr(3), amount: 3n },
      { address: addr(1), amount: 1n },
      { address: addr(2), amount: 2n },
    ];
    const forward = buildTree(entries).root;
    const reversed = buildTree([...entries].reverse()).root;
    expect(forward).toBe(reversed);
  });

  it('changes the root when any amount changes', () => {
    const base = [
      { address: addr(1), amount: 1n },
      { address: addr(2), amount: 2n },
    ];
    const tweaked = [
      { address: addr(1), amount: 1n },
      { address: addr(2), amount: 3n },
    ];
    expect(buildTree(base).root).not.toBe(buildTree(tweaked).root);
  });

  it('refuses to build an empty tree', () => {
    expect(() => buildTreeFromLeaves([])).toThrow();
  });

  it('rejects a leaf that is not in the tree', () => {
    const tree = buildTree([{ address: addr(1), amount: 1n }]);
    const stranger = hashEntry({ address: addr(7), amount: 7n }) as Hex;
    expect(() => getProof(tree, stranger)).toThrow();
  });
});

describe('range helpers', () => {
  it('covers an inclusive range exactly once', () => {
    const ranges = splitBlockRange(0, 250, 100);
    expect(ranges).toEqual([
      { from: 0, to: 99 },
      { from: 100, to: 199 },
      { from: 200, to: 250 },
    ]);
  });

  it('handles a single-block range and an empty one', () => {
    expect(splitBlockRange(7, 7, 100)).toEqual([{ from: 7, to: 7 }]);
    expect(splitBlockRange(10, 9, 100)).toEqual([]);
  });

  it('bisects until a range cannot be split further', () => {
    expect(bisectRange({ from: 0, to: 1 })).toEqual([
      { from: 0, to: 0 },
      { from: 1, to: 1 },
    ]);
    expect(bisectRange({ from: 5, to: 5 })).toBeNull();
  });

  it('chunks and sequences', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(chunk([], 2)).toEqual([]);
    expect(sequence(1, 4)).toEqual([1, 2, 3, 4]);
    expect(sequence(1, 0)).toEqual([]);
  });
});
