/**
 * Bridge Allowance Hook
 * Handles token approval for bridge operations.
 *
 * Native coins (the 0x...0001 marker) never need approval - the amount
 * is attached as msg.value. ERC20 reads/writes are pinned to the source
 * chain.
 */

import { useCallback, useEffect, useState } from 'react';
import { useAccount, useReadContract, useWriteContract, useConfig } from 'wagmi';
import { waitForTransactionReceipt } from 'wagmi/actions';
import { toast } from 'sonner';
import { parseUnits, maxUint256 } from 'viem';
import { getBridgeAddress } from '../constants/bridgeContracts';
import ERC20ABI from '../abis/erc20.json';
import { isNativeTokenAddress } from '../constants/bridgeTokens';
import { useBridgeStore } from '../stores/bridgeStore';

export function useBridgeAllowance(
  tokenAddress: `0x${string}` | undefined,
  amount: string,
  decimals: number,
  chainId?: number
) {
  const { address: account } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const config = useConfig();
  const { setIsApproving } = useBridgeStore();
  const [allowance, setAllowance] = useState<bigint>(0n);
  const [isApproved, setIsApproved] = useState(false);

  const isNative = isNativeTokenAddress(tokenAddress);
  const bridgeAddress = getBridgeAddress(chainId);

  // Read current allowance on the source chain
  const { data: allowanceData, refetch: refetchAllowance } = useReadContract({
    address: tokenAddress,
    abi: ERC20ABI,
    functionName: 'allowance',
    args: account && bridgeAddress ? [account, bridgeAddress] : undefined,
    chainId,
    query: {
      enabled: Boolean(tokenAddress && !isNative && account && bridgeAddress)
    }
  });

  // Update allowance state
  useEffect(() => {
    if (isNative) {
      setIsApproved(true);
      return;
    }
    if (allowanceData !== undefined) {
      const allowanceBigInt = allowanceData as bigint;
      setAllowance(allowanceBigInt);

      // Check if approved for current amount
      if (amount && decimals) {
        try {
          const amountBigInt = parseUnits(amount, decimals);
          setIsApproved(allowanceBigInt >= amountBigInt);
        } catch {
          setIsApproved(false);
        }
      } else {
        setIsApproved(false);
      }
    }
  }, [allowanceData, amount, decimals, isNative]);

  /**
   * Approve token spending
   */
  const approve = useCallback(
    async (approveAmount?: string) => {
      if (isNative) return true;

      if (!account) {
        toast.error('Please connect your wallet');
        return false;
      }

      if (!chainId) {
        toast.error('Network not detected');
        return false;
      }

      if (!tokenAddress) {
        toast.error('Token address not found');
        return false;
      }

      if (!bridgeAddress) {
        toast.error('Bridge contract not found for this network');
        return false;
      }

      try {
        setIsApproving(true);
        toast.loading('Approving token...', { id: 'approve-loading' });

        // Use max uint256 for unlimited approval, or specific amount
        const approvalAmount = approveAmount
          ? parseUnits(approveAmount, decimals)
          : maxUint256;

        // Execute approval transaction on the source chain
        const hash = await writeContractAsync({
          address: tokenAddress,
          abi: ERC20ABI,
          functionName: 'approve',
          args: [bridgeAddress, approvalAmount],
          chainId
        });

        // Wait for transaction confirmation
        await waitForTransactionReceipt(config, { hash, chainId });

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
      isNative,
      account,
      chainId,
      tokenAddress,
      bridgeAddress,
      decimals,
      writeContractAsync,
      config,
      refetchAllowance,
      setIsApproving
    ]
  );

  /**
   * Check if needs approval
   */
  const needsApproval = useCallback(
    (checkAmount: string): boolean => {
      if (isNative) return false;
      if (!checkAmount || !decimals) return false;

      try {
        const amountBigInt = parseUnits(checkAmount, decimals);
        return allowance < amountBigInt;
      } catch {
        return false;
      }
    },
    [isNative, allowance, decimals]
  );

  return {
    allowance,
    isApproved,
    approve,
    needsApproval,
    refetchAllowance
  };
}
