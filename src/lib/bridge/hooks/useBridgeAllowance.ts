/**
 * Bridge Allowance Hook
 * Handles token approval for bridge operations
 * Converted from web3-react to wagmi
 */

import { useCallback, useEffect, useState } from 'react';
import { useAccount, useReadContract, useWriteContract, usePublicClient } from 'wagmi';
import { toast } from 'sonner';
import { parseUnits, maxUint256 } from 'viem';
import { getBridgeAddress } from '../constants/bridgeContracts';
import ERC20ABI from '../abis/erc20.json';
import { useBridgeStore } from '../stores/bridgeStore';

export function useBridgeAllowance(
  tokenAddress: `0x${string}` | undefined,
  amount: string,
  decimals: number
) {
  const { address: account, chainId } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();
  const { setIsApproving } = useBridgeStore();
  const [allowance, setAllowance] = useState<bigint>(0n);
  const [isApproved, setIsApproved] = useState(false);

  const bridgeAddress = getBridgeAddress(chainId);

  // Read current allowance
  const { data: allowanceData, refetch: refetchAllowance } = useReadContract({
    address: tokenAddress,
    abi: ERC20ABI,
    functionName: 'allowance',
    args: account && bridgeAddress ? [account, bridgeAddress] : undefined,
    query: {
      enabled: Boolean(tokenAddress && account && bridgeAddress)
    }
  });

  // Update allowance state
  useEffect(() => {
    if (allowanceData !== undefined) {
      const allowanceBigInt = allowanceData as bigint;
      setAllowance(allowanceBigInt);

      // Check if approved for current amount
      if (amount && decimals) {
        try {
          const amountBigInt = parseUnits(amount, decimals);
          setIsApproved(allowanceBigInt >= amountBigInt);
        } catch (error) {
          setIsApproved(false);
        }
      } else {
        setIsApproved(false);
      }
    }
  }, [allowanceData, amount, decimals]);

  /**
   * Approve token spending
   */
  const approve = useCallback(
    async (approveAmount?: string) => {
      if (!account || !chainId || !tokenAddress || !bridgeAddress) {
        toast.error('Missing required parameters');
        return false;
      }

      try {
        setIsApproving(true);
        toast.loading('Approving token...', { id: 'approve-loading' });

        // Use max uint256 for unlimited approval, or specific amount
        const approvalAmount = approveAmount
          ? parseUnits(approveAmount, decimals)
          : maxUint256;

        // Execute approval transaction
        const hash = await writeContractAsync({
          address: tokenAddress,
          abi: ERC20ABI,
          functionName: 'approve',
          args: [bridgeAddress, approvalAmount]
        });

        // Wait for transaction confirmation
        await publicClient?.waitForTransactionReceipt({ hash });

        // Refetch allowance
        await refetchAllowance();

        toast.success('Token approved successfully!', { id: 'approve-loading' });
        return true;
      } catch (error: any) {
        console.error('Approval error:', error);
        
        if (error.message?.includes('User rejected')) {
          toast.error('Approval rejected', { id: 'approve-loading' });
        } else {
          toast.error('Approval failed', { id: 'approve-loading' });
        }
        
        return false;
      } finally {
        setIsApproving(false);
      }
    },
    [
      account,
      chainId,
      tokenAddress,
      bridgeAddress,
      decimals,
      writeContractAsync,
      publicClient,
      refetchAllowance,
      setIsApproving
    ]
  );

  /**
   * Check if needs approval
   */
  const needsApproval = useCallback(
    (checkAmount: string): boolean => {
      if (!checkAmount || !decimals) return false;
      
      try {
        const amountBigInt = parseUnits(checkAmount, decimals);
        return allowance < amountBigInt;
      } catch (error) {
        return false;
      }
    },
    [allowance, decimals]
  );

  return {
    allowance,
    isApproved,
    approve,
    needsApproval,
    refetchAllowance
  };
}
