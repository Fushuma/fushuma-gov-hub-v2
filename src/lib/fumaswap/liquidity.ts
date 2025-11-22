/**
 * FumaSwap V4 Liquidity Operations
 * 
 * Functions for adding and removing liquidity using CLPositionManager
 * Following PancakeSwap V4 (Infinity) implementation pattern
 */

import type { Token } from '@pancakeswap/sdk';
import type { Address } from 'viem';
import { parseUnits, encodeFunctionData, zeroAddress, keccak256, encodePacked } from 'viem';
import { FeeAmount, TICK_SPACINGS, CL_POSITION_MANAGER_ADDRESS, CL_POOL_MANAGER_ADDRESS } from './contracts';
import { isPlaceholderAddress } from './tokens';
import { getNearestUsableTick, priceToTick } from './pools';
import { ActionsPlanner } from './utils/ActionsPlanner';
import { ACTIONS } from './utils/constants';
import { encodeCLPoolParameters } from './utils/encodePoolParameters';
import { maxLiquidityForAmounts, getSqrtRatioAtTick } from './utils/liquidityMath';
import type { PoolKey } from './types';

export interface AddLiquidityParams {
  token0: Token;
  token1: Token;
  fee: FeeAmount;
  amount0Desired: bigint;
  amount1Desired: bigint;
  amount0Min: bigint;
  amount1Min: bigint;
  tickLower: number;
  tickUpper: number;
  recipient: Address;
  deadline: number;
}

export interface RemoveLiquidityParams {
  tokenId: string;
  liquidity: bigint;
  amount0Min: bigint;
  amount1Min: bigint;
  deadline: number;
}

export interface IncreaseLiquidityParams {
  tokenId: string;
  amount0Desired: bigint;
  amount1Desired: bigint;
  amount0Min: bigint;
  amount1Min: bigint;
  deadline: number;
}

export interface CollectFeesParams {
  tokenId: string;
  recipient: Address;
  amount0Max: bigint;
  amount1Max: bigint;
}

/**
 * Calculate pool ID from pool key
 */
function getPoolId(poolKey: PoolKey): `0x${string}` {
  // Match the contract's assembly: keccak256(poolKey, 0xc0)
  // This is equivalent to ABI encoding the struct (6 × 32 bytes = 192 = 0xc0)
  const encodedParams = encodeCLPoolParameters(poolKey.parameters);
  const { encodeAbiParameters } = require('viem');
  return keccak256(
    encodeAbiParameters(
      [
        { type: 'address' },
        { type: 'address' },
        { type: 'address' },
        { type: 'address' },
        { type: 'uint24' },
        { type: 'bytes32' },
      ],
      [
        poolKey.currency0,
        poolKey.currency1,
        poolKey.hooks,
        poolKey.poolManager,
        poolKey.fee,
        encodedParams,
      ]
    )
  );
}

/**
 * Add liquidity to a pool (mint new position)
 * Uses PancakeSwap V4 ActionsPlanner pattern
 */
