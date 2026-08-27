/**
 * Pins the freeze block.
 *
 * This is the single most important step. Every later read - balances, storage,
 * governance state - must observe the chain at exactly one height, otherwise
 * the snapshot records a state that never existed: an account debited at block
 * N and the recipient credited at N+3, with the difference simply gone.
 *
 * Two defences:
 *  1. Where the node supports EIP-1898, reads are addressed by block *hash*,
 *     so a reorg makes the call fail rather than silently answer from a
 *     different chain.
 *  2. Either way, the block hash is re-checked at the end of the run. If it
 *     changed, the snapshot is discarded - a reorged snapshot is worse than no
 *     snapshot, because it looks complete.
 */

import { RpcClient } from '../lib/rpc';
import { hexToBigInt, hexToNumber, toQuantity, type Hex } from '../../../src/lib/snapshot/hex';

export interface PinnedBlock {
  number: number;
  hash: Hex;
  parentHash: Hex;
  stateRoot: Hex;
  receiptsRoot: Hex;
  transactionsRoot: Hex;
  timestamp: number;
  timestampIso: string;
  gasUsed: string;
  gasLimit: string;
  transactionCount: number;
  chainId: number;
  /** True when reads are addressed by block hash rather than number. */
  eip1898: boolean;
  pinnedAt: string;
}

interface RpcBlock {
  number: string;
  hash: Hex;
  parentHash: Hex;
  stateRoot: Hex;
  receiptsRoot: Hex;
  transactionsRoot: Hex;
  timestamp: string;
  gasUsed: string;
  gasLimit: string;
  transactions: string[];
}

/** Block reference accepted by eth_getBalance and friends. */
export type BlockTag = Hex | { blockHash: Hex; requireCanonical: boolean };

export function blockTagFor(pinned: PinnedBlock): BlockTag {
  return pinned.eip1898
    ? { blockHash: pinned.hash, requireCanonical: true }
    : toQuantity(pinned.number);
}

export async function pinBlock(
  rpc: RpcClient,
  options: { block: number | null; confirmations: number; expectedChainId: number },
): Promise<PinnedBlock> {
  const chainIdHex = await rpc.call<string>('eth_chainId');
  const chainId = hexToNumber(chainIdHex);

  if (chainId !== options.expectedChainId) {
    throw new Error(
      `RPC reports chain ${chainId} but the snapshot is configured for ${options.expectedChainId}. ` +
        'Point --rpc at a Fushuma node or pass --chain-id.',
    );
  }

  const headHex = await rpc.call<string>('eth_blockNumber');
  const head = hexToNumber(headHex);

  const target =
    options.block === null ? head - options.confirmations : options.block;

  if (!Number.isInteger(target) || target < 0) {
    throw new Error(`Resolved an invalid freeze block: ${target}`);
  }
  if (target > head) {
    throw new Error(`Freeze block ${target} is ahead of the chain head ${head}`);
  }
  if (options.block === null && head - target < options.confirmations) {
    throw new Error(
      `Chain head ${head} is shallower than the ${options.confirmations}-block confirmation depth`,
    );
  }

  const block = await rpc.call<RpcBlock | null>('eth_getBlockByNumber', [
    toQuantity(target),
    false,
  ]);

  if (!block) throw new Error(`Node returned no block at height ${target}`);

  const eip1898 = await supportsEip1898(rpc, block.hash);
  const timestamp = hexToNumber(block.timestamp);

  return {
    number: hexToNumber(block.number),
    hash: block.hash,
    parentHash: block.parentHash,
    stateRoot: block.stateRoot,
    receiptsRoot: block.receiptsRoot,
    transactionsRoot: block.transactionsRoot,
    timestamp,
    timestampIso: new Date(timestamp * 1000).toISOString(),
    gasUsed: hexToBigInt(block.gasUsed).toString(),
    gasLimit: hexToBigInt(block.gasLimit).toString(),
    transactionCount: block.transactions.length,
    chainId,
    eip1898,
    pinnedAt: new Date().toISOString(),
  };
}

/**
 * EIP-1898 lets a state call name a block by hash. Not every node implements
 * it, so probe once with a call whose answer we already know.
 */
async function supportsEip1898(rpc: RpcClient, blockHash: Hex): Promise<boolean> {
  try {
    await rpc.call<string>('eth_getBalance', [
      '0x0000000000000000000000000000000000000000',
      { blockHash, requireCanonical: true },
    ]);
    return true;
  } catch {
    return false;
  }
}

/**
 * Re-read the freeze block and confirm the chain still agrees with what we
 * exported. Call this after every step that read state.
 */
export async function assertNoReorg(rpc: RpcClient, pinned: PinnedBlock): Promise<void> {
  const block = await rpc.call<RpcBlock | null>('eth_getBlockByNumber', [
    toQuantity(pinned.number),
    false,
  ]);

  if (!block) {
    throw new Error(
      `Freeze block ${pinned.number} has disappeared from the node - the chain reorged during the export`,
    );
  }

  if (block.hash.toLowerCase() !== pinned.hash.toLowerCase()) {
    throw new Error(
      `REORG DETECTED: block ${pinned.number} was ${pinned.hash} when the snapshot started ` +
        `and is ${block.hash} now. This snapshot is invalid - re-run it against a deeper ` +
        'confirmation depth (--confirmations).',
    );
  }
}
