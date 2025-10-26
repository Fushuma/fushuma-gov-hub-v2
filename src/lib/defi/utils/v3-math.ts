import { BigNumber } from 'ethers';

// Constants from Uniswap V3
export const Q96 = BigNumber.from(2).pow(96);
export const Q128 = BigNumber.from(2).pow(128);
export const Q192 = Q96.mul(Q96);

// Minimum and maximum tick values
export const MIN_TICK = -887272;
export const MAX_TICK = 887272;

// Fee amounts
export const FeeAmount = {
  LOWEST: 100,
  LOW: 500,
  MEDIUM: 3000,
  HIGH: 10000,
} as const;

// Tick spacings for each fee amount
export const TICK_SPACINGS: { [amount in typeof FeeAmount[keyof typeof FeeAmount]]: number } = {
  [FeeAmount.LOWEST]: 1,
  [FeeAmount.LOW]: 10,
  [FeeAmount.MEDIUM]: 60,
  [FeeAmount.HIGH]: 200,
};

/**
 * Returns the sqrt ratio as a Q64.96 corresponding to a given tick
 * @param tick the tick for which to compute the sqrt ratio
 */
export function getSqrtRatioAtTick(tick: number): BigNumber {
  const absTick = Math.abs(tick);
  
  if (absTick > MAX_TICK) {
    throw new Error('TICK');
  }

  let ratio = BigNumber.from(
    absTick & 0x1 !== 0
      ? '0xfffcb933bd6fad37aa2d162d1a594001'
      : '0x100000000000000000000000000000000'
  );

  if ((absTick & 0x2) !== 0) ratio = ratio.mul('0xfff97272373d413259a46990580e213a').shr(128);
  if ((absTick & 0x4) !== 0) ratio = ratio.mul('0xfff2e50f5f656932ef12357cf3c7fdcc').shr(128);
  if ((absTick & 0x8) !== 0) ratio = ratio.mul('0xffe5caca7e10e4e61c3624eaa0941cd0').shr(128);
  if ((absTick & 0x10) !== 0) ratio = ratio.mul('0xffcb9843d60f6159c9db58835c926644').shr(128);
  if ((absTick & 0x20) !== 0) ratio = ratio.mul('0xff973b41fa98c081472e6896dfb254c0').shr(128);
  if ((absTick & 0x40) !== 0) ratio = ratio.mul('0xff2ea16466c96a3843ec78b326b52861').shr(128);
  if ((absTick & 0x80) !== 0) ratio = ratio.mul('0xfe5dee046a99a2a811c461f1969c3053').shr(128);
  if ((absTick & 0x100) !== 0) ratio = ratio.mul('0xfcbe86c7900a88aedcffc83b479aa3a4').shr(128);
  if ((absTick & 0x200) !== 0) ratio = ratio.mul('0xf987a7253ac413176f2b074cf7815e54').shr(128);
  if ((absTick & 0x400) !== 0) ratio = ratio.mul('0xf3392b0822b70005940c7a398e4b70f3').shr(128);
  if ((absTick & 0x800) !== 0) ratio = ratio.mul('0xe7159475a2c29b7443b29c7fa6e889d9').shr(128);
  if ((absTick & 0x1000) !== 0) ratio = ratio.mul('0xd097f3bdfd2022b8845ad8f792aa5825').shr(128);
  if ((absTick & 0x2000) !== 0) ratio = ratio.mul('0xa9f746462d870fdf8a65dc1f90e061e5').shr(128);
  if ((absTick & 0x4000) !== 0) ratio = ratio.mul('0x70d869a156d2a1b890bb3df62baf32f7').shr(128);
  if ((absTick & 0x8000) !== 0) ratio = ratio.mul('0x31be135f97d08fd981231505542fcfa6').shr(128);
  if ((absTick & 0x10000) !== 0) ratio = ratio.mul('0x9aa508b5b7a84e1c677de54f3e99bc9').shr(128);
  if ((absTick & 0x20000) !== 0) ratio = ratio.mul('0x5d6af8dedb81196699c329225ee604').shr(128);
  if ((absTick & 0x40000) !== 0) ratio = ratio.mul('0x2216e584f5fa1ea926041bedfe98').shr(128);
  if ((absTick & 0x80000) !== 0) ratio = ratio.mul('0x48a170391f7dc42444e8fa2').shr(128);

  if (tick > 0) ratio = Q192.div(ratio);

  // Back to Q96
  return ratio.shr(32);
}

/**
 * Returns the tick corresponding to a given sqrt ratio, s.t. #getSqrtRatioAtTick(tick) <= sqrtRatioX96
 * and #getSqrtRatioAtTick(tick + 1) > sqrtRatioX96
 * @param sqrtRatioX96 the sqrt ratio as a Q64.96 for which to compute the tick
 */
export function getTickAtSqrtRatio(sqrtRatioX96: BigNumber): number {
  if (sqrtRatioX96.lt(BigNumber.from('4295128739')) || sqrtRatioX96.gte(BigNumber.from('1461446703485210103287273052203988822378723970342'))) {
    throw new Error('SQRT_RATIO');
  }

  const sqrtRatioX128 = sqrtRatioX96.shl(32);

  const msb = mostSignificantBit(sqrtRatioX128);

  let r: BigNumber;
  if (msb >= 128) {
    r = sqrtRatioX128.shr(msb - 127);
  } else {
    r = sqrtRatioX128.shl(127 - msb);
  }

  let log_2 = BigNumber.from(msb - 128).shl(64);

  for (let i = 0; i < 14; i++) {
    r = r.mul(r).shr(127);
    const f = r.shr(128);
    log_2 = log_2.or(f.shl(63 - i));
    r = r.shr(f.toNumber());
  }

  const log_sqrt10001 = log_2.mul('255738958999603826347141');

  const tickLow = log_sqrt10001.sub('3402992956809132418596140100660247210').shr(128).toNumber();
  const tickHigh = log_sqrt10001.add('291339464771989622907027621153398088495').shr(128).toNumber();

  return tickLow === tickHigh ? tickLow : getSqrtRatioAtTick(tickHigh).lte(sqrtRatioX96) ? tickHigh : tickLow;
}

