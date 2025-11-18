/**
 * FumaSwap V4 Pool Utilities
 * 
 * Integration layer for pool and liquidity operations
 * Now with actual on-chain queries
 */

import { FeeAmount, TICK_SPACINGS, CL_POOL_MANAGER_ADDRESS } from './contracts';
export { FeeAmount };
import { isPlaceholderAddress } from './tokens';
import type { Address } from 'viem';
import { createPublicClient, http } from 'viem';
import { defineChain } from 'viem';
import { getParametersForFee } from './poolKeyHelper';
import { STATIC_POOLS } from './staticPools';

// Define Fushuma chain
const fushuma = defineChain({
  id: 121224,
  name: 'Fushuma',
  network: 'fushuma',
  nativeCurrency: {
    decimals: 18,
    name: 'FUMA',
    symbol: 'FUMA',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.fushuma.com'],
    },
    public: {
      http: ['https://rpc.fushuma.com'],
    },
  },
});

// CLPoolManager ABI (minimal for reading pool data)
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

export interface Pool {
  id: string;
  token0: Address;
  token1: Address;
  token0Symbol: string;
  token1Symbol: string;
  fee: FeeAmount;
  liquidity: string;
  sqrtPriceX96: string;
  tick: number;
  tvl: string;
  volume24h: string;
  apr: number;
}

export interface Position {
  tokenId: string;
  owner: Address;
  token0: Address;
  token1: Address;
  token0Symbol: string;
  token1Symbol: string;
  fee: FeeAmount;
  tickLower: number;
  tickUpper: number;
  liquidity: string;
  tokensOwed0: string;
  tokensOwed1: string;
  feeGrowthInside0LastX128: string;
  feeGrowthInside1LastX128: string;
}

export interface PositionValue {
  amount0: string;
  amount1: string;
  fees0: string;
  fees1: string;
  totalValue: string;
}

/**
 * Calculate pool ID from pool key
 * This is how PancakeSwap V4 generates deterministic pool IDs
 */
function getPoolId(poolKey: {
  currency0: Address;
  currency1: Address;
  hooks: Address;
  poolManager: Address;
  fee: number;
  parameters: `0x${string}`;
}): `0x${string}` {
  // Pool ID is keccak256 of abi.encode(poolKey)
  const { keccak256, encodeAbiParameters, parseAbiParameters } = require('viem');
  
  const encoded = encodeAbiParameters(
    parseAbiParameters('address, address, address, address, uint24, bytes32'),
    [
      poolKey.currency0,
      poolKey.currency1,
      poolKey.hooks,
      poolKey.poolManager,
      poolKey.fee,
      poolKey.parameters,
    ]
  );
  
  return keccak256(encoded);
}

/**
 * Get pool data from the blockchain
 */
export async function getPool(
  token0: Address,
  token1: Address,
  fee: FeeAmount
): Promise<Pool | null> {
  try {
    const publicClient = createPublicClient({
      chain: fushuma,
      transport: http(),
    });

    // Sort tokens (required by Uniswap V3/V4)
    const [currency0, currency1] = token0.toLowerCase() < token1.toLowerCase()
      ? [token0, token1]
      : [token1, token0];

    // Build pool key with correct parameters
    const poolKey = {
      currency0,
      currency1,
      hooks: '0x0000000000000000000000000000000000000000' as Address,
      poolManager: CL_POOL_MANAGER_ADDRESS as Address,
      fee,
      parameters: getParametersForFee(fee),
    };

    // Calculate pool ID
    const poolId = getPoolId(poolKey);

    // Query pool slot0
    const slot0 = await publicClient.readContract({
      address: CL_POOL_MANAGER_ADDRESS as Address,
      abi: CLPoolManagerABI,
      functionName: 'getSlot0',
      args: [poolId],
    });

    const [sqrtPriceX96, tick, protocolFee, lpFee] = slot0;

    // If sqrtPriceX96 is 0, pool doesn't exist
    if (sqrtPriceX96 === 0n) {
      return null;
    }

    // Query pool liquidity
    const liquidity = await publicClient.readContract({
      address: CL_POOL_MANAGER_ADDRESS as Address,
      abi: CLPoolManagerABI,
      functionName: 'getLiquidity',
      args: [poolId],
    });

    // Get token symbols (simplified - you may want to query from token contracts)
    const token0Symbol = currency0 === '0xBcA7B11c788dBb85bE92627ef1e60a2A9B7e2c6E' ? 'WFUMA' :
                         currency0 === '0x1e11d176117dbEDbd234b1c6a10C6eb8dceD275e' ? 'USDT' :
                         currency0 === '0xf8EA5627691E041dae171350E8Df13c592084848' ? 'USDC' : 'UNKNOWN';
    
    const token1Symbol = currency1 === '0xBcA7B11c788dBb85bE92627ef1e60a2A9B7e2c6E' ? 'WFUMA' :
                         currency1 === '0x1e11d176117dbEDbd234b1c6a10C6eb8dceD275e' ? 'USDT' :
                         currency1 === '0xf8EA5627691E041dae171350E8Df13c592084848' ? 'USDC' : 'UNKNOWN';

    return {
      id: poolId,
      token0: currency0,
      token1: currency1,
      token0Symbol,
      token1Symbol,
      fee,
      liquidity: liquidity.toString(),
      sqrtPriceX96: sqrtPriceX96.toString(),
      tick: Number(tick),
      tvl: '0', // TODO: Calculate from liquidity and price
      volume24h: '0', // TODO: Query from events or subgraph
      apr: 0, // TODO: Calculate from volume and fees
    };
  } catch (error) {
    console.error('Error fetching pool:', error);
    return null;
  }
}