export async function addLiquidity(
  params: AddLiquidityParams,
  writeContract: any
): Promise<{ hash: Address } | null> {
  // Check if contracts are deployed
  if (isPlaceholderAddress(CL_POSITION_MANAGER_ADDRESS)) {
    throw new Error('Position Manager contract not deployed yet. Liquidity functionality will be available after contract deployment.');
  }

  try {
    const {
      token0,
      token1,
      fee,
      amount0Desired,
      amount1Desired,
      amount0Min,
      amount1Min,
      tickLower,
      tickUpper,
      recipient,
      deadline,
    } = params;

    console.error('🔢 [STEP 1] Starting addLiquidity...');
    console.error('  Token0:', token0.symbol, token0.address, 'decimals:', token0.decimals);
    console.error('  Token1:', token1.symbol, token1.address, 'decimals:', token1.decimals);
    console.error('  Amount0Desired:', amount0Desired.toString());
    console.error('  Amount1Desired:', amount1Desired.toString());
    console.error('  TickLower:', tickLower);
    console.error('  TickUpper:', tickUpper);

    // Get tick spacing for the fee tier
    const tickSpacing = TICK_SPACINGS[fee];
    if (!tickSpacing) {
      throw new Error(`Invalid fee tier: ${fee}`);
    }

    // Sort tokens by address (required by V4 architecture)
    const tokensAlreadySorted = token0.address.toLowerCase() < token1.address.toLowerCase();
    const currency0 = tokensAlreadySorted ? token0.address : token1.address;
    const currency1 = tokensAlreadySorted ? token1.address : token0.address;
    
    // CRITICAL: Also swap amounts to match sorted token order
    const amount0 = tokensAlreadySorted ? amount0Desired : amount1Desired;
    const amount1 = tokensAlreadySorted ? amount1Desired : amount0Desired;
    const min0 = tokensAlreadySorted ? amount0Min : amount1Min;
    const min1 = tokensAlreadySorted ? amount1Min : amount0Min;
    
    console.error('🔄 Token sorting:');
    console.error('  Already sorted?', tokensAlreadySorted);
    console.error('  Currency0 (sorted):', currency0);
    console.error('  Currency1 (sorted):', currency1);
    console.error('  Amount0 (sorted):', amount0.toString());
    console.error('  Amount1 (sorted):', amount1.toString());

    // Prepare pool key with OBJECT parameters (will be encoded later)
    const poolKey: PoolKey = {
      currency0: currency0 as Address,
      currency1: currency1 as Address,
      hooks: zeroAddress as Address,
      poolManager: CL_POOL_MANAGER_ADDRESS as Address,
      fee,
      parameters: { tickSpacing }, // Keep as object, encode later
    };

    // Get pool ID and fetch current sqrt price
    const poolId = getPoolId(poolKey);
    console.error('📊 [STEP 2] Pool ID:', poolId);

    // Import viem client
    const { createPublicClient, http } = await import('viem');
    const { fushuma } = await import('./chains');
    
    const publicClient = createPublicClient({
      chain: fushuma,
      transport: http(),
    });

    // Load PoolManager ABI and fetch slot0
    const CLPoolManagerABI = (await import('./abis/CLPoolManager.json')).default;
    
    console.error('📞 [STEP 3] Fetching pool state from CLPoolManager...');
    const slot0 = await publicClient.readContract({
      address: CL_POOL_MANAGER_ADDRESS as Address,
      abi: CLPoolManagerABI,
      functionName: 'getSlot0',
      args: [poolId],
    }) as [bigint, number, number, number];

    const sqrtPriceX96 = slot0[0];
    const currentTick = slot0[1];
    console.error('✅ [STEP 4] Pool state fetched:');
    console.error('  sqrtPriceX96:', sqrtPriceX96.toString());
    console.error('  currentTick:', currentTick);

    // Calculate sqrt ratios at tick boundaries
    const sqrtRatioAX96 = getSqrtRatioAtTick(tickLower);
    const sqrtRatioBX96 = getSqrtRatioAtTick(tickUpper);
    console.error('  sqrtRatioAX96 (lower):', sqrtRatioAX96.toString());
    console.error('  sqrtRatioBX96 (upper):', sqrtRatioBX96.toString());

    // Calculate liquidity using the proper formula with SORTED amounts
    const liquidity = maxLiquidityForAmounts(
      sqrtPriceX96,
      sqrtRatioAX96,
      sqrtRatioBX96,
      amount0,  // Use sorted amount0
      amount1   // Use sorted amount1
    );

    console.error('✅ [STEP 5] Calculated liquidity:', liquidity.toString());

    if (liquidity === 0n) {
      throw new Error('Calculated liquidity is zero. Please check your amounts and price range.');
    }

    // Prepare position config
    const positionConfig = {
      poolKey,
      tickLower,
      tickUpper,
    };

    // Encode the position config (convert parameters object to Bytes32)
    const encodedPositionConfig = {
      ...positionConfig,
      poolKey: {
        ...positionConfig.poolKey,
        parameters: encodeCLPoolParameters(positionConfig.poolKey.parameters),
      },
    };

    // Create ActionsPlanner
    const planner = new ActionsPlanner();

    // Add CL_MINT_POSITION action with CALCULATED liquidity
    console.error('📝 [STEP 6] Creating transaction with liquidity:', liquidity.toString());
    console.error('  Recipient:', recipient);
    console.error('  Deadline:', deadline, 'minutes');
    planner.add(ACTIONS.CL_MINT_POSITION, [
      encodedPositionConfig, // EncodedCLPositionConfig struct
      liquidity, // CALCULATED liquidity (not 0!)
      amount0, // amount0Max (SORTED)
      amount1, // amount1Max (SORTED)
      recipient, // owner
      '0x' as `0x${string}`, // hookData
    ]);

    // Finalize with CLOSE_CURRENCY actions (use DECODED poolKey for currency addresses)
    const calls = planner.finalizeModifyLiquidityWithClose(poolKey);

    // Calculate deadline timestamp
    const deadlineTimestamp = BigInt(Math.floor(Date.now() / 1000) + deadline * 60);

    // Load ABI
    const CLPositionManagerABI = (await import('./abis/CLPositionManager.json')).default;

    // Call modifyLiquidities
    console.error('🚀 [STEP 7] Calling writeContract...');
    console.error('  Contract:', CL_POSITION_MANAGER_ADDRESS);
    console.error('  Function: modifyLiquidities');
    console.error('  Encoded calls length:', calls.length);
    console.error('  Deadline timestamp:', deadlineTimestamp.toString());
    const result = await writeContract({
      address: CL_POSITION_MANAGER_ADDRESS as Address,
      abi: CLPositionManagerABI,
      functionName: 'modifyLiquidities',
      args: [calls, deadlineTimestamp],
    });

    return result;
  } catch (error) {
    console.error('Error adding liquidity:', error);
    throw error;
  }
}

