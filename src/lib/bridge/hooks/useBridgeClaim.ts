/**
 * Bridge Claim Hook
 * Handles claiming bridged tokens on destination chain
 * Converted from web3-react to wagmi
 */

import { useCallback } from 'react';
import { useAccount, useWriteContract, usePublicClient } from 'wagmi';
import { toast } from 'sonner';
import BridgeABI from '../abis/BridgeABI.json';
import { useBridgeStore } from '../stores/bridgeStore';
import { getSignaturesForClaim, type SignatureResponse } from '../utils/bridgeSignatures';

export function useBridgeClaim() {
  const { address: account, chainId } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();
  const { updateTransaction, setIsPending } = useBridgeStore();

  /**
   * Simple claim - claim bridged tokens
   */
  const simpleClaim = useCallback(
    async (
      txHash: string,
      fromChainId: number
    ) => {
      if (!account || !chainId) {
        toast.error('Please connect your wallet');
        return null;
      }

      try {
        setIsPending(true);
        toast.loading('Fetching signatures...', { id: 'claim-loading' });

        // Get signatures from validators
        const { signatures, response } = await getSignaturesForClaim(txHash, fromChainId);

        if (signatures.length < 3) {
          toast.error('Insufficient signatures. Please try again later.', { id: 'claim-loading' });
          return null;
        }

        if (!response || !response.bridge) {
          toast.error('Invalid claim response', { id: 'claim-loading' });
          return null;
        }

        const claimData = response as Required<SignatureResponse>;
        const combinedSignatures = signatures.join('');

        toast.loading('Submitting claim transaction...', { id: 'claim-loading' });

        // Execute claim transaction
        const hash = await writeContractAsync({
          address: claimData.bridge as `0x${string}`,
          abi: BridgeABI,
          functionName: 'claim',
          args: [
            claimData.originalToken as `0x${string}`,
            claimData.originalChainID,
            txHash as `0x${string}`,
            claimData.to as `0x${string}`,
            BigInt(claimData.value),
            fromChainId,
            combinedSignatures as `0x${string}`
          ],
          value: 0n
        });

        // Wait for transaction receipt
        await publicClient?.waitForTransactionReceipt({ hash });

        // Update transaction status
        updateTransaction(txHash, {
          status: 'claimed'
        });

        toast.success('Tokens claimed successfully!', { id: 'claim-loading' });
        return hash;
      } catch (error: any) {
        console.error('Simple claim error:', error);
        
        if (error.message?.includes('User rejected')) {
          toast.error('Transaction rejected', { id: 'claim-loading' });
        } else if (error.message?.includes('already claimed')) {
          toast.error('Tokens already claimed', { id: 'claim-loading' });
        } else {
          toast.error('Claim transaction failed', { id: 'claim-loading' });
        }
        
        return null;
      } finally {
        setIsPending(false);
      }
    },
    [account, chainId, writeContractAsync, publicClient, updateTransaction, setIsPending]
  );

  /**
   * Advanced claim - claim with contract call
   */
  const advancedClaim = useCallback(
    async (
      txHash: string,
      fromChainId: number
    ) => {
      if (!account || !chainId) {
        toast.error('Please connect your wallet');
        return null;
      }

      try {
        setIsPending(true);
        toast.loading('Fetching signatures...', { id: 'claim-loading' });

        // Get signatures from validators
        const { signatures, response } = await getSignaturesForClaim(txHash, fromChainId);

        if (signatures.length < 3) {
          toast.error('Insufficient signatures. Please try again later.', { id: 'claim-loading' });
          return null;
        }

        if (!response || !response.bridge || !response.toContract || !response.data) {
          toast.error('Invalid advanced claim response', { id: 'claim-loading' });
          return null;
        }

        const claimData = response as Required<SignatureResponse>;
        const combinedSignatures = signatures.join('');

        toast.loading('Submitting advanced claim transaction...', { id: 'claim-loading' });

        // Execute advanced claim transaction
        const hash = await writeContractAsync({
          address: claimData.bridge as `0x${string}`,
          abi: BridgeABI,
          functionName: 'claimToContract',
          args: [
            claimData.originalToken as `0x${string}`,
            claimData.originalChainID,
            txHash as `0x${string}`,
            claimData.to as `0x${string}`,
            BigInt(claimData.value),
            fromChainId,
            claimData.toContract as `0x${string}`,
            claimData.data as `0x${string}`,
            combinedSignatures as `0x${string}`
          ],
          value: 0n
        });

        // Wait for transaction receipt
        await publicClient?.waitForTransactionReceipt({ hash });

        // Update transaction status
        updateTransaction(txHash, {
          status: 'claimed'
        });

        toast.success('Tokens claimed successfully!', { id: 'claim-loading' });
        return hash;
      } catch (error: any) {
        console.error('Advanced claim error:', error);
        
        if (error.message?.includes('User rejected')) {
          toast.error('Transaction rejected', { id: 'claim-loading' });
        } else if (error.message?.includes('already claimed')) {
          toast.error('Tokens already claimed', { id: 'claim-loading' });
        } else {
          toast.error('Claim transaction failed', { id: 'claim-loading' });
        }
        
        return null;
      } finally {
        setIsPending(false);
      }
    },
    [account, chainId, writeContractAsync, publicClient, updateTransaction, setIsPending]
  );

  return {
    simpleClaim,
    advancedClaim
  };
}
