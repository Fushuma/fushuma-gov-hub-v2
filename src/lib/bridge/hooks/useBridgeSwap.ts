/**
 * Bridge Swap Hook
 * Handles token bridging/swapping operations
 * Converted from web3-react to wagmi
 */

import { useCallback } from 'react';
import { useAccount, useWriteContract, usePublicClient } from 'wagmi';
import { toast } from 'sonner';
import { parseUnits } from 'viem';
import { getBridgeAddress, getSoyRouterAddress } from '../constants/bridgeContracts';
import BridgeABI from '../abis/BridgeABI.json';
import { useBridgeStore } from '../stores/bridgeStore';
import { generateTransactionId } from '../utils/bridgeHelpers';

export function useBridgeSwap() {
  const { address: account, chainId } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();
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
      toChainId: number,
      value: bigint = 0n
    ) => {
      if (!account || !chainId) {
        toast.error('Please connect your wallet');
        return null;
      }

      const bridgeAddress = getBridgeAddress(chainId);
      if (!bridgeAddress) {
        toast.error('Bridge not supported on this network');
        return null;
      }

      try {
        setIsPending(true);
        setIsSwapping(true);

        const amountBigInt = parseUnits(amount, decimals);

        // Execute bridge transaction
        const hash = await writeContractAsync({
          address: bridgeAddress,
          abi: BridgeABI,
          functionName: 'depositTokens',
          args: [receiver, tokenAddress, amountBigInt, toChainId],
          value
        });

        // Get block number
        const receipt = await publicClient?.waitForTransactionReceipt({ hash });
        const blockNumber = receipt?.blockNumber;

        // Add transaction to store
        addTransaction({
          id: generateTransactionId(),
          txHash: hash,
          fromChainId: chainId,
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
    [account, chainId, writeContractAsync, publicClient, addTransaction, setIsPending, setIsSwapping]
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
      toChainId: number,
      byteData: `0x${string}`,
      value: bigint = 0n
    ) => {
      if (!account || !chainId) {
        toast.error('Please connect your wallet');
        return null;
      }

      const bridgeAddress = getBridgeAddress(chainId);
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

        // Execute advanced bridge transaction
        const hash = await writeContractAsync({
          address: bridgeAddress,
          abi: BridgeABI,
          functionName: 'bridgeToContract',
          args: [receiver, tokenAddress, amountBigInt, toChainId, routerAddress, byteData],
          value
        });

        // Get block number
        const receipt = await publicClient?.waitForTransactionReceipt({ hash });
        const blockNumber = receipt?.blockNumber;

        // Add transaction to store
        addTransaction({
          id: generateTransactionId(),
          txHash: hash,
          fromChainId: chainId,
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
    [account, chainId, writeContractAsync, publicClient, addTransaction, setIsPending, setIsSwapping]
  );

  return {
    simpleSwap,
    advancedSwap
  };
}
