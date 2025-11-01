// React hook for ICO owner management operations

'use client';

import { useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import LaunchpadABI from '@/config/abis/Launchpad.json';
import { LAUNCHPAD_PROXY_ADDRESS } from '@/lib/launchpad/contracts';

export function useICOManagement() {
  const { address } = useAccount();
  const [isPending, setIsPending] = useState(false);
  const { writeContract, data: hash, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  /**
   * Close an ICO (owner only)
   */
  const closeICO = async (icoId: number) => {
    if (!address) {
      throw new Error('Wallet not connected');
    }

    setIsPending(true);

    try {
      await writeContract({
        address: LAUNCHPAD_PROXY_ADDRESS as `0x${string}`,
        abi: LaunchpadABI,
        functionName: 'closeICO',
        args: [icoId],
      });
    } catch (err) {
      console.error('Close ICO failed:', err);
      throw err;
    } finally {
      setIsPending(false);
    }
  };

  /**
   * Withdraw raised funds (owner only)
   */
  const withdrawFunds = async (icoId: number) => {
    if (!address) {
      throw new Error('Wallet not connected');
    }

    setIsPending(true);

    try {
      await writeContract({
        address: LAUNCHPAD_PROXY_ADDRESS as `0x${string}`,
        abi: LaunchpadABI,
        functionName: 'withdrawCost',
        args: [icoId],
      });
    } catch (err) {
      console.error('Withdraw funds failed:', err);
      throw err;
    } finally {
      setIsPending(false);
    }
  };

  /**
   * Rescue tokens sent to contract by mistake (owner only)
   */
  const rescueTokens = async (tokenAddress: string) => {
    if (!address) {
      throw new Error('Wallet not connected');
    }

    setIsPending(true);

    try {
      await writeContract({
        address: LAUNCHPAD_PROXY_ADDRESS as `0x${string}`,
        abi: LaunchpadABI,
        functionName: 'rescueTokens',
        args: [tokenAddress],
      });
    } catch (err) {
      console.error('Rescue tokens failed:', err);
      throw err;
    } finally {
      setIsPending(false);
    }
  };

  return {
    closeICO,
    withdrawFunds,
    rescueTokens,
    isPending: isPending || isConfirming,
    isSuccess,
    error,
    hash,
  };
}
