/**
 * Position utilities for calculating token amounts
 *
 * Uses direct Uniswap V3 math formulas instead of PancakeSwap SDK
 * to support custom fee tiers like 3000 (0.3%)
 */

import { Token } from '@pancakeswap/sdk';
import { TickMath, tickToPrice } from '@pancakeswap/v3-sdk';
import type { Position as PositionData } from '../pools';

// Fushuma chain ID
const FUSHUMA_CHAIN_ID = 121224;

// Tick bounds for full range positions
const MIN_TICK = -887272;
const MAX_TICK = 887272;

// Q96 constant for sqrt price calculations
const Q96 = 2n ** 96n;

// Token definitions with proper hex address type
const TOKENS: Record<string, { address: `0x${string}`; decimals: number; symbol: string; name: string }> = {
  WFUMA: {
    address: '0xBcA7B11c788dBb85bE92627ef1e60a2A9B7e2c6E',
    decimals: 18,
    symbol: 'WFUMA',
    name: 'Wrapped FUMA',
  },
  USDT: {
    address: '0x1e11d176117dbEDbd234b1c6a10C6eb8dceD275e',
    decimals: 6,
    symbol: 'USDT',
    name: 'Tether USD',
  },
  USDC: {
    address: '0xf8EA5627691E041dae171350E8Df13c592084848',
    decimals: 6,
    symbol: 'USDC',
    name: 'USD Coin',
  },
};

/**
 * Get Token object from address
 */
export function getToken(address: string): Token | null {
  const addr = address.toLowerCase();
  for (const [symbol, data] of Object.entries(TOKENS)) {
    if (data.address.toLowerCase() === addr) {
      return new Token(FUSHUMA_CHAIN_ID, data.address, data.decimals, data.symbol, data.name);
    }
  }
  return null;
}

/**
 * Get token decimals from address
 */
function getTokenDecimals(address: string): number {
  const addr = address.toLowerCase();
  for (const data of Object.values(TOKENS)) {
    if (data.address.toLowerCase() === addr) {
      return data.decimals;
    }
  }
  return 18; // Default to 18 decimals
}

/**
 * Get sqrtRatioX96 at a given tick using TickMath
 */
function getSqrtRatioAtTick(tick: number): bigint {
  try {
    return TickMath.getSqrtRatioAtTick(tick);
  } catch {
    // Fallback for extreme ticks
    if (tick <= MIN_TICK) {
      return TickMath.MIN_SQRT_RATIO;
    }
    if (tick >= MAX_TICK) {
      return TickMath.MAX_SQRT_RATIO;
    }
    return Q96; // 1:1 price
  }
}

/**
 * Calculate token amounts from position liquidity using Uniswap V3 math
 *
 * This implements the formulas directly instead of using SDK's Position class
 * to avoid fee tier validation issues (SDK only supports PancakeSwap fee tiers)
 */
export function calculatePositionAmounts(
  position: PositionData,
  currentTick: number,
  sqrtPriceX96: string
): { amount0: string; amount1: string } {
  try {
    // Validate sqrtPriceX96 - if invalid, we can't calculate amounts
    if (!sqrtPriceX96 || sqrtPriceX96 === '0') {
      console.error('Invalid sqrtPriceX96, cannot calculate amounts');
      return { amount0: '0', amount1: '0' };
    }

    // Validate liquidity
    const liquidity = BigInt(position.liquidity || '0');
    if (liquidity === 0n) {
      return { amount0: '0', amount1: '0' };
    }

    const sqrtPriceCurrent = BigInt(sqrtPriceX96);
    const sqrtPriceLower = getSqrtRatioAtTick(position.tickLower);
    const sqrtPriceUpper = getSqrtRatioAtTick(position.tickUpper);

    let amount0 = 0n;
    let amount1 = 0n;

    if (currentTick < position.tickLower) {
      // Position is entirely in token0 (below range)
      // amount0 = L * (sqrtPriceUpper - sqrtPriceLower) / (sqrtPriceLower * sqrtPriceUpper) * Q96
      amount0 = (liquidity * Q96 * (sqrtPriceUpper - sqrtPriceLower)) / (sqrtPriceLower * sqrtPriceUpper);
      amount1 = 0n;
    } else if (currentTick >= position.tickUpper) {
      // Position is entirely in token1 (above range)
      // amount1 = L * (sqrtPriceUpper - sqrtPriceLower) / Q96
      amount0 = 0n;
      amount1 = (liquidity * (sqrtPriceUpper - sqrtPriceLower)) / Q96;
    } else {
      // Position is in range
      // amount0 = L * (sqrtPriceUpper - sqrtPriceCurrent) / (sqrtPriceCurrent * sqrtPriceUpper) * Q96
      // amount1 = L * (sqrtPriceCurrent - sqrtPriceLower) / Q96
      amount0 = (liquidity * Q96 * (sqrtPriceUpper - sqrtPriceCurrent)) / (sqrtPriceCurrent * sqrtPriceUpper);
      amount1 = (liquidity * (sqrtPriceCurrent - sqrtPriceLower)) / Q96;
    }

    console.log('Calculated amounts:', {
      amount0: amount0.toString(),
      amount1: amount1.toString(),
      currentTick,
      tickLower: position.tickLower,
      tickUpper: position.tickUpper
    });

    return { amount0: amount0.toString(), amount1: amount1.toString() };
  } catch (error) {
    console.error('Error calculating position amounts:', error);
    return { amount0: '0', amount1: '0' };
  }
}

