import { BigInt, BigDecimal, Address, Bytes } from "@graphprotocol/graph-ts";
import {
  Transfer,
  IncreaseLiquidity,
  DecreaseLiquidity,
  Collect as CollectEvent,
} from "../../generated/CLPositionManager/CLPositionManager";
import { CLPositionManager } from "../../generated/CLPositionManager/CLPositionManager";
import {
  Position,
  PositionSnapshot,
  Pool,
  Token,
  Transaction,
  Tick,
  Collect,
} from "../../generated/schema";
import {
  ZERO_BD,
  ZERO_BI,
  ONE_BI,
  ADDRESS_ZERO,
  convertTokenToDecimal,
} from "../utils/helpers";

let POSITION_MANAGER_ADDRESS = "0x750525284ec59F21CF1c03C62A062f6B6473B7b1";

// Handle position NFT transfers
export function handleTransfer(event: Transfer): void {
  let tokenId = event.params.tokenId;
  let from = event.params.from;
  let to = event.params.to;

  // Handle mint (transfer from zero address)
  if (from.toHexString() == ADDRESS_ZERO) {
    // Create new position
    let position = new Position(tokenId.toString());
    position.owner = to;

    // Fetch position data from contract
    let positionManager = CLPositionManager.bind(
      Address.fromString(POSITION_MANAGER_ADDRESS)
    );
    let positionData = positionManager.try_positions(tokenId);

    if (!positionData.reverted) {
      let poolKey = positionData.value.getPoolKey();
      let tickLower = positionData.value.getTickLower();
      let tickUpper = positionData.value.getTickUpper();
      let liquidity = positionData.value.getLiquidity();

      // Calculate pool ID from poolKey (simplified - would need proper encoding)
      let poolId = poolKey.currency0.toHexString() + "-" + poolKey.currency1.toHexString() + "-" + poolKey.fee.toString();

      // Try to find the pool
      let pool = Pool.load(poolId);
      if (pool !== null) {
        position.pool = pool.id;
        position.token0 = pool.token0;
        position.token1 = pool.token1;

        // Create or load tick entities
        let tickLowerId = pool.id + "#" + tickLower.toString();
        let tickUpperId = pool.id + "#" + tickUpper.toString();

        let tickLowerEntity = Tick.load(tickLowerId);
        let tickUpperEntity = Tick.load(tickUpperId);

        if (tickLowerEntity !== null && tickUpperEntity !== null) {
          position.tickLower = tickLowerEntity.id;
          position.tickUpper = tickUpperEntity.id;
        }
      }

      position.liquidity = BigInt.fromI32(liquidity.toI32());
      position.feeGrowthInside0LastX128 = positionData.value.getFeeGrowthInside0LastX128();
      position.feeGrowthInside1LastX128 = positionData.value.getFeeGrowthInside1LastX128();
    } else {
      position.liquidity = ZERO_BI;
      position.feeGrowthInside0LastX128 = ZERO_BI;
      position.feeGrowthInside1LastX128 = ZERO_BI;
    }

    position.depositedToken0 = ZERO_BD;
    position.depositedToken1 = ZERO_BD;
    position.withdrawnToken0 = ZERO_BD;
    position.withdrawnToken1 = ZERO_BD;
    position.collectedFeesToken0 = ZERO_BD;
    position.collectedFeesToken1 = ZERO_BD;
    position.createdAtTimestamp = event.block.timestamp;
    position.createdAtBlockNumber = event.block.number;

    // Create transaction reference
    let transaction = Transaction.load(event.transaction.hash.toHexString());
    if (transaction === null) {
      transaction = new Transaction(event.transaction.hash.toHexString());
      transaction.blockNumber = event.block.number;
      transaction.timestamp = event.block.timestamp;
      transaction.gasUsed = event.transaction.gasUsed;
      transaction.gasPrice = event.transaction.gasPrice;
      transaction.save();
    }
    position.transaction = transaction.id;

    position.save();
  }
  // Handle burn (transfer to zero address)
  else if (to.toHexString() == ADDRESS_ZERO) {
    // Position burned - could remove or keep for history
    let position = Position.load(tokenId.toString());
    if (position !== null) {
      position.liquidity = ZERO_BI;
      position.save();
    }
  }
  // Handle regular transfer
  else {
    let position = Position.load(tokenId.toString());
    if (position !== null) {
      position.owner = to;
      position.save();
    }
  }
}

// Handle liquidity increase
export function handleIncreaseLiquidity(event: IncreaseLiquidity): void {
  let position = Position.load(event.params.tokenId.toString());
  if (position === null) {
    return;
  }

  // Load transaction
  let transaction = Transaction.load(event.transaction.hash.toHexString());
  if (transaction === null) {
    transaction = new Transaction(event.transaction.hash.toHexString());
    transaction.blockNumber = event.block.number;
    transaction.timestamp = event.block.timestamp;
    transaction.gasUsed = event.transaction.gasUsed;
    transaction.gasPrice = event.transaction.gasPrice;
    transaction.save();
  }

  // Update position liquidity
  position.liquidity = position.liquidity.plus(
    BigInt.fromI32(event.params.liquidity.toI32())
  );

  // Update deposited amounts
  let token0 = Token.load(position.token0);
  let token1 = Token.load(position.token1);

  if (token0 !== null && token1 !== null) {
    let amount0 = convertTokenToDecimal(event.params.amount0, token0.decimals);
    let amount1 = convertTokenToDecimal(event.params.amount1, token1.decimals);

    position.depositedToken0 = position.depositedToken0.plus(amount0);
    position.depositedToken1 = position.depositedToken1.plus(amount1);
  }

  position.save();

  // Create position snapshot
  createPositionSnapshot(position as Position, event, transaction as Transaction);
}

