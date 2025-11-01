// React hook for fetching user purchase history

'use client';

import { useQuery } from '@tanstack/react-query';
import { useAccount } from 'wagmi';
import { getVestingInfoAsPurchases } from '@/lib/launchpad/ico';
import type { IUserPurchaseWithKey } from '@/lib/launchpad/types';

/**
 * Hook to fetch user's purchase history for a specific ICO
 */
export function usePurchaseHistory(
  icoId: string | null,
  vestingContractAddress: string | null,
  unlockPercentage: number
) {
  const { address } = useAccount();

  return useQuery<IUserPurchaseWithKey[]>({
    queryKey: ['purchases', address, icoId, vestingContractAddress],
    queryFn: async () => {
      if (!address || !icoId || !vestingContractAddress) {
        return [];
      }
      return getVestingInfoAsPurchases(
        vestingContractAddress,
        address,
        icoId,
        unlockPercentage
      );
    },
    enabled: !!address && !!icoId && !!vestingContractAddress,
    staleTime: 10000, // 10 seconds
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}
