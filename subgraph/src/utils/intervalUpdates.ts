import { BigInt, BigDecimal, ethereum } from "@graphprotocol/graph-ts";
import {
  Pool,
  Token,
  FumaSwapDayData,
  PoolDayData,
  PoolHourData,
  TokenDayData,
  TokenHourData,
  Factory,
} from "../../generated/schema";
import {
  ZERO_BI,
  ZERO_BD,
  ONE_BI,
  FACTORY_ADDRESS,
  getDayId,
  getHourId,
} from "./helpers";

// Update FumaSwap day data
export function updateFumaSwapDayData(event: ethereum.Event): FumaSwapDayData {
  let dayId = getDayId(event.block.timestamp);
  let dayData = FumaSwapDayData.load(dayId.toString());
  
  if (dayData === null) {
    dayData = new FumaSwapDayData(dayId.toString());
    dayData.date = dayId;
    dayData.volumeUSD = ZERO_BD;
    dayData.volumeFUMA = ZERO_BD;
    dayData.feesUSD = ZERO_BD;
    dayData.tvlUSD = ZERO_BD;
    dayData.txCount = ZERO_BI;
  }
  
  // Load factory for totals
  let factory = Factory.load(FACTORY_ADDRESS);
  if (factory !== null) {
    dayData.tvlUSD = factory.totalValueLockedUSD;
    dayData.volumeUSD = factory.totalVolumeUSD;
    dayData.feesUSD = factory.totalFeesUSD;
  }
  
  dayData.txCount = dayData.txCount.plus(ONE_BI);
  dayData.save();
  
  return dayData as FumaSwapDayData;
}

// Update pool day data
export function updatePoolDayData(
  event: ethereum.Event,
  pool: Pool
): PoolDayData {
  let dayId = getDayId(event.block.timestamp);
  let poolDayId = pool.id + "-" + dayId.toString();
  let poolDayData = PoolDayData.load(poolDayId);
  
  if (poolDayData === null) {
    poolDayData = new PoolDayData(poolDayId);
    poolDayData.date = dayId;
    poolDayData.pool = pool.id;
    poolDayData.volumeToken0 = ZERO_BD;
    poolDayData.volumeToken1 = ZERO_BD;
    poolDayData.volumeUSD = ZERO_BD;
    poolDayData.feesUSD = ZERO_BD;
    poolDayData.txCount = ZERO_BI;
    poolDayData.open = pool.token0Price;
    poolDayData.high = pool.token0Price;
    poolDayData.low = pool.token0Price;
  }
  
  // Update current values
  poolDayData.liquidity = pool.liquidity;
  poolDayData.sqrtPrice = pool.sqrtPrice;
  poolDayData.tick = pool.tick;
  poolDayData.token0Price = pool.token0Price;
  poolDayData.token1Price = pool.token1Price;
  poolDayData.tvlUSD = pool.totalValueLockedUSD;
  poolDayData.close = pool.token0Price;
  
  // Update high/low
  if (pool.token0Price.gt(poolDayData.high)) {
    poolDayData.high = pool.token0Price;
  }
  if (pool.token0Price.lt(poolDayData.low)) {
    poolDayData.low = pool.token0Price;
  }
  
  poolDayData.txCount = poolDayData.txCount.plus(ONE_BI);
  poolDayData.save();
  
  return poolDayData as PoolDayData;
}

// Update pool hour data
export function updatePoolHourData(
  event: ethereum.Event,
  pool: Pool
): PoolHourData {
  let hourId = getHourId(event.block.timestamp);
  let hourStartUnix = hourId * 3600;
  let poolHourId = pool.id + "-" + hourId.toString();
  let poolHourData = PoolHourData.load(poolHourId);
  
  if (poolHourData === null) {
    poolHourData = new PoolHourData(poolHourId);
    poolHourData.periodStartUnix = hourStartUnix;
    poolHourData.pool = pool.id;
    poolHourData.volumeToken0 = ZERO_BD;
    poolHourData.volumeToken1 = ZERO_BD;
    poolHourData.volumeUSD = ZERO_BD;
    poolHourData.feesUSD = ZERO_BD;
    poolHourData.txCount = ZERO_BI;
    poolHourData.open = pool.token0Price;
    poolHourData.high = pool.token0Price;
    poolHourData.low = pool.token0Price;
  }
  
  // Update current values
  poolHourData.liquidity = pool.liquidity;
  poolHourData.sqrtPrice = pool.sqrtPrice;
  poolHourData.tick = pool.tick;
  poolHourData.token0Price = pool.token0Price;
  poolHourData.token1Price = pool.token1Price;
  poolHourData.tvlUSD = pool.totalValueLockedUSD;
  poolHourData.close = pool.token0Price;
  
  // Update high/low
  if (pool.token0Price.gt(poolHourData.high)) {
    poolHourData.high = pool.token0Price;
  }
  if (pool.token0Price.lt(poolHourData.low)) {
    poolHourData.low = pool.token0Price;
  }
  
  poolHourData.txCount = poolHourData.txCount.plus(ONE_BI);
  poolHourData.save();
  
  return poolHourData as PoolHourData;
}