// Handle liquidity decrease
export function handleDecreaseLiquidity(event: DecreaseLiquidity): void {
  let position = Position.load(event.params.tokenId.toString());
  if (position === null) {
    return;
  }

  // Load transaction
  let transaction = Transaction.load(event.transaction.hash.toHexString());
  if (transaction === null) {
    transaction = new Transaction(event.transaction.hash.toHexString());
    transaction.blockNumber = event.block.number;
    transaction.timestamp = event.block.timestamp;
    transaction.gasUsed = event.transaction.gasUsed;
    transaction.gasPrice = event.transaction.gasPrice;
    transaction.save();
  }

  // Update position liquidity
  let liquidityDelta = BigInt.fromI32(event.params.liquidity.toI32());
  if (position.liquidity.gt(liquidityDelta)) {
    position.liquidity = position.liquidity.minus(liquidityDelta);
  } else {
    position.liquidity = ZERO_BI;
  }

  // Update withdrawn amounts
  let token0 = Token.load(position.token0);
  let token1 = Token.load(position.token1);

  if (token0 !== null && token1 !== null) {
    let amount0 = convertTokenToDecimal(event.params.amount0, token0.decimals);
    let amount1 = convertTokenToDecimal(event.params.amount1, token1.decimals);

    position.withdrawnToken0 = position.withdrawnToken0.plus(amount0);
    position.withdrawnToken1 = position.withdrawnToken1.plus(amount1);
  }

  position.save();

  // Create position snapshot
  createPositionSnapshot(position as Position, event, transaction as Transaction);
}

// Handle fee collection
export function handleCollect(event: CollectEvent): void {
  let position = Position.load(event.params.tokenId.toString());
  if (position === null) {
    return;
  }

  // Load transaction
  let transaction = Transaction.load(event.transaction.hash.toHexString());
  if (transaction === null) {
    transaction = new Transaction(event.transaction.hash.toHexString());
    transaction.blockNumber = event.block.number;
    transaction.timestamp = event.block.timestamp;
    transaction.gasUsed = event.transaction.gasUsed;
    transaction.gasPrice = event.transaction.gasPrice;
    transaction.save();
  }

  // Update collected fees
  let token0 = Token.load(position.token0);
  let token1 = Token.load(position.token1);

  if (token0 !== null && token1 !== null) {
    let amount0 = convertTokenToDecimal(event.params.amount0, token0.decimals);
    let amount1 = convertTokenToDecimal(event.params.amount1, token1.decimals);

    position.collectedFeesToken0 = position.collectedFeesToken0.plus(amount0);
    position.collectedFeesToken1 = position.collectedFeesToken1.plus(amount1);

    // Create Collect entity
    let pool = Pool.load(position.pool);
    if (pool !== null) {
      let collect = new Collect(
        event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
      );
      collect.transaction = transaction.id;
      collect.timestamp = event.block.timestamp;
      collect.pool = pool.id;
      collect.owner = position.owner;
      collect.amount0 = amount0;
      collect.amount1 = amount1;
      collect.amountUSD = ZERO_BD; // Would need price calculation
      collect.tickLower = ZERO_BI; // Would need to fetch from position
      collect.tickUpper = ZERO_BI;
      collect.logIndex = event.logIndex;
      collect.save();
    }
  }

  position.save();

  // Create position snapshot
  createPositionSnapshot(position as Position, event, transaction as Transaction);
}

// Helper function to create position snapshots
function createPositionSnapshot(
  position: Position,
  event: ethereum.Event,
  transaction: Transaction
): void {
  let snapshotId = position.id + "-" + event.block.timestamp.toString();
  let snapshot = new PositionSnapshot(snapshotId);

  snapshot.owner = position.owner;
  snapshot.pool = position.pool;
  snapshot.position = position.id;
  snapshot.timestamp = event.block.timestamp;
  snapshot.blockNumber = event.block.number;
  snapshot.liquidity = position.liquidity;
  snapshot.depositedToken0 = position.depositedToken0;
  snapshot.depositedToken1 = position.depositedToken1;
  snapshot.withdrawnToken0 = position.withdrawnToken0;
  snapshot.withdrawnToken1 = position.withdrawnToken1;
  snapshot.collectedFeesToken0 = position.collectedFeesToken0;
  snapshot.collectedFeesToken1 = position.collectedFeesToken1;
  snapshot.transaction = transaction.id;
  snapshot.feeGrowthInside0LastX128 = position.feeGrowthInside0LastX128;
  snapshot.feeGrowthInside1LastX128 = position.feeGrowthInside1LastX128;

  snapshot.save();
}
