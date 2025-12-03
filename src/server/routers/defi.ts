import { z } from "zod";
import { router, publicProcedure } from "../_core/trpc";
import { createPublicClient, http, type Address, formatUnits } from 'viem';

/**
 * DeFi Router
 *
 * Provides API endpoints for DeFi data (pools, positions, analytics)
 * Fetches real data from on-chain contracts
 */

// Fushuma chain definition
const fushuma = {
  id: 121224,
  name: 'Fushuma',
  network: 'fushuma',
  nativeCurrency: { decimals: 18, name: 'FUMA', symbol: 'FUMA' },
  rpcUrls: {
    default: { http: ['https://rpc.fushuma.com'] },
    public: { http: ['https://rpc.fushuma.com'] },
  },
} as const;

// Contract addresses
const CL_POOL_MANAGER_ADDRESS = '0x2D691Ff314F7BB2Ce9Aeb94d556440Bb0DdbFe1e';
const CL_POSITION_MANAGER_ADDRESS = '0x750525284ec59F21CF1c03C62A062f6B6473B7b1';

// Known tokens with metadata
const TOKEN_METADATA: Record<string, { symbol: string; name: string; decimals: number }> = {
  '0xbca7b11c788dbb85be92627ef1e60a2a9b7e2c6e': {
    symbol: 'WFUMA',
    name: 'Wrapped FUMA',
    decimals: 18,
  },
  '0x1e11d176117dbedbd234b1c6a10c6eb8dced275e': {
    symbol: 'USDT',
    name: 'Tether USD',
    decimals: 6,
  },
  '0xf8ea5627691e041dae171350e8df13c592084848': {
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
  },
};

// Known pools configuration
const KNOWN_POOLS = [
  {
    token0: '0x1e11d176117dbEDbd234b1c6a10C6eb8dceD275e' as Address, // USDT
    token1: '0xBcA7B11c788dBb85bE92627ef1e60a2A9B7e2c6E' as Address, // WFUMA
    fee: 3000,
    poolId: '0xd10c2ad6aed8e4657623710081889cbb99f85521be73d2c6b9b6d17fd63b97e8',
  },
];

