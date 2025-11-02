import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import type { Address } from 'viem';
import { parseUnits, maxUint256 } from 'viem';
import ERC20_ABI from '../abis/ERC20.json';
import { useTokenAllowance } from './useTokenBalance';

/**
 * Hook to approve token spending
 */
export function useTokenApprove(
  tokenAddress: Address | undefined,
  spenderAddress: Address | undefined
) {
  const { allowance, refetch: refetchAllowance } = useTokenAllowance(tokenAddress, spenderAddress);
  
  const { 
    data: hash, 
    writeContract, 
    isPending: isApproving,
    error: approveError 
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  /**
   * Approve a specific amount
   */
  const approve = async (amount: bigint) => {
    if (!tokenAddress || !spenderAddress) {
      throw new Error('Token address and spender address are required');
    }

    writeContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [spenderAddress, amount],
    });
  };

  /**
   * Approve maximum amount (infinite approval)
   */
  const approveMax = async () => {
    if (!tokenAddress || !spenderAddress) {
      throw new Error('Token address and spender address are required');
    }

    writeContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [spenderAddress, maxUint256],
    });
  };

  /**
   * Check if approval is needed for a specific amount
   */
  const needsApproval = (amount: bigint): boolean => {
    if (!allowance) return true;
    return allowance < amount;
  };

  return {
    approve,
    approveMax,
    needsApproval,
    allowance,
    isApproving,
    isConfirming,
    isConfirmed,
    approveError,
    refetchAllowance,
    hash,
  };
}
