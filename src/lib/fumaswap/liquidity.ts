/**
 * FumaSwap V4 Liquidity Operations
 * 
 * Functions for adding and removing liquidity
 * Connected to deployed contracts
 */

import type { Token } from '@pancakeswap/sdk';
import type { Address } from 'viem';
import { parseUnits, encodeFunctionData } from 'viem';
import { FeeAmount, TICK_SPACINGS, CL_POSITION_MANAGER_ADDRESS } from './contracts';
import { isPlaceholderAddress } from './tokens';
import { getNearestUsableTick, priceToTick } from './pools';
import CLPositionManagerABI from './abis/CLPositionManager.json';

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
 * Add liquidity to a pool (mint new position)
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
    // Determine token order (currency0 < currency1)
    const token0 = params.token0.address.toLowerCase() < params.token1.address.toLowerCase() 
      ? params.token0 
      : params.token1;
    const token1 = params.token0.address.toLowerCase() < params.token1.address.toLowerCase() 
      ? params.token1 
      : params.token0;
    
    // Adjust amounts based on token order
    const amount0Desired = params.token0.address.toLowerCase() === token0.address.toLowerCase() 
      ? params.amount0Desired 
      : params.amount1Desired;
    const amount1Desired = params.token0.address.toLowerCase() === token0.address.toLowerCase() 
      ? params.amount1Desired 
      : params.amount0Desired;
    const amount0Min = params.token0.address.toLowerCase() === token0.address.toLowerCase() 
      ? params.amount0Min 
      : params.amount1Min;
    const amount1Min = params.token0.address.toLowerCase() === token0.address.toLowerCase() 
      ? params.amount1Min 
      : params.amount0Min;
    
    // Prepare pool key
    const poolKey = {
      currency0: token0.address as Address,
      currency1: token1.address as Address,
      hooks: '0x0000000000000000000000000000000000000000' as Address,
      poolManager: '0x9123DeC6d2bE7091329088BA1F8Dc118eEc44f7a' as Address, // CLPoolManager
      fee: params.fee,
      parameters: '0x00' as `0x${string}`,
    };
    
    // Prepare mint params
    const mintParams = {
      poolKey,
      tickLower: params.tickLower,
      tickUpper: params.tickUpper,
      amount0Desired,
      amount1Desired,
      amount0Min,
      amount1Min,
      recipient: params.recipient,
      deadline: BigInt(params.deadline),
    };

    // Call CLPositionManager.mint()
    const hash = await writeContract({
      address: CL_POSITION_MANAGER_ADDRESS as Address,
      abi: CLPositionManagerABI,
      functionName: 'mint',
      args: [mintParams],
    });

    return { hash };
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
    // Prepare decrease params
    const decreaseParams = {
      tokenId: BigInt(params.tokenId),
      liquidity: params.liquidity,
      amount0Min: params.amount0Min,
      amount1Min: params.amount1Min,
      deadline: BigInt(params.deadline),
    };

    // Call decreaseLiquidity()
    const hash = await writeContract({
      address: CL_POSITION_MANAGER_ADDRESS as Address,
      abi: CLPositionManagerABI,
      functionName: 'decreaseLiquidity',
      args: [decreaseParams],
    });

    return { hash };
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
    // Prepare increase params
    const increaseParams = {
      tokenId: BigInt(params.tokenId),
      amount0Desired: params.amount0Desired,
      amount1Desired: params.amount1Desired,
      amount0Min: params.amount0Min,
      amount1Min: params.amount1Min,
      deadline: BigInt(params.deadline),
    };

    // Call CLPositionManager.increaseLiquidity()
    const hash = await writeContract({
      address: CL_POSITION_MANAGER_ADDRESS as Address,
      abi: CLPositionManagerABI,
      functionName: 'increaseLiquidity',
      args: [increaseParams],
    });

    return { hash };
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
    // Prepare collect params
    const collectParams = {
      tokenId: BigInt(params.tokenId),
      recipient: params.recipient,
      amount0Max: params.amount0Max,
      amount1Max: params.amount1Max,
    };

    // Call CLPositionManager.collect()
    const hash = await writeContract({
      address: CL_POSITION_MANAGER_ADDRESS as Address,
      abi: CLPositionManagerABI,
      functionName: 'collect',
      args: [collectParams],
    });

    return { hash };
  } catch (error) {
    console.error('Error collecting fees:', error);
    throw error;
  }
}

/**
 * Calculate price range from percentage
 */
export function calculatePriceRange(
  currentPrice: number,
  rangePercentage: number
): { priceLower: number; priceUpper: number } {
  const priceLower = currentPrice * (1 - rangePercentage / 100);
  const priceUpper = currentPrice * (1 + rangePercentage / 100);
  
  return { priceLower, priceUpper };
}

/**
 * Calculate ticks from prices
 */
export function calculateTicksFromPrices(
  priceLower: number,
  priceUpper: number,
  tickSpacing: number
): { tickLower: number; tickUpper: number } {
  const tickLower = getNearestUsableTick(priceToTick(priceLower), tickSpacing);
  const tickUpper = getNearestUsableTick(priceToTick(priceUpper), tickSpacing);
  
  return { tickLower, tickUpper };
}

/**
 * Calculate full range ticks
 */
export function getFullRangeTicks(tickSpacing: number): { tickLower: number; tickUpper: number } {
  const MIN_TICK = -887272;
  const MAX_TICK = 887272;
  
  return {
    tickLower: getNearestUsableTick(MIN_TICK, tickSpacing),
    tickUpper: getNearestUsableTick(MAX_TICK, tickSpacing),
  };
}

/**
 * Validate liquidity parameters
 */
export function validateLiquidityParams(
  token0: Token,
  token1: Token,
  amount0: string,
  amount1: string,
  tickLower: number,
  tickUpper: number
): { valid: boolean; error?: string } {
  if (!token0 || !token1) {
    return { valid: false, error: 'Please select both tokens' };
  }

  if (token0.address === token1.address) {
    return { valid: false, error: 'Cannot create pool with same token' };
  }

  if (!amount0 || parseFloat(amount0) <= 0) {
    return { valid: false, error: 'Please enter amount for token 0' };
  }

  if (!amount1 || parseFloat(amount1) <= 0) {
    return { valid: false, error: 'Please enter amount for token 1' };
  }

  if (tickLower >= tickUpper) {
    return { valid: false, error: 'Invalid price range' };
  }

  return { valid: true };
}

/**
 * Calculate minimum amounts with slippage
 */
export function calculateMinAmounts(
  amount0: bigint,
  amount1: bigint,
  slippageTolerance: number
): { amount0Min: bigint; amount1Min: bigint } {
  const slippage = BigInt(Math.floor((100 - slippageTolerance) * 100));
  
  return {
    amount0Min: (amount0 * slippage) / 10000n,
    amount1Min: (amount1 * slippage) / 10000n,
  };
}

/**
 * Estimate gas for adding liquidity
 */
export async function estimateAddLiquidityGas(params: AddLiquidityParams): Promise<bigint> {
  // Mock gas estimate for development
  return BigInt(300000); // ~300k gas
}

/**
 * Estimate gas for removing liquidity
 */
export async function estimateRemoveLiquidityGas(params: RemoveLiquidityParams): Promise<bigint> {
  // Mock gas estimate for development
  return BigInt(250000); // ~250k gas
}