// CLPoolManager ABI
const CLPoolManagerABI = [
  {
    type: 'function',
    name: 'getSlot0',
    inputs: [{ name: 'id', type: 'bytes32' }],
    outputs: [
      { name: 'sqrtPriceX96', type: 'uint160' },
      { name: 'tick', type: 'int24' },
      { name: 'protocolFee', type: 'uint24' },
      { name: 'lpFee', type: 'uint24' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getLiquidity',
    inputs: [{ name: 'id', type: 'bytes32' }],
    outputs: [{ name: 'liquidity', type: 'uint128' }],
    stateMutability: 'view',
  },
] as const;

// CLPositionManager ABI
const CLPositionManagerABI = [
  {
    type: 'function',
    name: 'balanceOf',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'nextTokenId',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'ownerOf',
    inputs: [{ name: 'id', type: 'uint256' }],
    outputs: [{ name: 'owner', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'positions',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [
      {
        name: 'poolKey',
        type: 'tuple',
        components: [
          { name: 'currency0', type: 'address' },
          { name: 'currency1', type: 'address' },
          { name: 'hooks', type: 'address' },
          { name: 'poolManager', type: 'address' },
          { name: 'fee', type: 'uint24' },
          { name: 'parameters', type: 'bytes32' },
        ],
      },
      { name: 'tickLower', type: 'int24' },
      { name: 'tickUpper', type: 'int24' },
      { name: 'liquidity', type: 'uint128' },
      { name: 'feeGrowthInside0LastX128', type: 'uint256' },
      { name: 'feeGrowthInside1LastX128', type: 'uint256' },
      { name: '_subscriber', type: 'address' },
    ],
    stateMutability: 'view',
  },
] as const;

// Helper to get token metadata
function getTokenMeta(address: string) {
  return TOKEN_METADATA[address.toLowerCase()] || { symbol: 'UNKNOWN', name: 'Unknown Token', decimals: 18 };
}

// Calculate price from sqrtPriceX96
function sqrtPriceX96ToPrice(sqrtPriceX96: bigint, decimals0: number, decimals1: number): number {
  const Q96 = BigInt(2) ** BigInt(96);
  const price = Number(sqrtPriceX96 * sqrtPriceX96 * BigInt(10 ** decimals0)) / Number(Q96 * Q96 * BigInt(10 ** decimals1));
  return price;
}

// Create public client
function getPublicClient() {
  return createPublicClient({
    chain: fushuma as any,
    transport: http(),
  });
}

export const defiRouter = router({
  /**
   * Get all pools with pagination - fetches real on-chain data
   */
  getPools: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
        orderBy: z.enum(['tvl', 'volume24h', 'apr']).default('tvl'),
      })
    )
    .query(async ({ input }) => {
      const client = getPublicClient();
      const pools = [];

      for (const knownPool of KNOWN_POOLS) {
        try {
          // Fetch pool state from chain
          const [slot0, liquidity] = await Promise.all([
            client.readContract({
              address: CL_POOL_MANAGER_ADDRESS as Address,
              abi: CLPoolManagerABI,
              functionName: 'getSlot0',
              args: [knownPool.poolId as `0x${string}`],
            }),
            client.readContract({
              address: CL_POOL_MANAGER_ADDRESS as Address,
              abi: CLPoolManagerABI,
              functionName: 'getLiquidity',
              args: [knownPool.poolId as `0x${string}`],
            }),
          ]);

          const [sqrtPriceX96, tick] = slot0;
          const token0Meta = getTokenMeta(knownPool.token0);
          const token1Meta = getTokenMeta(knownPool.token1);

          // Calculate current price
          const price = sqrtPriceX96ToPrice(sqrtPriceX96, token0Meta.decimals, token1Meta.decimals);

          // Estimate TVL from liquidity (simplified - would need token prices for accurate USD value)
          const liquidityNum = Number(formatUnits(liquidity, 18));
          const estimatedTvl = liquidityNum > 0 ? (liquidityNum * 0.001).toFixed(2) : '0'; // Rough estimate

          pools.push({
            id: knownPool.poolId,
            token0: {
              address: knownPool.token0,
              symbol: token0Meta.symbol,
              name: token0Meta.name,
              decimals: token0Meta.decimals,
            },
            token1: {
              address: knownPool.token1,
              symbol: token1Meta.symbol,
              name: token1Meta.name,
              decimals: token1Meta.decimals,
            },
            fee: knownPool.fee,
            feeTier: `${(knownPool.fee / 10000).toFixed(2)}%`,
            liquidity: liquidity.toString(),
            sqrtPriceX96: sqrtPriceX96.toString(),
            tick: Number(tick),
            price: price.toFixed(8),
            tvl: estimatedTvl,
            volume24h: '0', // Would need event indexing
            apr: 0, // Would need fee/volume data
          });
        } catch (error) {
          console.error(`Error fetching pool ${knownPool.poolId}:`, error);
        }
      }

      // Apply pagination
      const paginatedPools = pools.slice(input.offset, input.offset + input.limit);

      return {
        pools: paginatedPools,
        total: pools.length,
      };
    }),

  /**
   * Get a specific pool by tokens and fee
   */
  getPool: publicProcedure
    .input(
      z.object({
        token0: z.string(),
        token1: z.string(),
        fee: z.number(),
      })
    )
    .query(async ({ input }) => {
      const client = getPublicClient();

      // Find matching known pool
      const knownPool = KNOWN_POOLS.find(p => {
        const t0 = input.token0.toLowerCase();
        const t1 = input.token1.toLowerCase();
        const p0 = p.token0.toLowerCase();
        const p1 = p.token1.toLowerCase();
        return ((t0 === p0 && t1 === p1) || (t0 === p1 && t1 === p0)) && p.fee === input.fee;
      });

      if (!knownPool) {
        return null;
      }

      try {
        const [slot0, liquidity] = await Promise.all([
          client.readContract({
            address: CL_POOL_MANAGER_ADDRESS as Address,
            abi: CLPoolManagerABI,
            functionName: 'getSlot0',
            args: [knownPool.poolId as `0x${string}`],
          }),
          client.readContract({
            address: CL_POOL_MANAGER_ADDRESS as Address,
            abi: CLPoolManagerABI,
            functionName: 'getLiquidity',
            args: [knownPool.poolId as `0x${string}`],
          }),
        ]);

        const [sqrtPriceX96, tick] = slot0;
        const token0Meta = getTokenMeta(knownPool.token0);
        const token1Meta = getTokenMeta(knownPool.token1);
        const price = sqrtPriceX96ToPrice(sqrtPriceX96, token0Meta.decimals, token1Meta.decimals);

        return {
          id: knownPool.poolId,
          token0: { address: knownPool.token0, ...token0Meta },
          token1: { address: knownPool.token1, ...token1Meta },
          fee: knownPool.fee,
          feeTier: `${(knownPool.fee / 10000).toFixed(2)}%`,
          liquidity: liquidity.toString(),
          sqrtPriceX96: sqrtPriceX96.toString(),
          tick: Number(tick),
          price: price.toFixed(8),
          tvl: '0',
          volume24h: '0',
          apr: 0,
        };
      } catch (error) {
        console.error('Error fetching pool:', error);
        return null;
      }
    }),

  /**
   * Get user's liquidity positions - fetches real on-chain data
   */
  getUserPositions: publicProcedure
    .input(
      z.object({
        address: z.string(),
      })
    )
    .query(async ({ input }) => {
      const client = getPublicClient();
      const userAddress = input.address as Address;

      try {
        // Check user's position balance
        const balance = await client.readContract({
          address: CL_POSITION_MANAGER_ADDRESS as Address,
          abi: CLPositionManagerABI,
          functionName: 'balanceOf',
          args: [userAddress],
        });

        if (balance === 0n) {
          return [];
        }

        // Get next token ID to know the range to search
        const nextTokenId = await client.readContract({
          address: CL_POSITION_MANAGER_ADDRESS as Address,
          abi: CLPositionManagerABI,
          functionName: 'nextTokenId',
          args: [],
        });

        const positions = [];

        // Iterate through token IDs to find user's positions
        for (let tokenId = 1n; tokenId < nextTokenId; tokenId++) {
          try {
            const owner = await client.readContract({
              address: CL_POSITION_MANAGER_ADDRESS as Address,
              abi: CLPositionManagerABI,
              functionName: 'ownerOf',
              args: [tokenId],
            });

            if (owner.toLowerCase() !== userAddress.toLowerCase()) {
              continue;
            }

            // Fetch position details
            const positionData = await client.readContract({
              address: CL_POSITION_MANAGER_ADDRESS as Address,
              abi: CLPositionManagerABI,
              functionName: 'positions',
              args: [tokenId],
            });

            const [poolKey, tickLower, tickUpper, liquidity] = positionData;
            const token0Meta = getTokenMeta(poolKey.currency0);
            const token1Meta = getTokenMeta(poolKey.currency1);

            positions.push({
              tokenId: tokenId.toString(),
              owner: userAddress,
              pool: {
                token0: { address: poolKey.currency0, ...token0Meta },
                token1: { address: poolKey.currency1, ...token1Meta },
                fee: Number(poolKey.fee),
              },
              tickLower: Number(tickLower),
              tickUpper: Number(tickUpper),
              liquidity: liquidity.toString(),
              inRange: true, // Would need current tick to determine
            });
          } catch {
            // Token might not exist or be burned
            continue;
          }
        }

        return positions;
      } catch (error) {
        console.error('Error fetching user positions:', error);
        return [];
      }
    }),

  /**
   * Get pool analytics (historical data)
   * Note: Requires event indexing for full historical data
   */
  getPoolAnalytics: publicProcedure
    .input(
      z.object({
        poolId: z.string(),
        period: z.enum(['1d', '7d', '30d', '90d']).default('7d'),
      })
    )
    .query(async ({ input }) => {
      // Generate placeholder data points based on period
      const periodDays = { '1d': 1, '7d': 7, '30d': 30, '90d': 90 }[input.period];
      const now = Date.now();
      const dayMs = 24 * 60 * 60 * 1000;

      const dataPoints = [];
      for (let i = periodDays; i >= 0; i--) {
        dataPoints.push({
          timestamp: now - (i * dayMs),
          date: new Date(now - (i * dayMs)).toISOString().split('T')[0],
        });
      }

      return {
        poolId: input.poolId,
        period: input.period,
        tvl: dataPoints.map(d => ({ ...d, value: '0' })),
        volume: dataPoints.map(d => ({ ...d, value: '0' })),
        fees: dataPoints.map(d => ({ ...d, value: '0' })),
        note: 'Historical data requires subgraph deployment for accurate tracking',
      };
    }),

  /**
   * Get global DeFi statistics - aggregates from known pools
   */
  getGlobalStats: publicProcedure.query(async () => {
    const client = getPublicClient();
    let totalLiquidity = 0n;

    for (const pool of KNOWN_POOLS) {
      try {
        const liquidity = await client.readContract({
          address: CL_POOL_MANAGER_ADDRESS as Address,
          abi: CLPoolManagerABI,
          functionName: 'getLiquidity',
          args: [pool.poolId as `0x${string}`],
        });
        totalLiquidity += liquidity;
      } catch (error) {
        console.error(`Error fetching liquidity for pool ${pool.poolId}:`, error);
      }
    }

    const liquidityFormatted = formatUnits(totalLiquidity, 18);
    const estimatedTvl = (parseFloat(liquidityFormatted) * 0.001).toFixed(2);

    return {
      totalValueLocked: estimatedTvl,
      totalVolume24h: '0', // Requires event indexing
      totalFees24h: '0', // Requires event indexing
      poolCount: KNOWN_POOLS.length,
      transactionCount: 0, // Requires event indexing
      activePools: KNOWN_POOLS.length,
    };
  }),

  /**
   * Get top tokens by volume
   */
  getTopTokens: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(10),
      })
    )
    .query(async ({ input }) => {
      // Return known tokens with basic info
      const tokens = Object.entries(TOKEN_METADATA).map(([address, meta]) => ({
        address,
        symbol: meta.symbol,
        name: meta.name,
        decimals: meta.decimals,
        volume24h: '0', // Requires event indexing
        priceUSD: '0', // Requires price oracle
        priceChange24h: 0,
      }));

      return tokens.slice(0, input.limit);
    }),

  /**
   * Get recent transactions
   * Note: Requires event indexing for real transaction data
   */
  getRecentTransactions: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        type: z.enum(['all', 'swap', 'mint', 'burn']).default('all'),
      })
    )
    .query(async ({ input }) => {
      // This would require indexing Swap, Mint, Burn events from the contracts
      // For now, return empty with a note
      return {
        transactions: [],
        note: 'Transaction history requires event indexing. Deploy a subgraph for full transaction tracking.',
      };
    }),

  /**
   * Search pools by token symbol or address
   */
  searchPools: publicProcedure
    .input(
      z.object({
        query: z.string().min(1),
        limit: z.number().min(1).max(20).default(10),
      })
    )
    .query(async ({ input }) => {
      const searchQuery = input.query.toLowerCase();

      // Search through known pools
      const matchingPools = KNOWN_POOLS.filter(pool => {
        const token0Meta = getTokenMeta(pool.token0);
        const token1Meta = getTokenMeta(pool.token1);

        return (
          pool.token0.toLowerCase().includes(searchQuery) ||
          pool.token1.toLowerCase().includes(searchQuery) ||
          token0Meta.symbol.toLowerCase().includes(searchQuery) ||
          token1Meta.symbol.toLowerCase().includes(searchQuery) ||
          token0Meta.name.toLowerCase().includes(searchQuery) ||
          token1Meta.name.toLowerCase().includes(searchQuery)
        );
      });

      return matchingPools.slice(0, input.limit).map(pool => {
        const token0Meta = getTokenMeta(pool.token0);
        const token1Meta = getTokenMeta(pool.token1);

        return {
          id: pool.poolId,
          token0: { address: pool.token0, ...token0Meta },
          token1: { address: pool.token1, ...token1Meta },
          fee: pool.fee,
          feeTier: `${(pool.fee / 10000).toFixed(2)}%`,
        };
      });
    }),
});

export type DefiRouter = typeof defiRouter;
