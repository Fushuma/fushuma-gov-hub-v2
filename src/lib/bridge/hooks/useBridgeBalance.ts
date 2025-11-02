/**
 * Bridge Balance Hook
 * Handles token balance queries for bridge operations
 */

import { useAccount, useBalance, useReadContract } from 'wagmi';
import { formatUnits } from 'viem';
import ERC20ABI from '../abis/erc20.json';

export function useBridgeBalance(
  tokenAddress: `0x${string}` | undefined,
  decimals: number = 18
) {
  const { address: account, chainId } = useAccount();

  // For native token (empty address)
  const { data: nativeBalance } = useBalance({
    address: account,
    query: {
      enabled: !tokenAddress && Boolean(account)
    }
  });

  // For ERC20 tokens
  const { data: tokenBalance, refetch: refetchBalance } = useReadContract({
    address: tokenAddress,
    abi: ERC20ABI,
    functionName: 'balanceOf',
    args: account ? [account] : undefined,
    query: {
      enabled: Boolean(tokenAddress && account)
    }
  });

  // Format balance
  const balance = tokenAddress
    ? tokenBalance
      ? formatUnits(tokenBalance as bigint, decimals)
      : '0'
    : nativeBalance
    ? formatUnits(nativeBalance.value, decimals)
    : '0';

  const balanceRaw = tokenAddress
    ? (tokenBalance as bigint) || 0n
    : nativeBalance?.value || 0n;

  return {
    balance,
    balanceRaw,
    refetchBalance,
    isLoading: false
  };
}

/**
 * Hook to get balances for multiple tokens
 */
export function useBridgeBalances(
  tokens: Array<{ address: `0x${string}` | undefined; decimals: number }>
) {
  const { address: account } = useAccount();

  const balances = tokens.map((token) => {
    const { balance, balanceRaw } = useBridgeBalance(token.address, token.decimals);
    return {
      address: token.address,
      balance,
      balanceRaw
    };
  });

  return balances;
}
