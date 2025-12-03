import { BigInt, BigDecimal, Address, Bytes, ethereum } from "@graphprotocol/graph-ts";
import {
  Initialize,
  Swap as SwapEvent,
  ModifyLiquidity,
  ProtocolFeeUpdated,
} from "../../generated/CLPoolManager/CLPoolManager";
import { ERC20 } from "../../generated/CLPoolManager/ERC20";
import {
  Factory,
  Pool,
  Token,
  Swap,
  Mint,
  Burn,
  Transaction,
  FumaSwapDayData,
  PoolDayData,
  PoolHourData,
  TokenDayData,
  Tick,
} from "../../generated/schema";
import {
  ZERO_BD,
  ZERO_BI,
  ONE_BI,
  FACTORY_ADDRESS,
  fetchTokenSymbol,
  fetchTokenName,
  fetchTokenDecimals,
  fetchTokenTotalSupply,
  exponentToBigDecimal,
  convertTokenToDecimal,
  safeDiv,
  sqrtPriceX96ToTokenPrices,
  getEthPriceInUSD,
  findEthPerToken,
} from "../utils/helpers";
import {
  updatePoolDayData,
  updatePoolHourData,
  updateTokenDayData,
  updateTokenHourData,
  updateFumaSwapDayData,
} from "../utils/intervalUpdates";

// Handle pool initialization
export function handleInitialize(event: Initialize): void {
  // Load or create factory
  let factory = Factory.load(FACTORY_ADDRESS);
  if (factory === null) {
    factory = new Factory(FACTORY_ADDRESS);
    factory.poolCount = ZERO_BI;
    factory.txCount = ZERO_BI;
    factory.totalVolumeUSD = ZERO_BD;
    factory.totalVolumeFUMA = ZERO_BD;
    factory.totalFeesUSD = ZERO_BD;
    factory.totalValueLockedUSD = ZERO_BD;
    factory.totalValueLockedFUMA = ZERO_BD;
    factory.owner = Address.fromString("0x0000000000000000000000000000000000000000");
  }
  factory.poolCount = factory.poolCount.plus(ONE_BI);
  factory.save();

  // Load or create tokens
  let token0 = Token.load(event.params.currency0.toHexString());
  let token1 = Token.load(event.params.currency1.toHexString());

  if (token0 === null) {
    token0 = new Token(event.params.currency0.toHexString());
    token0.symbol = fetchTokenSymbol(event.params.currency0);
    token0.name = fetchTokenName(event.params.currency0);
    token0.decimals = fetchTokenDecimals(event.params.currency0);
    token0.totalSupply = fetchTokenTotalSupply(event.params.currency0);
    token0.volume = ZERO_BD;
    token0.volumeUSD = ZERO_BD;
    token0.untrackedVolumeUSD = ZERO_BD;
    token0.feesUSD = ZERO_BD;
    token0.txCount = ZERO_BI;
    token0.poolCount = ZERO_BI;
    token0.totalValueLocked = ZERO_BD;
    token0.totalValueLockedUSD = ZERO_BD;
    token0.derivedFUMA = ZERO_BD;
    token0.whitelistPools = [];
  }
  token0.poolCount = token0.poolCount.plus(ONE_BI);

  if (token1 === null) {
    token1 = new Token(event.params.currency1.toHexString());
    token1.symbol = fetchTokenSymbol(event.params.currency1);
    token1.name = fetchTokenName(event.params.currency1);
    token1.decimals = fetchTokenDecimals(event.params.currency1);
    token1.totalSupply = fetchTokenTotalSupply(event.params.currency1);
    token1.volume = ZERO_BD;
    token1.volumeUSD = ZERO_BD;
    token1.untrackedVolumeUSD = ZERO_BD;
    token1.feesUSD = ZERO_BD;
    token1.txCount = ZERO_BI;
    token1.poolCount = ZERO_BI;
    token1.totalValueLocked = ZERO_BD;
    token1.totalValueLockedUSD = ZERO_BD;
    token1.derivedFUMA = ZERO_BD;
    token1.whitelistPools = [];
  }
  token1.poolCount = token1.poolCount.plus(ONE_BI);

  // Create pool
  let pool = new Pool(event.params.id.toHexString());
  pool.token0 = token0.id;
  pool.token1 = token1.id;
  pool.fee = BigInt.fromI32(event.params.fee);
  pool.hooks = event.params.hooks;

  // Decode tick spacing from parameters
  let parameters = event.params.parameters;
  let tickSpacing = BigInt.fromI32(parameters[0]); // First byte is tick spacing
  pool.tickSpacing = tickSpacing;

  // Initialize pool state
  pool.liquidity = ZERO_BI;
  pool.sqrtPrice = BigInt.fromI32(event.params.sqrtPriceX96.toI32());
  pool.tick = BigInt.fromI32(event.params.tick);

  pool.feeGrowthGlobal0X128 = ZERO_BI;
  pool.feeGrowthGlobal1X128 = ZERO_BI;
  pool.protocolFee = ZERO_BI;

  // Calculate initial prices
  let prices = sqrtPriceX96ToTokenPrices(
    pool.sqrtPrice,
    token0 as Token,
    token1 as Token
  );
  pool.token0Price = prices[0];
  pool.token1Price = prices[1];

  // Initialize volume and TVL
  pool.volumeToken0 = ZERO_BD;
  pool.volumeToken1 = ZERO_BD;
  pool.volumeUSD = ZERO_BD;
  pool.untrackedVolumeUSD = ZERO_BD;
  pool.feesUSD = ZERO_BD;
  pool.txCount = ZERO_BI;
  pool.totalValueLockedToken0 = ZERO_BD;
  pool.totalValueLockedToken1 = ZERO_BD;
  pool.totalValueLockedUSD = ZERO_BD;
  pool.totalValueLockedFUMA = ZERO_BD;

  // Set timestamps
  pool.createdAtTimestamp = event.block.timestamp;
  pool.createdAtBlockNumber = event.block.number;

  // Update token whitelist pools
  let token0Pools = token0.whitelistPools;
  token0Pools.push(pool.id);
  token0.whitelistPools = token0Pools;

  let token1Pools = token1.whitelistPools;
  token1Pools.push(pool.id);
  token1.whitelistPools = token1Pools;

  // Save all entities
  token0.save();
  token1.save();
  pool.save();
}

