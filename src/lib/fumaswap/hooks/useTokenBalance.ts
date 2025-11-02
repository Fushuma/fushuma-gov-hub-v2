import { useReadContract, useAccount } from 'wagmi';
import type { Address } from 'viem';
import ERC20_ABI from '../abis/ERC20.json';

/**
 * Hook to fetch ERC20 token balance for the connected wallet
 */
export function useTokenBalance(tokenAddress: Address | undefined) {
  const { address } = useAccount();

  const { data: balance, isLoading, refetch } = useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!tokenAddress && !!address && tokenAddress !== '0x0000000000000000000000000000000000000000',
    },
  });

  return {
    balance: balance as bigint | undefined,
    isLoading,
    refetch,
  };
}

/**
 * Hook to fetch token allowance for a spender
 */
export function useTokenAllowance(
  tokenAddress: Address | undefined,
  spenderAddress: Address | undefined
) {
  const { address } = useAccount();

  const { data: allowance, isLoading, refetch } = useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address && spenderAddress ? [address, spenderAddress] : undefined,
    query: {
      enabled: 
        !!tokenAddress && 
        !!spenderAddress && 
        !!address &&
        tokenAddress !== '0x0000000000000000000000000000000000000000',
    },
  });

  return {
    allowance: allowance as bigint | undefined,
    isLoading,
    refetch,
  };
}

/**
 * Hook to fetch multiple token balances at once
 */
export function useTokenBalances(tokenAddresses: Address[]) {
  const { address } = useAccount();

  const validAddresses = tokenAddresses.filter(
    (addr) => addr && addr !== '0x0000000000000000000000000000000000000000'
  );

  // This would ideally use multicall for efficiency
  // For now, we'll return a structure that can be expanded
  return {
    balances: {} as Record<Address, bigint>,
    isLoading: false,
    refetch: () => {},
  };
}
