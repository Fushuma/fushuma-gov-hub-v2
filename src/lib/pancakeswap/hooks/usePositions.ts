import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import type { Address } from 'viem';
import { getUserPositions, type Position } from '../pools';

/**
 * Hook to fetch user's liquidity positions
 */
export function usePositions() {
  const { address, isConnected } = useAccount();
  const [positions, setPositions] = useState<Position[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchPositions = async () => {
    if (!address || !isConnected) {
      setPositions([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const userPositions = await getUserPositions(address as Address);
      setPositions(userPositions);
    } catch (err) {
      setError(err as Error);
      console.error('Error fetching positions:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPositions();
  }, [address, isConnected]);

  return {
    positions,
    isLoading,
    error,
    refetch: fetchPositions,
  };
}

/**
 * Hook to get a single position by token ID
 */
export function usePosition(tokenId: string | undefined) {
  const { positions, isLoading, error, refetch } = usePositions();

  const position = positions.find((p) => p.tokenId === tokenId);

  return {
    position,
    isLoading,
    error,
    refetch,
  };
}