// Handle swap events
export function handleSwap(event: SwapEvent): void {
  let pool = Pool.load(event.params.id.toHexString());
  if (pool === null) {
    return;
  }

  let factory = Factory.load(FACTORY_ADDRESS);
  if (factory === null) {
    return;
  }

  let token0 = Token.load(pool.token0);
  let token1 = Token.load(pool.token1);
  if (token0 === null || token1 === null) {
    return;
  }

  // Load or create transaction
  let transaction = Transaction.load(event.transaction.hash.toHexString());
  if (transaction === null) {
    transaction = new Transaction(event.transaction.hash.toHexString());
    transaction.blockNumber = event.block.number;
    transaction.timestamp = event.block.timestamp;
    transaction.gasUsed = event.transaction.gasUsed;
    transaction.gasPrice = event.transaction.gasPrice;
    transaction.save();
  }

  // Convert amounts to decimal
  let amount0 = convertTokenToDecimal(
    BigInt.fromI32(event.params.amount0.toI32()).abs(),
    token0.decimals
  );
  let amount1 = convertTokenToDecimal(
    BigInt.fromI32(event.params.amount1.toI32()).abs(),
    token1.decimals
  );

  // Update pool state
  pool.sqrtPrice = BigInt.fromI32(event.params.sqrtPriceX96.toI32());
  pool.tick = BigInt.fromI32(event.params.tick);
  pool.liquidity = BigInt.fromI32(event.params.liquidity.toI32());

  // Recalculate prices
  let prices = sqrtPriceX96ToTokenPrices(
    pool.sqrtPrice,
    token0 as Token,
    token1 as Token
  );
  pool.token0Price = prices[0];
  pool.token1Price = prices[1];

  // Calculate USD amounts (simplified - using token0 price if available)
  let amountUSD = ZERO_BD;
  let fumaPrice = getEthPriceInUSD();
  if (token0.derivedFUMA.gt(ZERO_BD)) {
    amountUSD = amount0.times(token0.derivedFUMA).times(fumaPrice);
  } else if (token1.derivedFUMA.gt(ZERO_BD)) {
    amountUSD = amount1.times(token1.derivedFUMA).times(fumaPrice);
  }

  // Calculate fees
  let feeAmount = amountUSD.times(
    BigDecimal.fromString(pool.fee.toString()).div(BigDecimal.fromString("1000000"))
  );

  // Update pool volume
  pool.volumeToken0 = pool.volumeToken0.plus(amount0);
  pool.volumeToken1 = pool.volumeToken1.plus(amount1);
  pool.volumeUSD = pool.volumeUSD.plus(amountUSD);
  pool.feesUSD = pool.feesUSD.plus(feeAmount);
  pool.txCount = pool.txCount.plus(ONE_BI);

  // Update token volume
  token0.volume = token0.volume.plus(amount0);
  token0.volumeUSD = token0.volumeUSD.plus(amountUSD);
  token0.txCount = token0.txCount.plus(ONE_BI);

  token1.volume = token1.volume.plus(amount1);
  token1.volumeUSD = token1.volumeUSD.plus(amountUSD);
  token1.txCount = token1.txCount.plus(ONE_BI);

  // Update factory totals
  factory.totalVolumeUSD = factory.totalVolumeUSD.plus(amountUSD);
  factory.totalFeesUSD = factory.totalFeesUSD.plus(feeAmount);
  factory.txCount = factory.txCount.plus(ONE_BI);

  // Create swap entity
  let swap = new Swap(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
  );
  swap.transaction = transaction.id;
  swap.timestamp = event.block.timestamp;
  swap.pool = pool.id;
  swap.token0 = token0.id;
  swap.token1 = token1.id;
  swap.sender = event.params.sender;
  swap.recipient = event.params.sender; // V4 doesn't have separate recipient in event
  swap.origin = event.transaction.from;
  swap.amount0 = amount0;
  swap.amount1 = amount1;
  swap.amountUSD = amountUSD;
  swap.sqrtPriceX96 = pool.sqrtPrice;
  swap.tick = pool.tick!;
  swap.logIndex = event.logIndex;
  swap.save();

  // Update interval data
  updatePoolDayData(event, pool as Pool);
  updatePoolHourData(event, pool as Pool);
  updateTokenDayData(token0 as Token, event);
  updateTokenDayData(token1 as Token, event);
  updateFumaSwapDayData(event);

  // Save entities
  token0.save();
  token1.save();
  pool.save();
  factory.save();
}

