import { useState, useEffect } from 'react';
import type { Address } from 'viem';
import { getPool, getAllPools, type Pool, FeeAmount } from '../pools';

/**
 * Hook to fetch all pools
 */
export function usePools() {
  const [pools, setPools] = useState<Pool[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchPools = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const allPools = await getAllPools();
      setPools(allPools);
    } catch (err) {
      setError(err as Error);
      console.error('Error fetching pools:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPools();
  }, []);

  return {
    pools,
    isLoading,
    error,
    refetch: fetchPools,
  };
}

/**
 * Hook to fetch a specific pool
 */
export function usePool(
  token0: Address | undefined,
  token1: Address | undefined,
  fee: FeeAmount | undefined
) {
  const [pool, setPool] = useState<Pool | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchPool = async () => {
    if (!token0 || !token1 || fee === undefined) {
      setPool(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const poolData = await getPool(token0, token1, fee);
      setPool(poolData);
    } catch (err) {
      setError(err as Error);
      console.error('Error fetching pool:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPool();
  }, [token0, token1, fee]);

  return {
    pool,
    isLoading,
    error,
    refetch: fetchPool,
  };
}
