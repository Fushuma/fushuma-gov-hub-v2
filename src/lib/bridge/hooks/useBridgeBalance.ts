/**
 * Bridge Balance Hook
 * Handles token balance queries for bridge operations.
 *
 * Reads are pinned to the given chain so balances display correctly
 * even when the wallet is connected to a different network.
 */

import { useAccount, useBalance, useReadContract } from 'wagmi';
import { formatUnits } from 'viem';
import ERC20ABI from '../abis/erc20.json';
import { isNativeTokenAddress } from '../constants/bridgeTokens';

export function useBridgeBalance(
  tokenAddress: `0x${string}` | undefined,
  decimals: number = 18,
  chainId?: number
) {
  const { address: account } = useAccount();

  const isNative = !tokenAddress || isNativeTokenAddress(tokenAddress);

  // For native coins (no address or the 0x...0001 marker)
  const { data: nativeBalance, refetch: refetchNative } = useBalance({
    address: account,
    chainId,
    query: {
      enabled: isNative && Boolean(account)
    }
  });

  // For ERC20 tokens
  const { data: tokenBalance, refetch: refetchToken } = useReadContract({
    address: tokenAddress,
    abi: ERC20ABI,
    functionName: 'balanceOf',
    args: account ? [account] : undefined,
    chainId,
    query: {
      enabled: !isNative && Boolean(tokenAddress && account)
    }
  });

  // Format balance
  const balance = isNative
    ? nativeBalance
      ? formatUnits(nativeBalance.value, decimals)
      : '0'
    : tokenBalance
      ? formatUnits(tokenBalance as bigint, decimals)
      : '0';

  const balanceRaw = isNative
    ? nativeBalance?.value || 0n
    : (tokenBalance as bigint) || 0n;

  return {
    balance,
    balanceRaw,
    refetchBalance: isNative ? refetchNative : refetchToken,
    isLoading: false
  };
}