/**
 * Get all known pools
 * 
 * For now, we'll hardcode the known pools and query their data
 * In the future, this should query a subgraph or index events
 */
export async function getAllPools(): Promise<Pool[]> {
  try {
    // For now, return static pools since RPC connection may be slow/unreliable
    // TODO: Re-enable dynamic fetching when RPC is stable
    console.log('Returning static pools (RPC fetching disabled temporarily)');
    return STATIC_POOLS;
    
    /* Dynamic fetching - re-enable when RPC is stable
    const knownPools = [
      {
        token0: '0x1e11d176117dbEDbd234b1c6a10C6eb8dceD275e' as Address, // USDT
        token1: '0xBcA7B11c788dBb85bE92627ef1e60a2A9B7e2c6E' as Address, // WFUMA
        fee: 3000 as FeeAmount,
      },
      {
        token0: '0xBcA7B11c788dBb85bE92627ef1e60a2A9B7e2c6E' as Address, // WFUMA
        token1: '0xf8EA5627691E041dae171350E8Df13c592084848' as Address, // USDC
        fee: 3000 as FeeAmount,
      },
    ];

    const pools: Pool[] = [];

    for (const { token0, token1, fee } of knownPools) {
      const pool = await getPool(token0, token1, fee);
      if (pool) {
        pools.push(pool);
      }
    }

    return pools;
    */
  } catch (error) {
    console.error('Error fetching pools:', error);
    return STATIC_POOLS; // Fallback to static pools
  }
}

/**
 * Get user's liquidity positions
 * 
 * TODO: Implement after CLPositionManager is integrated
 */
export async function getUserPositions(address: Address): Promise<Position[]> {
  try {
    // TODO: Call CLPositionManager.balanceOf() and positions()
    return [];
  } catch (error) {
    console.error('Error fetching user positions:', error);
    return [];
  }
}

/**
 * Calculate position value in tokens
 * 
 * TODO: Implement proper calculation
 */
export function calculatePositionValue(position: Position): PositionValue {
  return {
    amount0: '0',
    amount1: '0',
    fees0: '0',
    fees1: '0',
    totalValue: '0',
  };
}

/**
 * Get nearest usable tick for a price
 */
export function getNearestUsableTick(tick: number, tickSpacing: number): number {
  const rounded = Math.round(tick / tickSpacing) * tickSpacing;
  
  const MIN_TICK = -887272;
  const MAX_TICK = 887272;
  
  if (rounded < MIN_TICK) return MIN_TICK;
  if (rounded > MAX_TICK) return MAX_TICK;
  
  return rounded;
}

/**
 * Calculate tick from price
 */
export function priceToTick(price: number): number {
  return Math.floor(Math.log(price) / Math.log(1.0001));
}

/**
 * Calculate price from tick
 */
export function tickToPrice(tick: number): number {
  return Math.pow(1.0001, tick);
}

/**
 * Calculate TVL for a pool
 * 
 * TODO: Implement after price oracle is available
 */
export function calculatePoolTVL(pool: Pool): string {
  return pool.tvl || '0';
}

/**
 * Calculate APR for a pool based on volume and fees
 */
export function calculatePoolAPR(pool: Pool, volume24h: string): number {
  try {
    const tvl = parseFloat(pool.tvl);
    const volume = parseFloat(volume24h);
    
    if (tvl === 0) return 0;
    
    const feePercentage = pool.fee / 1000000;
    const dailyFees = volume * feePercentage;
    const annualFees = dailyFees * 365;
    const apr = (annualFees / tvl) * 100;
    
    return apr;
  } catch (error) {
    return 0;
  }
}

/**
 * Format fee amount as percentage
 */
export function formatFee(fee: FeeAmount): string {
  return `${(fee / 10000).toFixed(2)}%`;
}

/**
 * Get fee tier name
 */
export function getFeeTierName(fee: FeeAmount): string {
  switch (fee) {
    case FeeAmount.LOWEST:
      return '0.01% - Best for stablecoins';
    case FeeAmount.LOW:
      return '0.05% - Best for stable pairs';
    case FeeAmount.MEDIUM:
      return '0.25% - Best for most pairs';
    case FeeAmount.HIGH:
      return '1% - Best for exotic pairs';
    default:
      return 'Unknown';
  }
}

/**
 * Check if pool exists
 */
export async function poolExists(
  token0: Address,
  token1: Address,
  fee: FeeAmount
): Promise<boolean> {
  const pool = await getPool(token0, token1, fee);
  return pool !== null;
}

/**
 * Get pool address (deterministic)
 * 
 * For V4, pools don't have individual addresses - they're managed by CLPoolManager
 * Pool ID is used instead
 */
export function getPoolAddress(
  token0: Address,
  token1: Address,
  fee: FeeAmount
): Address {
  // V4 pools are managed by CLPoolManager, not individual contracts
  return CL_POOL_MANAGER_ADDRESS as Address;
}

/**
 * Estimate liquidity from token amounts
 * 
 * TODO: Implement proper liquidity calculation
 */
export function estimateLiquidity(
  amount0: bigint,
  amount1: bigint,
  tickLower: number,
  tickUpper: number,
  currentTick: number
): bigint {
  return BigInt(0);
}

/**
 * Calculate token amounts from liquidity
 * 
 * TODO: Implement proper amount calculation
 */
export function calculateTokenAmounts(
  liquidity: bigint,
  tickLower: number,
  tickUpper: number,
  currentTick: number
): { amount0: bigint; amount1: bigint } {
  return {
    amount0: BigInt(0),
    amount1: BigInt(0),
  };
}
