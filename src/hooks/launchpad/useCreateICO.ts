// React hook for creating new ICOs

'use client';

import { useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { parseUnits } from 'viem';
import LaunchpadABI from '@/config/abis/Launchpad.json';
import ERC20ABI from '@/config/abis/ERC20.json';
import { LAUNCHPAD_PROXY_ADDRESS } from '@/lib/launchpad/contracts';

export interface ICOFormData {
  tokenAddress: string;
  paymentToken: string;
  amount: string;
  bonusReserve: string;
  startPrice: string;
  endPrice: string;
  startDate: string;
  endDate: string;
  bonusPercentage: number;
  bonusActivator: number;
  unlockPercentage: number;
  cliffPeriod: number;
  vestingPercentage: number;
  vestingInterval: number;
}

export function useCreateICO() {
  const { address } = useAccount();
  const [isPending, setIsPending] = useState(false);
  const { writeContract, data: hash, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  // Get creation fee
  const { data: creationFee, isLoading: isFeeLoading, error: feeError } = useReadContract({
    address: LAUNCHPAD_PROXY_ADDRESS as `0x${string}`,
    abi: LaunchpadABI,
    functionName: 'creationFee',
  });

  // Approve tokens
  const { writeContract: approveTokens } = useWriteContract();

  const approveICOTokens = async (
    tokenAddress: string,
    amount: bigint
  ): Promise<void> => {
    if (!address) {
      throw new Error('Wallet not connected');
    }

    await approveTokens({
      address: tokenAddress as `0x${string}`,
      abi: ERC20ABI,
      functionName: 'approve',
      args: [LAUNCHPAD_PROXY_ADDRESS, amount],
    });
  };

  const createICO = async (formData: ICOFormData, tokenDecimals: number, paymentDecimals: number) => {
    if (!address) {
      throw new Error('Wallet not connected');
    }

    if (isFeeLoading) {
      throw new Error('Loading creation fee, please wait...');
    }

    if (feeError) {
      throw new Error(`Failed to get creation fee: ${feeError.message}`);
    }

    if (!creationFee) {
      throw new Error('Creation fee not available. Please check your network connection.');
    }

    setIsPending(true);

    try {
      // Parse amounts with correct decimals
      const amountParsed = parseUnits(formData.amount, tokenDecimals);
      const bonusReserveParsed = formData.bonusReserve 
        ? parseUnits(formData.bonusReserve, tokenDecimals) 
        : 0n;
      const startPriceParsed = parseUnits(formData.startPrice, paymentDecimals);
      const endPriceParsed = formData.endPrice 
        ? parseUnits(formData.endPrice, paymentDecimals) 
        : 0n;

      // Approve total tokens (amount + bonus reserve)
      const totalTokens = amountParsed + bonusReserveParsed;
      await approveICOTokens(formData.tokenAddress, totalTokens);

      // Prepare ICO params
      const icoParams = {
        token: formData.tokenAddress,
        paymentToken: formData.paymentToken,
        amount: amountParsed,
        startPrice: startPriceParsed,
        endPrice: endPriceParsed,
        startDate: BigInt(Math.floor(new Date(formData.startDate).getTime() / 1000)),
        endDate: formData.endDate 
          ? BigInt(Math.floor(new Date(formData.endDate).getTime() / 1000)) 
          : 0n,
        bonusReserve: bonusReserveParsed,
        bonusPercentage: BigInt(formData.bonusPercentage),
        bonusActivator: BigInt(formData.bonusActivator),
        vestingParams: {
          unlockPercentage: BigInt(formData.unlockPercentage),
          cliffPeriod: BigInt(formData.cliffPeriod),
          vestingPercentage: BigInt(formData.vestingPercentage),
          vestingInterval: BigInt(formData.vestingInterval),
        },
      };

      // Create ICO
      await writeContract({
        address: LAUNCHPAD_PROXY_ADDRESS as `0x${string}`,
        abi: LaunchpadABI,
        functionName: 'createICO',
        args: [icoParams],
        value: creationFee as bigint,
      });
    } catch (err) {
      console.error('Create ICO failed:', err);
      throw err;
    } finally {
      setIsPending(false);
    }
  };

  return {
    createICO,
    approveICOTokens,
    creationFee,
    isFeeLoading,
    feeError,
    isPending: isPending || isConfirming,
    isSuccess,
    error,
    hash,
  };
}
