// React hook for purchasing tokens from ICO

'use client';

import { useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, parseUnits } from 'viem';
import LaunchpadABI from '@/config/abis/Launchpad.json';
import { LAUNCHPAD_PROXY_ADDRESS } from '@/lib/launchpad/contracts';

export function useTokenPurchase() {
  const { address } = useAccount();
  const [isPending, setIsPending] = useState(false);
  const { writeContract, data: hash, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const buyTokens = async (
    icoId: number,
    amount: bigint,
    paymentValue: bigint,
    isNativePayment: boolean
  ) => {
    if (!address) {
      throw new Error('Wallet not connected');
    }

    setIsPending(true);

    try {
      await writeContract({
        address: LAUNCHPAD_PROXY_ADDRESS as `0x${string}`,
        abi: LaunchpadABI,
        functionName: 'buy',
        args: [icoId, amount],
        value: isNativePayment ? paymentValue : 0n,
      });
    } catch (err) {
      console.error('Purchase failed:', err);
      throw err;
    } finally {
      setIsPending(false);
    }
  };

  return {
    buyTokens,
    isPending: isPending || isConfirming,
    isSuccess,
    error,
    hash,
  };
}
