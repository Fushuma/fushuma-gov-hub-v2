/**
 * FumaSwap V4 Liquidity Operations
 * 
 * Functions for adding and removing liquidity using CLPositionManager
 */

import type { Token } from '@pancakeswap/sdk';
import type { Address } from 'viem';
import { parseUnits, encodeAbiParameters, parseAbiParameters } from 'viem';
import { FeeAmount, TICK_SPACINGS, CL_POSITION_MANAGER_ADDRESS, CL_POOL_MANAGER_ADDRESS } from './contracts';
import { isPlaceholderAddress } from './tokens';
import { getNearestUsableTick, priceToTick } from './pools';

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

    // Prepare pool key
    const poolKey = {
      currency0: token0.address as Address,
      currency1: token1.address as Address,
      hooks: '0x0000000000000000000000000000000000000000' as Address,
      poolManager: CL_POOL_MANAGER_ADDRESS as Address,
      fee,
      parameters: '0x00' as `0x${string}`,
    };

    // Prepare mint parameters
    const mintParams = {
      poolKey,
      tickLower,
      tickUpper,
      liquidity: 0n, // Will be calculated by the contract
      amount0Max: amount0Desired,
      amount1Max: amount1Desired,
      amount0Min,
      amount1Min,
      recipient,
      hookData: '0x' as `0x${string}`,
    };

    // Calculate deadline timestamp
    const deadlineTimestamp = Math.floor(Date.now() / 1000) + deadline * 60;

    // Call CLPositionManager modifyLiquidities function
    const CLPositionManagerABI = (await import('./abis/CLPositionManager.json')).default;
    
    // Encode actions for modifyLiquidities
    // Action: MINT (0x00)
    const actions = '0x00';
    const params_encoded = encodeAbiParameters(
      parseAbiParameters('(address,address,address,address,uint24,bytes32),int24,int24,uint256,uint128,uint128,uint128,uint128,address,bytes'),
      [
        [
          poolKey.currency0,
          poolKey.currency1,
          poolKey.hooks,
          poolKey.poolManager,
          poolKey.fee,
          poolKey.parameters,
        ],
        tickLower,
        tickUpper,
        0n, // liquidity (calculated by contract)
        amount0Desired,
        amount1Desired,
        amount0Min,
        amount1Min,
        recipient,
        '0x' as `0x${string}`,
      ]
    );
    
    const result = await writeContract({
      address: CL_POSITION_MANAGER_ADDRESS as Address,
      abi: CLPositionManagerABI,
      functionName: 'modifyLiquidities',
      args: [actions, [params_encoded], deadlineTimestamp],
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
