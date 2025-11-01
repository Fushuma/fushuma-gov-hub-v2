// React hook for claiming vested tokens

'use client';

import { useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import VestingImplementationABI from '@/config/abis/VestingImplementation.json';

export function useClaimTokens() {
  const { address } = useAccount();
  const [isPending, setIsPending] = useState(false);
  const { writeContract, data: hash, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const claimTokens = async (vestingContractAddress: string) => {
    if (!address) {
      throw new Error('Wallet not connected');
    }

    setIsPending(true);

    try {
      await writeContract({
        address: vestingContractAddress as `0x${string}`,
        abi: VestingImplementationABI,
        functionName: 'claim',
        args: [],
      });
    } catch (err) {
      console.error('Claim failed:', err);
      throw err;
    } finally {
      setIsPending(false);
    }
  };

  return {
    claimTokens,
    isPending: isPending || isConfirming,
    isSuccess,
    error,
    hash,
  };
}