/**
 * Remove liquidity from a position (burn)
 */
export async function removeLiquidity(
  params: RemoveLiquidityParams,
  writeContract: any
): Promise<{ hash: Address } | null> {
  // Check if contracts are deployed
  if (isPlaceholderAddress(CL_POSITION_MANAGER_ADDRESS)) {
    throw new Error('Position Manager contract not deployed yet.');
  }

  try {
    const { tokenId, liquidity, amount0Min, amount1Min, deadline } = params;

    // Calculate deadline timestamp
    const deadlineTimestamp = Math.floor(Date.now() / 1000) + deadline * 60;

    // Prepare burn parameters
    const burnParams = {
      tokenId: BigInt(tokenId),
      liquidity,
      amount0Min,
      amount1Min,
      hookData: '0x' as `0x${string}`,
    };

    // Call CLPositionManager burn function
    const CLPositionManagerABI = (await import('./abis/CLPositionManager.json')).default;
    
    const result = await writeContract({
      address: CL_POSITION_MANAGER_ADDRESS as Address,
      abi: CLPositionManagerABI,
      functionName: 'burn',
      args: [burnParams, deadlineTimestamp],
    });

    return result;
  } catch (error) {
    console.error('Error removing liquidity:', error);
    throw error;
  }
}

/**
 * Increase liquidity in an existing position
 */
