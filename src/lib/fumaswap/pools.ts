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
  fee: FeeAmount | number;
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
  // Pool state data for calculations
  poolSqrtPriceX96?: string;
  poolCurrentTick?: number;
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

    // Calculate TVL estimate from liquidity and price
    const tvl = calculateTVLFromLiquidity(liquidity, sqrtPriceX96, 18, 6); // Assuming WFUMA (18) and USDT (6)

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
      tvl: tvl.toFixed(2),
      volume24h: '0', // Requires event indexing
      apr: 0, // Requires volume data
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
    // Try to fetch real pool data from the blockchain
    console.log('Fetching pool data from blockchain...');

    const knownPools = [
      {
        token0: '0x1e11d176117dbEDbd234b1c6a10C6eb8dceD275e' as Address, // USDT
        token1: '0xBcA7B11c788dBb85bE92627ef1e60a2A9B7e2c6E' as Address, // WFUMA
        fee: 3000 as FeeAmount, // 0.3% fee tier
      },
    ];

    const pools: Pool[] = [];

    for (const { token0, token1, fee } of knownPools) {
      try {
        const pool = await getPool(token0, token1, fee);
        if (pool) {
          pools.push(pool);
        }
      } catch (poolError) {
        console.error(`Error fetching pool ${token0}/${token1}:`, poolError);
      }
    }

    // If no pools were fetched, fallback to static pools
    if (pools.length === 0) {
      console.log('No pools fetched from RPC, falling back to static pools');
      return STATIC_POOLS;
    }

    return pools;
  } catch (error) {
    console.error('Error fetching pools:', error);
    return STATIC_POOLS; // Fallback to static pools
  }
}

// CLPositionManager ABI (minimal for reading position data)
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
  {
    type: 'function',
    name: 'getPositionLiquidity',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: 'liquidity', type: 'uint128' }],
    stateMutability: 'view',
  },
] as const;

import { CL_POSITION_MANAGER_ADDRESS } from './contracts';

/**
 * Get user's liquidity positions
 *
 * Queries CLPositionManager contract for positions owned by the user
 */
export async function getUserPositions(address: Address): Promise<Position[]> {
  try {
    // Check if position manager is deployed
    if (isPlaceholderAddress(CL_POSITION_MANAGER_ADDRESS)) {
      console.log('Position manager not deployed yet');
      return [];
    }

    const publicClient = createPublicClient({
      chain: fushuma,
      transport: http(),
    });

    // First check if user has any positions
    const balance = await publicClient.readContract({
      address: CL_POSITION_MANAGER_ADDRESS as Address,
      abi: CLPositionManagerABI,
      functionName: 'balanceOf',
      args: [address],
    });

    console.log(`User ${address} has ${balance} positions`);

    if (balance === 0n) {
      return [];
    }

    // Get total minted positions to iterate through
    const nextTokenId = await publicClient.readContract({
      address: CL_POSITION_MANAGER_ADDRESS as Address,
      abi: CLPositionManagerABI,
      functionName: 'nextTokenId',
      args: [],
    });

    console.log(`Total positions minted: ${nextTokenId}`);

    const positions: Position[] = [];

    // Iterate through all token IDs and check ownership
    // Note: This is not the most efficient method but works without enumerable extension
    for (let tokenId = 1n; tokenId < nextTokenId; tokenId++) {
      try {
        const owner = await publicClient.readContract({
          address: CL_POSITION_MANAGER_ADDRESS as Address,
          abi: CLPositionManagerABI,
          functionName: 'ownerOf',
          args: [tokenId],
        });

        if (owner.toLowerCase() !== address.toLowerCase()) {
          continue;
        }

        // Fetch position details
        const positionData = await publicClient.readContract({
          address: CL_POSITION_MANAGER_ADDRESS as Address,
          abi: CLPositionManagerABI,
          functionName: 'positions',
          args: [tokenId],
        });

        const [poolKey, tickLower, tickUpper, liquidity, feeGrowthInside0LastX128, feeGrowthInside1LastX128] = positionData;

        // Get token symbols
        const token0Symbol = getTokenSymbol(poolKey.currency0 as Address);
        const token1Symbol = getTokenSymbol(poolKey.currency1 as Address);

        // Fetch pool state for this position's pool
        let poolSqrtPriceX96 = '0';
        let poolCurrentTick = 0;
        try {
          const poolData = await getPool(
            poolKey.currency0 as Address,
            poolKey.currency1 as Address,
            poolKey.fee as FeeAmount
          );
          if (poolData) {
            poolSqrtPriceX96 = poolData.sqrtPriceX96;
            poolCurrentTick = poolData.tick;
          }
        } catch (poolErr) {
          console.error('Error fetching pool data for position:', poolErr);
        }

        positions.push({
          tokenId: tokenId.toString(),
          owner: address,
          token0: poolKey.currency0 as Address,
          token1: poolKey.currency1 as Address,
          token0Symbol,
          token1Symbol,
          fee: poolKey.fee as FeeAmount,
          tickLower: Number(tickLower),
          tickUpper: Number(tickUpper),
          liquidity: liquidity.toString(),
          tokensOwed0: '0', // Would need separate calculation
          tokensOwed1: '0', // Would need separate calculation
          feeGrowthInside0LastX128: feeGrowthInside0LastX128.toString(),
          feeGrowthInside1LastX128: feeGrowthInside1LastX128.toString(),
          poolSqrtPriceX96,
          poolCurrentTick,
        });

      } catch (err) {
        // Token might not exist or be burned, skip it
        continue;
      }
    }

    console.log(`Found ${positions.length} positions for user`);
    return positions;

  } catch (error) {
    console.error('Error fetching user positions:', error);
    return [];
  }
}

