// React hook for fetching ICO data with caching

'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchICO, fetchAllICOs } from '@/lib/launchpad/ico';
import type { IIcoInfoWithKey } from '@/lib/launchpad/types';

/**
 * Hook to fetch a specific ICO by index
 */
export function useICOData(icoId: number | null) {
  return useQuery({
    queryKey: ['ico', icoId],
    queryFn: () => {
      if (icoId === null) return null;
      return fetchICO(icoId);
    },
    enabled: icoId !== null,
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refetch every minute for live ICOs
  });
}

/**
 * Hook to fetch all ICOs
 */
export function useAllICOs() {
  return useQuery<IIcoInfoWithKey[]>({
    queryKey: ['icos', 'all'],
    queryFn: fetchAllICOs,
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refetch every minute
  });
}