// Update token day data
export function updateTokenDayData(
  token: Token,
  event: ethereum.Event
): TokenDayData {
  let dayId = getDayId(event.block.timestamp);
  let tokenDayId = token.id + "-" + dayId.toString();
  let tokenDayData = TokenDayData.load(tokenDayId);
  
  if (tokenDayData === null) {
    tokenDayData = new TokenDayData(tokenDayId);
    tokenDayData.date = dayId;
    tokenDayData.token = token.id;
    tokenDayData.volume = ZERO_BD;
    tokenDayData.volumeUSD = ZERO_BD;
    tokenDayData.untrackedVolumeUSD = ZERO_BD;
    tokenDayData.totalValueLocked = ZERO_BD;
    tokenDayData.totalValueLockedUSD = ZERO_BD;
    tokenDayData.priceUSD = ZERO_BD;
    tokenDayData.feesUSD = ZERO_BD;
    tokenDayData.open = ZERO_BD;
    tokenDayData.high = ZERO_BD;
    tokenDayData.low = ZERO_BD;
  }
  
  // Update values
  tokenDayData.totalValueLocked = token.totalValueLocked;
  tokenDayData.totalValueLockedUSD = token.totalValueLockedUSD;
  tokenDayData.close = token.derivedFUMA;
  
  // Set open price if first transaction of day
  if (tokenDayData.open.equals(ZERO_BD)) {
    tokenDayData.open = token.derivedFUMA;
  }
  
  // Update high/low
  if (token.derivedFUMA.gt(tokenDayData.high)) {
    tokenDayData.high = token.derivedFUMA;
  }
  if (tokenDayData.low.equals(ZERO_BD) || token.derivedFUMA.lt(tokenDayData.low)) {
    tokenDayData.low = token.derivedFUMA;
  }
  
  tokenDayData.save();
  
  return tokenDayData as TokenDayData;
}

// Update token hour data
export function updateTokenHourData(
  token: Token,
  event: ethereum.Event
): TokenHourData {
  let hourId = getHourId(event.block.timestamp);
  let hourStartUnix = hourId * 3600;
  let tokenHourId = token.id + "-" + hourId.toString();
  let tokenHourData = TokenHourData.load(tokenHourId);
  
  if (tokenHourData === null) {
    tokenHourData = new TokenHourData(tokenHourId);
    tokenHourData.periodStartUnix = hourStartUnix;
    tokenHourData.token = token.id;
    tokenHourData.volume = ZERO_BD;
    tokenHourData.volumeUSD = ZERO_BD;
    tokenHourData.untrackedVolumeUSD = ZERO_BD;
    tokenHourData.totalValueLocked = ZERO_BD;
    tokenHourData.totalValueLockedUSD = ZERO_BD;
    tokenHourData.priceUSD = ZERO_BD;
    tokenHourData.feesUSD = ZERO_BD;
    tokenHourData.open = ZERO_BD;
    tokenHourData.high = ZERO_BD;
    tokenHourData.low = ZERO_BD;
  }
  
  // Update values
  tokenHourData.totalValueLocked = token.totalValueLocked;
  tokenHourData.totalValueLockedUSD = token.totalValueLockedUSD;
  tokenHourData.close = token.derivedFUMA;
  
  // Set open price if first transaction of hour
  if (tokenHourData.open.equals(ZERO_BD)) {
    tokenHourData.open = token.derivedFUMA;
  }
  
  // Update high/low
  if (token.derivedFUMA.gt(tokenHourData.high)) {
    tokenHourData.high = token.derivedFUMA;
  }
  if (tokenHourData.low.equals(ZERO_BD) || token.derivedFUMA.lt(tokenHourData.low)) {
    tokenHourData.low = token.derivedFUMA;
  }
  
  tokenHourData.save();
  
  return tokenHourData as TokenHourData;
}
