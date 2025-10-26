import { BigNumber } from 'ethers';
import { FeeAmount, TICK_SPACINGS, getSqrtRatioAtTick, getTickAtSqrtRatio } from './v3-math';

export interface PoolState {
  sqrtPriceX96: BigNumber;
  tick: number;
  observationIndex: number;
  observationCardinality: number;
  observationCardinalityNext: number;
  feeProtocol: number;
  unlocked: boolean;
}

export interface TickInfo {
  liquidityGross: BigNumber;
  liquidityNet: BigNumber;
  feeGrowthOutside0X128: BigNumber;
  feeGrowthOutside1X128: BigNumber;
  tickCumulativeOutside: BigNumber;
  secondsPerLiquidityOutsideX128: BigNumber;
  secondsOutside: number;
  initialized: boolean;
}

export interface Position {
  liquidity: BigNumber;
  feeGrowthInside0LastX128: BigNumber;
  feeGrowthInside1LastX128: BigNumber;
  tokensOwed0: BigNumber;
  tokensOwed1: BigNumber;
}

/**
 * Returns the closest tick that is nearest a given tick and usable for the given fee amount
 * @param tick the target tick
 * @param feeAmount the fee amount
 */
export function nearestUsableTick(tick: number, feeAmount: FeeAmount): number {
  const tickSpacing = TICK_SPACINGS[feeAmount];
  const rounded = Math.round(tick / tickSpacing) * tickSpacing;
  
  if (rounded < -887272) {
    return -887272 + ((-887272 % tickSpacing) + tickSpacing) % tickSpacing;
  } else if (rounded > 887272) {
    return 887272 - (887272 % tickSpacing);
  } else {
    return rounded;
  }
}

/**
 * Returns the sqrt price as a 64x96 for the given tick. The sqrt price is computed as sqrt(1.0001^tick) * 2^96
 * @param tick the tick for which to compute the sqrt price
 */
export function tickToPrice(tick: number): BigNumber {
  return getSqrtRatioAtTick(tick);
}

/**
 * Returns the tick corresponding to a given price
 * @param price the price for which to compute the tick
 */
export function priceToTick(price: BigNumber): number {
  return getTickAtSqrtRatio(price);
}

/**
 * Computes the token0 price from a pool's sqrt price
 * @param sqrtPriceX96 the sqrt price as a Q64.96
 * @param decimals0 the decimals of token0
 * @param decimals1 the decimals of token1
 */
export function sqrtPriceX96ToPrice(
  sqrtPriceX96: BigNumber,
  decimals0: number,
  decimals1: number
): number {
  const price = sqrtPriceX96.mul(sqrtPriceX96).div(BigNumber.from(2).pow(192));
  const adjustedPrice = price.mul(BigNumber.from(10).pow(decimals0)).div(BigNumber.from(10).pow(decimals1));
  return parseFloat(adjustedPrice.toString()) / Math.pow(10, decimals0);
}

/**
 * Computes the sqrt price from a token0 price
 * @param price the price of token0 in terms of token1
 * @param decimals0 the decimals of token0
 * @param decimals1 the decimals of token1
 */
export function priceToSqrtPriceX96(
  price: number,
  decimals0: number,
  decimals1: number
): BigNumber {
  const adjustedPrice = BigNumber.from(Math.floor(price * Math.pow(10, decimals1)))
    .mul(BigNumber.from(10).pow(decimals0))
    .div(BigNumber.from(10).pow(decimals1));
  
  const sqrtPrice = sqrt(adjustedPrice.mul(BigNumber.from(2).pow(192)));
  return sqrtPrice;
}

/**
 * Computes the square root of a BigNumber using Newton's method
 */
function sqrt(value: BigNumber): BigNumber {
  if (value.isZero()) {
    return BigNumber.from(0);
  }

  let x = value;
  let y = value.add(1).div(2);

  while (y.lt(x)) {
    x = y;
    y = value.div(x).add(x).div(2);
  }

  return x;
}

/**
 * Computes the amount out for a given amount in and pool state
 * @param amountIn the amount of input token
 * @param sqrtPriceX96Current the current sqrt price
 * @param liquidity the current liquidity
 * @param fee the pool fee
 * @param zeroForOne whether the swap is token0 for token1
 */
export function computeSwapStep(
  amountIn: BigNumber,
  sqrtPriceX96Current: BigNumber,
  liquidity: BigNumber,
  fee: number,
  zeroForOne: boolean
): {
  amountOut: BigNumber;
  sqrtPriceX96Next: BigNumber;
  amountInUsed: BigNumber;
  feeAmount: BigNumber;
} {
  const feeAmount = amountIn.mul(fee).div(1000000);
  const amountInAfterFee = amountIn.sub(feeAmount);

  let sqrtPriceX96Next: BigNumber;
  let amountOut: BigNumber;

  if (zeroForOne) {
    // Selling token0 for token1
    const numerator = liquidity.mul(sqrtPriceX96Current).shl(96);
    const denominator = liquidity.shl(96).add(amountInAfterFee.mul(sqrtPriceX96Current));
    sqrtPriceX96Next = numerator.div(denominator);
    
    amountOut = liquidity.mul(sqrtPriceX96Current.sub(sqrtPriceX96Next)).shr(96);
  } else {
    // Selling token1 for token0
    sqrtPriceX96Next = sqrtPriceX96Current.add(amountInAfterFee.shl(96).div(liquidity));
    
    const numerator = liquidity.mul(sqrtPriceX96Next.sub(sqrtPriceX96Current));
    const denominator = sqrtPriceX96Next.mul(sqrtPriceX96Current).shr(96);
    amountOut = numerator.div(denominator);
  }

  return {
    amountOut,
    sqrtPriceX96Next,
    amountInUsed: amountInAfterFee,
    feeAmount
  };
}

/**
 * Validates that a tick is within the valid range and properly spaced
 * @param tick the tick to validate
 * @param feeAmount the fee amount for tick spacing validation
 */
export function validateTick(tick: number, feeAmount: FeeAmount): boolean {
  if (tick < -887272 || tick > 887272) {
    return false;
  }

  const tickSpacing = TICK_SPACINGS[feeAmount];
  return tick % tickSpacing === 0;
}

/**
 * Gets the next initialized tick in a given direction
 * @param tick the current tick
 * @param lte whether to search for ticks less than or equal to the current tick
 * @param tickSpacing the tick spacing
 */
export function nextInitializedTick(
  tick: number,
  lte: boolean,
  tickSpacing: number
): number {
  if (lte) {
    return Math.floor(tick / tickSpacing) * tickSpacing;
  } else {
    return Math.ceil(tick / tickSpacing) * tickSpacing;
  }
}