/**
 * Helper to get token symbol from address
 */
function getTokenSymbol(address: Address): string {
  const addr = address.toLowerCase();
  if (addr === '0xbca7b11c788dbb85be92627ef1e60a2a9b7e2c6e') return 'WFUMA';
  if (addr === '0x1e11d176117dbedbD234b1c6a10c6eb8dceD275e'.toLowerCase()) return 'USDT';
  if (addr === '0xf8ea5627691e041dae171350e8df13c592084848') return 'USDC';
  return 'UNKNOWN';
}

/**
 * Calculate TVL from liquidity and price
 * Uses the concentrated liquidity math to estimate total value
 */
function calculateTVLFromLiquidity(
  liquidity: bigint,
  sqrtPriceX96: bigint,
  decimals0: number,
  decimals1: number
): number {
  if (liquidity === 0n || sqrtPriceX96 === 0n) return 0;

  try {
    const Q96 = BigInt(2) ** BigInt(96);

    // Calculate price from sqrtPriceX96
    const priceX192 = sqrtPriceX96 * sqrtPriceX96;
    const price = Number(priceX192) / Number(Q96 * Q96);

    // For full range liquidity, estimate token amounts
    // This is a simplified estimate - actual amounts depend on tick range
    const liquidityNum = Number(liquidity);

    // Estimate amount0 and amount1 using simplified formula
    // amount0 ≈ L / sqrt(P)
    // amount1 ≈ L * sqrt(P)
    const sqrtPrice = Number(sqrtPriceX96) / Number(Q96);
    const amount0 = liquidityNum / sqrtPrice / (10 ** decimals0);
    const amount1 = liquidityNum * sqrtPrice / (10 ** decimals1);

    // Calculate TVL (assuming token1 is the quote currency like USDT)
    // TVL = amount0 * price + amount1
    const tvl = amount0 * price * (10 ** (decimals1 - decimals0)) + amount1;

    return tvl;
  } catch (error) {
    console.error('Error calculating TVL:', error);
    return 0;
  }
}

/**
 * Calculate position value in tokens
 * Uses concentrated liquidity math to compute actual token amounts
 */
export function calculatePositionValue(position: Position): PositionValue {
  try {
    const liquidity = BigInt(position.liquidity);
    if (liquidity === 0n) {
      return { amount0: '0', amount1: '0', fees0: '0', fees1: '0', totalValue: '0' };
    }

    const sqrtPriceX96 = position.poolSqrtPriceX96 ? BigInt(position.poolSqrtPriceX96) : BigInt(0);
    const currentTick = position.poolCurrentTick ?? 0;

    if (sqrtPriceX96 === 0n) {
      return { amount0: '0', amount1: '0', fees0: '0', fees1: '0', totalValue: '0' };
    }

    // Calculate sqrt prices at tick boundaries
    const sqrtRatioA = getSqrtRatioAtTick(position.tickLower);
    const sqrtRatioB = getSqrtRatioAtTick(position.tickUpper);

    // Calculate token amounts based on current tick position
    let amount0 = BigInt(0);
    let amount1 = BigInt(0);

    const Q96 = BigInt(2) ** BigInt(96);

    if (currentTick < position.tickLower) {
      // Current price below range - all token0
      amount0 = (liquidity * (sqrtRatioB - sqrtRatioA)) / (sqrtRatioA * sqrtRatioB / Q96);
    } else if (currentTick >= position.tickUpper) {
      // Current price above range - all token1
      amount1 = liquidity * (sqrtRatioB - sqrtRatioA) / Q96;
    } else {
      // Current price within range - mix of both tokens
      amount0 = (liquidity * (sqrtRatioB - sqrtPriceX96)) / (sqrtPriceX96 * sqrtRatioB / Q96);
      amount1 = liquidity * (sqrtPriceX96 - sqrtRatioA) / Q96;
    }

    // Format amounts (assuming 18 decimals for token0 and 6 for token1)
    const amount0Formatted = (Number(amount0) / 1e18).toFixed(6);
    const amount1Formatted = (Number(amount1) / 1e6).toFixed(6);

    // Estimate fees (would need feeGrowthGlobal data for accurate calculation)
    const fees0 = position.tokensOwed0 || '0';
    const fees1 = position.tokensOwed1 || '0';

    // Calculate total value in token1 terms (e.g., USD if token1 is stablecoin)
    const priceX192 = sqrtPriceX96 * sqrtPriceX96;
    const price = Number(priceX192) / Number(Q96 * Q96);
    const totalValue = (Number(amount0) / 1e18 * price * 1e12 + Number(amount1) / 1e6).toFixed(2);

    return {
      amount0: amount0Formatted,
      amount1: amount1Formatted,
      fees0,
      fees1,
      totalValue,
    };
  } catch (error) {
    console.error('Error calculating position value:', error);
    return { amount0: '0', amount1: '0', fees0: '0', fees1: '0', totalValue: '0' };
  }
}