// Handle liquidity modifications
export function handleModifyLiquidity(event: ModifyLiquidity): void {
  let pool = Pool.load(event.params.id.toHexString());
  if (pool === null) {
    return;
  }

  let factory = Factory.load(FACTORY_ADDRESS);
  if (factory === null) {
    return;
  }

  let token0 = Token.load(pool.token0);
  let token1 = Token.load(pool.token1);
  if (token0 === null || token1 === null) {
    return;
  }

  // Load or create transaction
  let transaction = Transaction.load(event.transaction.hash.toHexString());
  if (transaction === null) {
    transaction = new Transaction(event.transaction.hash.toHexString());
    transaction.blockNumber = event.block.number;
    transaction.timestamp = event.block.timestamp;
    transaction.gasUsed = event.transaction.gasUsed;
    transaction.gasPrice = event.transaction.gasPrice;
    transaction.save();
  }

  let liquidityDelta = event.params.liquidityDelta;
  let isAdd = liquidityDelta.gt(ZERO_BI);

  // Update pool counters
  pool.txCount = pool.txCount.plus(ONE_BI);
  factory.txCount = factory.txCount.plus(ONE_BI);

  // Create tick entities if they don't exist
  let tickLowerId = pool.id + "#" + event.params.tickLower.toString();
  let tickUpperId = pool.id + "#" + event.params.tickUpper.toString();

  let tickLower = Tick.load(tickLowerId);
  if (tickLower === null) {
    tickLower = new Tick(tickLowerId);
    tickLower.poolAddress = Bytes.fromHexString(pool.id);
    tickLower.pool = pool.id;
    tickLower.tickIdx = BigInt.fromI32(event.params.tickLower);
    tickLower.liquidityGross = ZERO_BI;
    tickLower.liquidityNet = ZERO_BI;
    tickLower.price0 = ZERO_BD;
    tickLower.price1 = ZERO_BD;
    tickLower.feeGrowthOutside0X128 = ZERO_BI;
    tickLower.feeGrowthOutside1X128 = ZERO_BI;
    tickLower.createdAtTimestamp = event.block.timestamp;
    tickLower.createdAtBlockNumber = event.block.number;
  }

  let tickUpper = Tick.load(tickUpperId);
  if (tickUpper === null) {
    tickUpper = new Tick(tickUpperId);
    tickUpper.poolAddress = Bytes.fromHexString(pool.id);
    tickUpper.pool = pool.id;
    tickUpper.tickIdx = BigInt.fromI32(event.params.tickUpper);
    tickUpper.liquidityGross = ZERO_BI;
    tickUpper.liquidityNet = ZERO_BI;
    tickUpper.price0 = ZERO_BD;
    tickUpper.price1 = ZERO_BD;
    tickUpper.feeGrowthOutside0X128 = ZERO_BI;
    tickUpper.feeGrowthOutside1X128 = ZERO_BI;
    tickUpper.createdAtTimestamp = event.block.timestamp;
    tickUpper.createdAtBlockNumber = event.block.number;
  }

  // Update tick liquidity
  let absLiquidity = liquidityDelta.abs();
  if (isAdd) {
    tickLower.liquidityGross = tickLower.liquidityGross.plus(absLiquidity);
    tickLower.liquidityNet = tickLower.liquidityNet.plus(absLiquidity);
    tickUpper.liquidityGross = tickUpper.liquidityGross.plus(absLiquidity);
    tickUpper.liquidityNet = tickUpper.liquidityNet.minus(absLiquidity);
  } else {
    tickLower.liquidityGross = tickLower.liquidityGross.minus(absLiquidity);
    tickLower.liquidityNet = tickLower.liquidityNet.minus(absLiquidity);
    tickUpper.liquidityGross = tickUpper.liquidityGross.minus(absLiquidity);
    tickUpper.liquidityNet = tickUpper.liquidityNet.plus(absLiquidity);
  }

  tickLower.save();
  tickUpper.save();

  // Create Mint or Burn entity
  if (isAdd) {
    let mint = new Mint(
      event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
    );
    mint.transaction = transaction.id;
    mint.timestamp = event.block.timestamp;
    mint.pool = pool.id;
    mint.token0 = token0.id;
    mint.token1 = token1.id;
    mint.owner = event.params.sender;
    mint.sender = event.params.sender;
    mint.origin = event.transaction.from;
    mint.amount = liquidityDelta;
    mint.amount0 = ZERO_BD; // Would need additional calculation
    mint.amount1 = ZERO_BD;
    mint.amountUSD = ZERO_BD;
    mint.tickLower = BigInt.fromI32(event.params.tickLower);
    mint.tickUpper = BigInt.fromI32(event.params.tickUpper);
    mint.logIndex = event.logIndex;
    mint.save();
  } else {
    let burn = new Burn(
      event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
    );
    burn.transaction = transaction.id;
    burn.timestamp = event.block.timestamp;
    burn.pool = pool.id;
    burn.token0 = token0.id;
    burn.token1 = token1.id;
    burn.owner = event.params.sender;
    burn.origin = event.transaction.from;
    burn.amount = liquidityDelta.abs();
    burn.amount0 = ZERO_BD;
    burn.amount1 = ZERO_BD;
    burn.amountUSD = ZERO_BD;
    burn.tickLower = BigInt.fromI32(event.params.tickLower);
    burn.tickUpper = BigInt.fromI32(event.params.tickUpper);
    burn.logIndex = event.logIndex;
    burn.save();
  }

  // Update interval data
  updatePoolDayData(event, pool as Pool);
  updatePoolHourData(event, pool as Pool);
  updateFumaSwapDayData(event);

  pool.save();
  factory.save();
}

// Handle protocol fee updates
export function handleProtocolFeeUpdated(event: ProtocolFeeUpdated): void {
  let pool = Pool.load(event.params.id.toHexString());
  if (pool === null) {
    return;
  }

  pool.protocolFee = BigInt.fromI32(event.params.protocolFee);
  pool.save();
}
