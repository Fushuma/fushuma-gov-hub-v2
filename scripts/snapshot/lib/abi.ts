/**
 * Batched contract reads.
 *
 * Fushuma has no Multicall3 deployment, so "read this view function for 40,000
 * ids" means 40,000 eth_call requests. These helpers encode them with viem and
 * hand them to the batching RPC client as one job, keeping the call sites free
 * of encoding boilerplate.
 *
 * Reverts are returned, never thrown: enumerating a contract's ids inevitably
 * hits burned tokens and unset slots, and a snapshot that aborts on the first
 * revert would never finish.
 */

import {
  decodeFunctionResult,
  encodeFunctionData,
  type Abi,
} from 'viem';

import { RpcClient, RpcError, type RpcRequest, type RpcResult } from './rpc';
import type { BlockTag } from '../steps/pin';
import type { Hex } from '../../../src/lib/snapshot/hex';

export interface ContractCall {
  address: Hex;
  abi: Abi;
  functionName: string;
  args?: readonly unknown[];
}

export async function callBatch<T>(
  rpc: RpcClient,
  tag: BlockTag,
  calls: readonly ContractCall[],
): Promise<Array<RpcResult<T>>> {
  if (calls.length === 0) return [];

  const requests: RpcRequest[] = [];
  const encodeFailures = new Map<number, RpcError>();

  calls.forEach((call, index) => {
    try {
      const data = encodeFunctionData({
        abi: call.abi,
        functionName: call.functionName,
        args: call.args as never,
      });
      requests.push({ method: 'eth_call', params: [{ to: call.address, data }, tag] });
    } catch (error) {
      // Keep positions aligned: push a call that will be replaced by the
      // encode error when results are assembled.
      requests.push({ method: 'eth_call', params: [{ to: call.address, data: '0x' }, tag] });
      encodeFailures.set(
        index,
        new RpcError(
          `Failed to encode ${call.functionName} for ${call.address}: ` +
            (error instanceof Error ? error.message : String(error)),
        ),
      );
    }
  });

  const raw = await rpc.batch<Hex>(requests);

  return raw.map((result, index): RpcResult<T> => {
    const encodeError = encodeFailures.get(index);
    if (encodeError) return { ok: false, error: encodeError };
    if (!result.ok) return result;

    const call = calls[index];

    // An eth_call to an address with no code returns "0x". Treated as a
    // failure so it is never mistaken for a zero value.
    if (!result.value || result.value === '0x') {
      return {
        ok: false,
        error: new RpcError(
          `${call.functionName} on ${call.address} returned empty data (no code, or reverted)`,
        ),
      };
    }

    try {
      const decoded = decodeFunctionResult({
        abi: call.abi,
        functionName: call.functionName,
        data: result.value,
      });
      return { ok: true, value: decoded as T };
    } catch (error) {
      return {
        ok: false,
        error: new RpcError(
          `Failed to decode ${call.functionName} from ${call.address}: ` +
            (error instanceof Error ? error.message : String(error)),
        ),
      };
    }
  });
}

/** Single read; returns null instead of throwing when the call reverts. */
export async function callOrNull<T>(
  rpc: RpcClient,
  tag: BlockTag,
  call: ContractCall,
): Promise<T | null> {
  const [result] = await callBatch<T>(rpc, tag, [call]);
  return result.ok ? result.value : null;
}

/** Minimal ERC-20 surface, enough for the snapshot's token accounting. */
export const ERC20_ABI = [
  {
    type: 'function',
    name: 'totalSupply',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'decimals',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint8' }],
  },
  {
    type: 'function',
    name: 'symbol',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'string' }],
  },
  {
    type: 'function',
    name: 'name',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'string' }],
  },
] as const satisfies Abi;

/** keccak256("Transfer(address,address,uint256)") */
export const TRANSFER_TOPIC =
  '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef' as const;