/**
 * Returns the most significant bit of the number
 */
function mostSignificantBit(x: BigNumber): number {
  if (x.isZero()) {
    throw new Error('ZERO');
  }

  let msb = 0;
  if (x.gte(BigNumber.from(2).pow(128))) {
    x = x.shr(128);
    msb += 128;
  }
  if (x.gte(BigNumber.from(2).pow(64))) {
    x = x.shr(64);
    msb += 64;
  }
  if (x.gte(BigNumber.from(2).pow(32))) {
    x = x.shr(32);
    msb += 32;
  }
  if (x.gte(BigNumber.from(2).pow(16))) {
    x = x.shr(16);
    msb += 16;
  }
  if (x.gte(BigNumber.from(2).pow(8))) {
    x = x.shr(8);
    msb += 8;
  }
  if (x.gte(BigNumber.from(2).pow(4))) {
    x = x.shr(4);
    msb += 4;
  }
  if (x.gte(BigNumber.from(2).pow(2))) {
    x = x.shr(2);
    msb += 2;
  }
  if (x.gte(BigNumber.from(2))) {
    msb += 1;
  }

  return msb;
}

/**
 * Computes the amount of token0 for a given amount of liquidity and a price range
 */
export function getAmount0Delta(
  sqrtRatioAX96: BigNumber,
  sqrtRatioBX96: BigNumber,
  liquidity: BigNumber
): BigNumber {
  if (sqrtRatioAX96.gt(sqrtRatioBX96)) {
    [sqrtRatioAX96, sqrtRatioBX96] = [sqrtRatioBX96, sqrtRatioAX96];
  }

  const numerator1 = liquidity.shl(96);
  const numerator2 = sqrtRatioBX96.sub(sqrtRatioAX96);

  return numerator1.mul(numerator2).div(sqrtRatioBX96).div(sqrtRatioAX96);
}

/**
 * Computes the amount of token1 for a given amount of liquidity and a price range
 */
export function getAmount1Delta(
  sqrtRatioAX96: BigNumber,
  sqrtRatioBX96: BigNumber,
  liquidity: BigNumber
): BigNumber {
  if (sqrtRatioAX96.gt(sqrtRatioBX96)) {
    [sqrtRatioAX96, sqrtRatioBX96] = [sqrtRatioBX96, sqrtRatioAX96];
  }

  return liquidity.mul(sqrtRatioBX96.sub(sqrtRatioAX96)).shr(96);
}

/**
 * Computes the maximum amount of liquidity received for a given amount of token0, token1,
 * and the prices at the tick boundaries.
 */
export function getLiquidityForAmounts(
  sqrtRatioX96: BigNumber,
  sqrtRatioAX96: BigNumber,
  sqrtRatioBX96: BigNumber,
  amount0: BigNumber,
  amount1: BigNumber
): BigNumber {
  if (sqrtRatioAX96.gt(sqrtRatioBX96)) {
    [sqrtRatioAX96, sqrtRatioBX96] = [sqrtRatioBX96, sqrtRatioAX96];
  }

  if (sqrtRatioX96.lte(sqrtRatioAX96)) {
    return getLiquidityForAmount0(sqrtRatioAX96, sqrtRatioBX96, amount0);
  } else if (sqrtRatioX96.lt(sqrtRatioBX96)) {
    const liquidity0 = getLiquidityForAmount0(sqrtRatioX96, sqrtRatioBX96, amount0);
    const liquidity1 = getLiquidityForAmount1(sqrtRatioAX96, sqrtRatioX96, amount1);
    return liquidity0.lt(liquidity1) ? liquidity0 : liquidity1;
  } else {
    return getLiquidityForAmount1(sqrtRatioAX96, sqrtRatioBX96, amount1);
  }
}

/**
 * Computes the amount of liquidity received for a given amount of token0 and price range
 */
export function getLiquidityForAmount0(
  sqrtRatioAX96: BigNumber,
  sqrtRatioBX96: BigNumber,
  amount0: BigNumber
): BigNumber {
  if (sqrtRatioAX96.gt(sqrtRatioBX96)) {
    [sqrtRatioAX96, sqrtRatioBX96] = [sqrtRatioBX96, sqrtRatioAX96];
  }

  const intermediate = sqrtRatioAX96.mul(sqrtRatioBX96).shr(96);
  return amount0.mul(intermediate).div(sqrtRatioBX96.sub(sqrtRatioAX96));
}

/**
 * Computes the amount of liquidity received for a given amount of token1 and price range
 */
export function getLiquidityForAmount1(
  sqrtRatioAX96: BigNumber,
  sqrtRatioBX96: BigNumber,
  amount1: BigNumber
): BigNumber {
  if (sqrtRatioAX96.gt(sqrtRatioBX96)) {
    [sqrtRatioAX96, sqrtRatioBX96] = [sqrtRatioBX96, sqrtRatioAX96];
  }

  return amount1.shl(96).div(sqrtRatioBX96.sub(sqrtRatioAX96));
}