/**
 * Get sqrt ratio at a specific tick
 */
function getSqrtRatioAtTick(tick: number): bigint {
  const absTick = Math.abs(tick);
  const Q96 = BigInt(2) ** BigInt(96);

  // Use the standard tick math formula: sqrt(1.0001^tick) * 2^96
  const sqrtRatio = Math.sqrt(Math.pow(1.0001, tick)) * Number(Q96);
  return BigInt(Math.floor(sqrtRatio));
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
 * Calculate TVL for a pool using on-chain data
 */
export function calculatePoolTVL(pool: Pool): string {
  if (!pool.liquidity || !pool.sqrtPriceX96) {
    return pool.tvl || '0';
  }

  try {
    const liquidity = BigInt(pool.liquidity);
    const sqrtPriceX96 = BigInt(pool.sqrtPriceX96);

    // Use token decimals based on symbols
    const decimals0 = pool.token0Symbol === 'USDT' || pool.token0Symbol === 'USDC' ? 6 : 18;
    const decimals1 = pool.token1Symbol === 'USDT' || pool.token1Symbol === 'USDC' ? 6 : 18;

    const tvl = calculateTVLFromLiquidity(liquidity, sqrtPriceX96, decimals0, decimals1);
    return tvl.toFixed(2);
  } catch (error) {
    console.error('Error calculating pool TVL:', error);
    return pool.tvl || '0';
  }
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
export function formatFee(fee: FeeAmount | number): string {
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
 * Uses Uniswap V3 liquidity math
 */
export function estimateLiquidity(
  amount0: bigint,
  amount1: bigint,
  tickLower: number,
  tickUpper: number,
  currentTick: number
): bigint {
  try {
    const sqrtRatioA = getSqrtRatioAtTick(tickLower);
    const sqrtRatioB = getSqrtRatioAtTick(tickUpper);
    const sqrtRatioCurrent = getSqrtRatioAtTick(currentTick);

    const Q96 = BigInt(2) ** BigInt(96);

    if (currentTick < tickLower) {
      // Price below range - use amount0
      if (amount0 === 0n) return 0n;
      return (amount0 * sqrtRatioA * sqrtRatioB) / (Q96 * (sqrtRatioB - sqrtRatioA));
    } else if (currentTick >= tickUpper) {
      // Price above range - use amount1
      if (amount1 === 0n) return 0n;
      return (amount1 * Q96) / (sqrtRatioB - sqrtRatioA);
    } else {
      // Price within range - use both amounts, take the minimum
      const liquidity0 = (amount0 * sqrtRatioCurrent * sqrtRatioB) / (Q96 * (sqrtRatioB - sqrtRatioCurrent));
      const liquidity1 = (amount1 * Q96) / (sqrtRatioCurrent - sqrtRatioA);
      return liquidity0 < liquidity1 ? liquidity0 : liquidity1;
    }
  } catch (error) {
    console.error('Error estimating liquidity:', error);
    return BigInt(0);
  }
}

/**
 * Calculate token amounts from liquidity
 * Uses Uniswap V3 concentrated liquidity math
 */
export function calculateTokenAmounts(
  liquidity: bigint,
  tickLower: number,
  tickUpper: number,
  currentTick: number
): { amount0: bigint; amount1: bigint } {
  try {
    if (liquidity === 0n) {
      return { amount0: 0n, amount1: 0n };
    }

    const sqrtRatioA = getSqrtRatioAtTick(tickLower);
    const sqrtRatioB = getSqrtRatioAtTick(tickUpper);
    const sqrtRatioCurrent = getSqrtRatioAtTick(currentTick);

    const Q96 = BigInt(2) ** BigInt(96);

    let amount0 = 0n;
    let amount1 = 0n;

    if (currentTick < tickLower) {
      // Current price below range - all token0
      amount0 = (liquidity * Q96 * (sqrtRatioB - sqrtRatioA)) / (sqrtRatioA * sqrtRatioB);
    } else if (currentTick >= tickUpper) {
      // Current price above range - all token1
      amount1 = (liquidity * (sqrtRatioB - sqrtRatioA)) / Q96;
    } else {
      // Current price within range
      amount0 = (liquidity * Q96 * (sqrtRatioB - sqrtRatioCurrent)) / (sqrtRatioCurrent * sqrtRatioB);
      amount1 = (liquidity * (sqrtRatioCurrent - sqrtRatioA)) / Q96;
    }

    return { amount0, amount1 };
  } catch (error) {
    console.error('Error calculating token amounts:', error);
    return { amount0: 0n, amount1: 0n };
  }
}
