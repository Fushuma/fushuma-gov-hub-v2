/**
 * Hex / address helpers shared by the hard-fork snapshot tooling.
 *
 * Everything the snapshot writes to disk is normalised through here so that
 * two independent runs of the exporter produce byte-identical output. That is
 * what makes the snapshot hash reproducible, and therefore verifiable by
 * anyone in the community who re-runs the export against their own node.
 */

export type Hex = `0x${string}`;

const HEX_RE = /^0x[0-9a-fA-F]*$/;
const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

export function isHex(value: unknown): value is Hex {
  return typeof value === 'string' && HEX_RE.test(value);
}

export function isAddress(value: unknown): value is Hex {
  return typeof value === 'string' && ADDRESS_RE.test(value);
}

/**
 * Lowercase, 0x-prefixed address. The snapshot deliberately does NOT use
 * checksummed addresses: mixed case makes string sorting and cross-tool
 * diffing (jq, sort, comm) unreliable.
 */
export function normalizeAddress(value: string): Hex {
  const trimmed = value.trim();
  if (!ADDRESS_RE.test(trimmed)) {
    throw new Error(`Not a 20-byte address: ${value}`);
  }
  return trimmed.toLowerCase() as Hex;
}

/** Parse a hex quantity ("0x1f", "0x0", "0x") into a bigint. */
export function hexToBigInt(value: string): bigint {
  if (!HEX_RE.test(value)) {
    throw new Error(`Not a hex quantity: ${value}`);
  }
  if (value === '0x') return 0n;
  return BigInt(value);
}

export function hexToNumber(value: string): number {
  const n = hexToBigInt(value);
  if (n > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error(`Hex quantity exceeds MAX_SAFE_INTEGER: ${value}`);
  }
  return Number(n);
}

/** Minimal hex quantity, per the JSON-RPC spec (no leading zeros, "0x0" for zero). */
export function toQuantity(value: bigint | number): Hex {
  const n = typeof value === 'bigint' ? value : BigInt(value);
  if (n < 0n) throw new Error(`Quantity must be non-negative: ${value}`);
  return `0x${n.toString(16)}`;
}

/** Zero-padded 32-byte hex, used for storage keys and slot values. */
export function toHash32(value: bigint | string): Hex {
  const n = typeof value === 'bigint' ? value : hexToBigInt(value);
  return `0x${n.toString(16).padStart(64, '0')}` as Hex;
}

/** Strip leading zero bytes from a storage value, geth genesis-alloc style. */
export function trimLeadingZeros(value: string): Hex {
  const body = value.replace(/^0x/, '').replace(/^0+/, '');
  return `0x${body === '' ? '0' : body}`;
}

/** Address encoded as a left-padded 32-byte topic. */
export function addressToTopic(address: string): Hex {
  return `0x${normalizeAddress(address).slice(2).padStart(64, '0')}` as Hex;
}

/** Recover an address from a left-padded 32-byte log topic. */
export function topicToAddress(topic: string): Hex {
  if (!HEX_RE.test(topic) || topic.length !== 66) {
    throw new Error(`Not a 32-byte topic: ${topic}`);
  }
  return normalizeAddress(`0x${topic.slice(26)}`);
}

export const ZERO_ADDRESS: Hex = '0x0000000000000000000000000000000000000000';
export const EMPTY_CODE_HASH: Hex =
  '0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470';