/**
 * Calculate price from tick using SDK (handles overflow properly)
 * For extreme ticks (full range positions), returns "0" or "∞"
 */
export function tickToReadablePrice(
  tick: number,
  token0Address: string,
  token1Address: string,
  invert: boolean = false
): string {
  try {
    // Handle extreme ticks for full-range positions
    // Use a threshold to detect near-MIN/MAX ticks
    const isNearMinTick = tick <= MIN_TICK + 1000;
    const isNearMaxTick = tick >= MAX_TICK - 1000;

    if (isNearMinTick) {
      return invert ? '∞' : '0';
    }
    if (isNearMaxTick) {
      return invert ? '0' : '∞';
    }

    const token0 = getToken(token0Address);
    const token1 = getToken(token1Address);

    if (!token0 || !token1) {
      return '0';
    }

    // Use SDK's tickToPrice function
    const price = tickToPrice(token0, token1, tick);
    const priceToUse = invert ? price.invert() : price;

    // Get the price as a number for formatting
    const priceNum = parseFloat(priceToUse.toSignificant(18));

    // Format based on magnitude
    if (priceNum === 0 || !isFinite(priceNum)) {
      return '0';
    }
    if (priceNum < 0.000001) {
      return priceNum.toExponential(2);
    }
    if (priceNum < 1) {
      return priceNum.toPrecision(4);
    }
    if (priceNum < 10000) {
      return priceNum.toFixed(4).replace(/\.?0+$/, '');
    }
    if (priceNum < 1000000) {
      return priceNum.toFixed(2).replace(/\.?0+$/, '');
    }
    return priceNum.toExponential(2);
  } catch (error) {
    console.error('Error converting tick to price:', error);
    return '0';
  }
}

/**
 * Get formatted position data with proper calculations
 */
export interface FormattedPosition {
  tokenId: string;
  token0Symbol: string;
  token1Symbol: string;
  fee: number;
  feeFormatted: string;
  tickLower: number;
  tickUpper: number;
  liquidity: string;
  amount0: string;
  amount1: string;
  amount0Formatted: string;
  amount1Formatted: string;
  minPrice: string;
  maxPrice: string;
  currentPrice: string;
  inRange: boolean;
}

/**
 * Format position with all calculated values
 */
export function formatPositionData(
  position: PositionData,
  currentTick: number,
  sqrtPriceX96: string
): FormattedPosition {
  const token0 = getToken(position.token0);
  const token1 = getToken(position.token1);

  const token0Decimals = token0?.decimals || 18;
  const token1Decimals = token1?.decimals || 18;

  // Calculate amounts using SDK
  const { amount0, amount1 } = calculatePositionAmounts(position, currentTick, sqrtPriceX96);

  // Calculate prices using SDK
  const minPrice = tickToReadablePrice(position.tickLower, position.token0, position.token1);
  const maxPrice = tickToReadablePrice(position.tickUpper, position.token0, position.token1);
  const currentPrice = tickToReadablePrice(currentTick, position.token0, position.token1);

  // Check if position is in range
  const inRange = currentTick >= position.tickLower && currentTick < position.tickUpper;

  // Format amounts for display
  const amount0Formatted = formatAmount(amount0, token0Decimals);
  const amount1Formatted = formatAmount(amount1, token1Decimals);

  return {
    tokenId: position.tokenId,
    token0Symbol: position.token0Symbol,
    token1Symbol: position.token1Symbol,
    fee: position.fee,
    feeFormatted: `${(position.fee / 10000).toFixed(2)}%`,
    tickLower: position.tickLower,
    tickUpper: position.tickUpper,
    liquidity: position.liquidity,
    amount0,
    amount1,
    amount0Formatted,
    amount1Formatted,
    minPrice,
    maxPrice,
    currentPrice,
    inRange,
  };
}

/**
 * Format token amount for display
 */
function formatAmount(amount: string, decimals: number): string {
  try {
    const value = BigInt(amount);
    const divisor = BigInt(10 ** decimals);
    const integerPart = value / divisor;
    const fractionalPart = value % divisor;

    // Format with up to 4 decimal places
    const fractionalStr = fractionalPart.toString().padStart(decimals, '0').slice(0, 4);

    if (integerPart === 0n && fractionalPart === 0n) {
      return '0';
    }

    return `${integerPart}.${fractionalStr}`.replace(/\.?0+$/, '') || '0';
  } catch {
    return '0';
  }
}

/**
 * Get the current pool tick from sqrtPriceX96
 */
export function sqrtPriceX96ToTick(sqrtPriceX96: string): number {
  try {
    return TickMath.getTickAtSqrtRatio(BigInt(sqrtPriceX96));
  } catch (error) {
    console.error('Error converting sqrtPriceX96 to tick:', error);
    return 0;
  }
}