export async function increaseLiquidity(
  params: IncreaseLiquidityParams,
  writeContract: any
): Promise<{ hash: Address } | null> {
  // Check if contracts are deployed
  if (isPlaceholderAddress(CL_POSITION_MANAGER_ADDRESS)) {
    throw new Error('Position Manager contract not deployed yet.');
  }

  try {
    const { tokenId, amount0Desired, amount1Desired, amount0Min, amount1Min, deadline } = params;

    // Calculate deadline timestamp
    const deadlineTimestamp = Math.floor(Date.now() / 1000) + deadline * 60;

    // Prepare increase liquidity parameters
    const increaseParams = {
      tokenId: BigInt(tokenId),
      liquidity: 0n, // Will be calculated by the contract
      amount0Max: amount0Desired,
      amount1Max: amount1Desired,
      amount0Min,
      amount1Min,
      hookData: '0x' as `0x${string}`,
    };

    // Call CLPositionManager increaseLiquidity function
    const CLPositionManagerABI = (await import('./abis/CLPositionManager.json')).default;
    
    const result = await writeContract({
      address: CL_POSITION_MANAGER_ADDRESS as Address,
      abi: CLPositionManagerABI,
      functionName: 'increaseLiquidity',
      args: [increaseParams, deadlineTimestamp],
    });

    return result;
  } catch (error) {
    console.error('Error increasing liquidity:', error);
    throw error;
  }
}

/**
 * Collect fees from a position
 */
export async function collectFees(
  params: CollectFeesParams,
  writeContract: any
): Promise<{ hash: Address } | null> {
  // Check if contracts are deployed
  if (isPlaceholderAddress(CL_POSITION_MANAGER_ADDRESS)) {
    throw new Error('Position Manager contract not deployed yet.');
  }

  try {
    const { tokenId, recipient, amount0Max, amount1Max } = params;

    // Prepare collect parameters
    const collectParams = {
      tokenId: BigInt(tokenId),
      recipient,
      amount0Max,
      amount1Max,
      hookData: '0x' as `0x${string}`,
    };

    // Call CLPositionManager collect function
    const CLPositionManagerABI = (await import('./abis/CLPositionManager.json')).default;
    
    const result = await writeContract({
      address: CL_POSITION_MANAGER_ADDRESS as Address,
      abi: CLPositionManagerABI,
      functionName: 'collect',
      args: [collectParams],
    });

    return result;
  } catch (error) {
    console.error('Error collecting fees:', error);
    throw error;
  }
}

/**
 * Calculate price impact for liquidity operations
 */
export function calculateLiquidityPriceImpact(
  amount0: bigint,
  amount1: bigint,
  poolReserve0: bigint,
  poolReserve1: bigint
): number {
  try {
    if (poolReserve0 === 0n || poolReserve1 === 0n) {
      return 0;
    }

    const ratio0 = Number(amount0) / Number(poolReserve0);
    const ratio1 = Number(amount1) / Number(poolReserve1);
    
    return Math.max(ratio0, ratio1) * 100;
  } catch (error) {
    return 0;
  }
}

/**
 * Validate liquidity parameters
 */
export function validateLiquidityParams(
  token0: Token,
  token1: Token,
  amount0: string,
  amount1: string
): { valid: boolean; error?: string } {
  if (!token0 || !token1) {
    return { valid: false, error: 'Please select both tokens' };
  }
  
  if (token0.address === token1.address) {
    return { valid: false, error: 'Cannot provide liquidity for same token' };
  }
  
  if (!amount0 || parseFloat(amount0) <= 0) {
    return { valid: false, error: 'Please enter amount for first token' };
  }
  
  if (!amount1 || parseFloat(amount1) <= 0) {
    return { valid: false, error: 'Please enter amount for second token' };
  }
  
  return { valid: true };
}

/**
 * Calculate tick range for full range liquidity
 */
export function getFullRangeTickRange(fee: FeeAmount): { tickLower: number; tickUpper: number } {
  const tickSpacing = TICK_SPACINGS[fee];
  const minTick = Math.ceil(-887272 / tickSpacing) * tickSpacing;
  const maxTick = Math.floor(887272 / tickSpacing) * tickSpacing;
  
  return {
    tickLower: minTick,
    tickUpper: maxTick,
  };
}
