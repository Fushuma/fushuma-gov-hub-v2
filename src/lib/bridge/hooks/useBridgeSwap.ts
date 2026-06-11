/**
 * Bridge Swap Hook
 * Handles token bridging/swapping operations.
 *
 * Matches the production bridge app's deposit calls. Passing the source
 * chain id to writeContractAsync makes wagmi prompt a network switch
 * when the wallet is on a different chain.
 */

import { useCallback } from 'react';
import { useAccount, useWriteContract, useConfig } from 'wagmi';
import { waitForTransactionReceipt } from 'wagmi/actions';
import { toast } from 'sonner';
import { parseUnits } from 'viem';
import { getBridgeAddress, getSoyRouterAddress } from '../constants/bridgeContracts';
import BridgeABI from '../abis/bridge.json';
import { useBridgeStore } from '../stores/bridgeStore';
import { generateTransactionId } from '../utils/bridgeHelpers';

export function useBridgeSwap() {
  const { address: account } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const config = useConfig();
  const { addTransaction, setIsPending, setIsSwapping } = useBridgeStore();

  /**
   * Simple swap - direct token bridge
   */
  const simpleSwap = useCallback(
    async (
      receiver: string,
      tokenAddress: `0x${string}`,
      amount: string,
      decimals: number,
      fromChainId: number,
      toChainId: number,
      value: bigint = 0n
    ) => {
      if (!account) {
        toast.error('Please connect your wallet');
        return null;
      }

      const bridgeAddress = getBridgeAddress(fromChainId);
      if (!bridgeAddress) {
        toast.error('Bridge not supported on this network');
        return null;
      }

      try {
        setIsPending(true);
        setIsSwapping(true);

        const amountBigInt = parseUnits(amount, decimals);

        // Execute bridge transaction on the source chain
        const hash = await writeContractAsync({
          address: bridgeAddress,
          abi: BridgeABI,
          functionName: 'depositTokens',
          args: [receiver, tokenAddress, amountBigInt, BigInt(toChainId)],
          value,
          chainId: fromChainId
        });

        // Get block number
        const receipt = await waitForTransactionReceipt(config, {
          hash,
          chainId: fromChainId
        });
        const blockNumber = receipt?.blockNumber;

        // Add transaction to store
        addTransaction({
          id: generateTransactionId(),
          txHash: hash,
          fromChainId,
          toChainId,
          fromToken: tokenAddress,
          toToken: tokenAddress, // Same token on destination
          amount,
          status: 'pending',
          blockNumber: Number(blockNumber),
          confirmedBlocks: 0,
          timestamp: Date.now()
        });

        toast.success('Bridge transaction submitted');
        return { hash, blockNumber };
      } catch (error: any) {
        console.error('Simple swap error:', error);

        if (error.message?.includes('User rejected')) {
          toast.error('Transaction rejected');
        } else {
          toast.error('Bridge transaction failed');
        }

        return null;
      } finally {
        setIsPending(false);
        setIsSwapping(false);
      }
    },
    [account, writeContractAsync, config, addTransaction, setIsPending, setIsSwapping]
  );

  /**
   * Advanced swap - bridge with contract call on destination
   */
  const advancedSwap = useCallback(
    async (
      receiver: string,
      tokenAddress: `0x${string}`,
      amount: string,
      decimals: number,
      fromChainId: number,
      toChainId: number,
      byteData: `0x${string}`,
      value: bigint = 0n
    ) => {
      if (!account) {
        toast.error('Please connect your wallet');
        return null;
      }

      const bridgeAddress = getBridgeAddress(fromChainId);
      if (!bridgeAddress) {
        toast.error('Bridge not supported on this network');
        return null;
      }

      const routerAddress = getSoyRouterAddress(toChainId);
      if (!routerAddress) {
        toast.error('Router not available on destination chain');
        return null;
      }

      try {
        setIsPending(true);
        setIsSwapping(true);

        const amountBigInt = parseUnits(amount, decimals);

        // Execute advanced bridge transaction on the source chain
        const hash = await writeContractAsync({
          address: bridgeAddress,
          abi: BridgeABI,
          functionName: 'bridgeToContract',
          args: [receiver, tokenAddress, amountBigInt, BigInt(toChainId), routerAddress, byteData],
          value,
          chainId: fromChainId
        });

        // Get block number
        const receipt = await waitForTransactionReceipt(config, {
          hash,
          chainId: fromChainId
        });
        const blockNumber = receipt?.blockNumber;

        // Add transaction to store
        addTransaction({
          id: generateTransactionId(),
          txHash: hash,
          fromChainId,
          toChainId,
          fromToken: tokenAddress,
          toToken: tokenAddress,
          amount,
          status: 'pending',
          blockNumber: Number(blockNumber),
          confirmedBlocks: 0,
          timestamp: Date.now()
        });

        toast.success('Advanced bridge transaction submitted');
        return { hash, blockNumber };
      } catch (error: any) {
        console.error('Advanced swap error:', error);

        if (error.message?.includes('User rejected')) {
          toast.error('Transaction rejected');
        } else {
          toast.error('Bridge transaction failed');
        }

        return null;
      } finally {
        setIsPending(false);
        setIsSwapping(false);
      }
    },
    [account, writeContractAsync, config, addTransaction, setIsPending, setIsSwapping]
  );

  return {
    simpleSwap,
    advancedSwap
  };
}
