/**
 * Block-range and batch splitting helpers.
 *
 * Log scans over a whole chain are the slowest part of the snapshot, and every
 * public RPC caps eth_getLogs differently (by block span, by result count, or
 * both). These helpers keep that arithmetic in one tested place instead of
 * scattered across the scan steps.
 */

export interface BlockRange {
  from: number;
  to: number;
}

/** Inclusive [from, to] split into spans of at most `size` blocks. */
export function splitBlockRange(from: number, to: number, size: number): BlockRange[] {
  if (!Number.isInteger(from) || !Number.isInteger(to)) {
    throw new Error('Block range bounds must be integers');
  }
  if (size <= 0) throw new Error('Range size must be positive');
  if (to < from) return [];

  const ranges: BlockRange[] = [];
  for (let start = from; start <= to; start += size) {
    ranges.push({ from: start, to: Math.min(start + size - 1, to) });
  }
  return ranges;
}

/**
 * Halve a range that a node refused as too large. Returns the two sub-ranges,
 * or null when the range is a single block and cannot be split further - at
 * that point the failure is real and must be surfaced, not retried forever.
 */
export function bisectRange(range: BlockRange): [BlockRange, BlockRange] | null {
  if (range.to <= range.from) return null;
  const mid = range.from + Math.floor((range.to - range.from) / 2);
  return [
    { from: range.from, to: mid },
    { from: mid + 1, to: range.to },
  ];
}

export function chunk<T>(items: readonly T[], size: number): T[][] {
  if (size <= 0) throw new Error('Chunk size must be positive');
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

/** Inclusive integer sequence, used to walk contract id counters. */
export function sequence(from: number, to: number): number[] {
  const out: number[] = [];
  for (let i = from; i <= to; i += 1) out.push(i);
  return out;
}
