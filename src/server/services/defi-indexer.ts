/**
 * DeFi Event Indexer Service
 *
 * Indexes swap, mint, and burn events from FumaSwap contracts
 * to track volume, TVL, and transaction history.
 */

import { createPublicClient, http, parseAbiItem, type Address, type Log, formatUnits } from 'viem';
import { defineChain } from 'viem';
import { db } from '@/db';
import { blockchainEvents, indexerState, tokenPrices } from '@/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';

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
      http: [process.env.NEXT_PUBLIC_FUSHUMA_RPC_URL || 'https://rpc.fushuma.com'],
    },
    public: {
      http: ['https://rpc.fushuma.com'],
    },
  },
});

// Contract addresses
const VAULT_ADDRESS = '0x9c6bAfE545fF2d31B0abef12F4724DCBfB08c839';
const CL_POOL_MANAGER_ADDRESS = '0x2D691Ff314F7BB2Ce9Aeb94d556440Bb0DdbFe1e';
const CL_POSITION_MANAGER_ADDRESS = '0x750525284ec59F21CF1c03C62A062f6B6473B7b1';
const FUMA_INFINITY_ROUTER_ADDRESS = '0x662F4e8CdB064B58FE686AFCd2ceDbB921a0f11f';

// Create public client
const publicClient = createPublicClient({
  chain: fushuma,
  transport: http(),
});

// Event types
export interface SwapEvent {
  poolId: string;
  sender: string;
  amount0: bigint;
  amount1: bigint;
  sqrtPriceX96: bigint;
  liquidity: bigint;
  tick: number;
  fee: number;
  transactionHash: string;
  blockNumber: number;
  timestamp: Date;
}

export interface LiquidityEvent {
  type: 'mint' | 'burn';
  poolId: string;
  owner: string;
  tickLower: number;
  tickUpper: number;
  amount: bigint;
  amount0: bigint;
  amount1: bigint;
  transactionHash: string;
  blockNumber: number;
  timestamp: Date;
}

export interface PoolStats {
  poolId: string;
  volume24h: string;
  volume7d: string;
  fees24h: string;
  tvl: string;
  transactionCount24h: number;
}

/**
 * Get the last processed block for DeFi events
 */
async function getLastProcessedBlock(contractAddress: string): Promise<number> {
  try {
    const [state] = await db
      .select()
      .from(indexerState)
      .where(eq(indexerState.contractAddress, contractAddress.toLowerCase()))
      .limit(1);

    return state?.lastProcessedBlock || 0;
  } catch (error) {
    console.error('Error getting last processed block:', error);
    return 0;
  }
}

/**
 * Update the last processed block
 */
async function updateLastProcessedBlock(contractAddress: string, blockNumber: number): Promise<void> {
  try {
    await db
      .insert(indexerState)
      .values({
        contractAddress: contractAddress.toLowerCase(),
        lastProcessedBlock: blockNumber,
      })
      .onDuplicateKeyUpdate({
        set: { lastProcessedBlock: blockNumber },
      });
  } catch (error) {
    console.error('Error updating last processed block:', error);
  }
}

/**
 * Index swap events from the CLPoolManager
 */
export async function indexSwapEvents(fromBlock?: number): Promise<SwapEvent[]> {
  try {
    const startBlock = fromBlock ?? await getLastProcessedBlock(CL_POOL_MANAGER_ADDRESS);
    const currentBlock = await publicClient.getBlockNumber();

    console.log(`Indexing swap events from block ${startBlock} to ${currentBlock}`);

    const fromBlockNumber = startBlock === 0 ? BigInt(1) : BigInt(startBlock);

    // Fetch Swap events from CLPoolManager
    const logs = await publicClient.getLogs({
      address: CL_POOL_MANAGER_ADDRESS as Address,
      event: parseAbiItem('event Swap(bytes32 indexed id, address indexed sender, int128 amount0, int128 amount1, uint160 sqrtPriceX96, uint128 liquidity, int24 tick, uint24 fee)'),
      fromBlock: fromBlockNumber,
      toBlock: currentBlock,
    });

    console.log(`Found ${logs.length} Swap events`);

    const swapEvents: SwapEvent[] = [];

    for (const log of logs) {
      try {
        const { id, sender, amount0, amount1, sqrtPriceX96, liquidity, tick, fee } = log.args as {
          id: `0x${string}`;
          sender: Address;
          amount0: bigint;
          amount1: bigint;
          sqrtPriceX96: bigint;
          liquidity: bigint;
          tick: number;
          fee: number;
        };

        // Get block timestamp
        const block = await publicClient.getBlock({ blockNumber: log.blockNumber });
        const timestamp = new Date(Number(block.timestamp) * 1000);

        const swapEvent: SwapEvent = {
          poolId: id,
          sender,
          amount0,
          amount1,
          sqrtPriceX96,
          liquidity,
          tick: Number(tick),
          fee: Number(fee),
          transactionHash: log.transactionHash,
          blockNumber: Number(log.blockNumber),
          timestamp,
        };

        swapEvents.push(swapEvent);

        // Store in database
        await db.insert(blockchainEvents).values({
          eventType: 'Swap',
          contractAddress: CL_POOL_MANAGER_ADDRESS.toLowerCase(),
          blockNumber: Number(log.blockNumber),
          transactionHash: log.transactionHash,
          eventData: {
            poolId: id,
            sender,
            amount0: amount0.toString(),
            amount1: amount1.toString(),
            sqrtPriceX96: sqrtPriceX96.toString(),
            liquidity: liquidity.toString(),
            tick: Number(tick),
            fee: Number(fee),
            timestamp: timestamp.toISOString(),
          },
        });
      } catch (eventError) {
        console.error('Error processing swap event:', eventError);
      }
    }

    // Update last processed block
    await updateLastProcessedBlock(CL_POOL_MANAGER_ADDRESS, Number(currentBlock));

    return swapEvents;
  } catch (error) {
    console.error('Error indexing swap events:', error);
    return [];
  }
}

/**
 * Index liquidity events (mint/burn) from CLPositionManager
 */
export async function indexLiquidityEvents(fromBlock?: number): Promise<LiquidityEvent[]> {
  try {
    const startBlock = fromBlock ?? await getLastProcessedBlock(CL_POSITION_MANAGER_ADDRESS);
    const currentBlock = await publicClient.getBlockNumber();

    console.log(`Indexing liquidity events from block ${startBlock} to ${currentBlock}`);

    const fromBlockNumber = startBlock === 0 ? BigInt(1) : BigInt(startBlock);

    // Fetch IncreaseLiquidity events (mints)
    const mintLogs = await publicClient.getLogs({
      address: CL_POSITION_MANAGER_ADDRESS as Address,
      event: parseAbiItem('event IncreaseLiquidity(uint256 indexed tokenId, uint128 liquidity, uint256 amount0, uint256 amount1)'),
      fromBlock: fromBlockNumber,
      toBlock: currentBlock,
    });

    // Fetch DecreaseLiquidity events (burns)
    const burnLogs = await publicClient.getLogs({
      address: CL_POSITION_MANAGER_ADDRESS as Address,
      event: parseAbiItem('event DecreaseLiquidity(uint256 indexed tokenId, uint128 liquidity, uint256 amount0, uint256 amount1)'),
      fromBlock: fromBlockNumber,
      toBlock: currentBlock,
    });

    console.log(`Found ${mintLogs.length} IncreaseLiquidity and ${burnLogs.length} DecreaseLiquidity events`);

    const liquidityEvents: LiquidityEvent[] = [];

    // Process mint events
    for (const log of mintLogs) {
      try {
        const { tokenId, liquidity, amount0, amount1 } = log.args as {
          tokenId: bigint;
          liquidity: bigint;
          amount0: bigint;
          amount1: bigint;
        };

        const block = await publicClient.getBlock({ blockNumber: log.blockNumber });
        const timestamp = new Date(Number(block.timestamp) * 1000);

        liquidityEvents.push({
          type: 'mint',
          poolId: '', // Would need to look up from position
          owner: '', // Would need to query ownerOf
          tickLower: 0,
          tickUpper: 0,
          amount: liquidity,
          amount0,
          amount1,
          transactionHash: log.transactionHash,
          blockNumber: Number(log.blockNumber),
          timestamp,
        });

        await db.insert(blockchainEvents).values({
          eventType: 'IncreaseLiquidity',
          contractAddress: CL_POSITION_MANAGER_ADDRESS.toLowerCase(),
          blockNumber: Number(log.blockNumber),
          transactionHash: log.transactionHash,
          eventData: {
            tokenId: tokenId.toString(),
            liquidity: liquidity.toString(),
            amount0: amount0.toString(),
            amount1: amount1.toString(),
            timestamp: timestamp.toISOString(),
          },
        });
      } catch (eventError) {
        console.error('Error processing mint event:', eventError);
      }
    }

    // Process burn events
    for (const log of burnLogs) {
      try {
        const { tokenId, liquidity, amount0, amount1 } = log.args as {
          tokenId: bigint;
          liquidity: bigint;
          amount0: bigint;
          amount1: bigint;
        };

        const block = await publicClient.getBlock({ blockNumber: log.blockNumber });
        const timestamp = new Date(Number(block.timestamp) * 1000);

        liquidityEvents.push({
          type: 'burn',
          poolId: '',
          owner: '',
          tickLower: 0,
          tickUpper: 0,
          amount: liquidity,
          amount0,
          amount1,
          transactionHash: log.transactionHash,
          blockNumber: Number(log.blockNumber),
          timestamp,
        });

        await db.insert(blockchainEvents).values({
          eventType: 'DecreaseLiquidity',
          contractAddress: CL_POSITION_MANAGER_ADDRESS.toLowerCase(),
          blockNumber: Number(log.blockNumber),
          transactionHash: log.transactionHash,
          eventData: {
            tokenId: tokenId.toString(),
            liquidity: liquidity.toString(),
            amount0: amount0.toString(),
            amount1: amount1.toString(),
            timestamp: timestamp.toISOString(),
          },
        });
      } catch (eventError) {
        console.error('Error processing burn event:', eventError);
      }
    }

    // Update last processed block
    await updateLastProcessedBlock(CL_POSITION_MANAGER_ADDRESS, Number(currentBlock));

    return liquidityEvents;
  } catch (error) {
    console.error('Error indexing liquidity events:', error);
    return [];
  }
}

/**
 * Calculate pool statistics from indexed events
 */
export async function calculatePoolStats(poolId: string): Promise<PoolStats> {
  try {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Query swap events for this pool
    const swapEvents = await db
      .select()
      .from(blockchainEvents)
      .where(
        and(
          eq(blockchainEvents.eventType, 'Swap'),
          sql`JSON_EXTRACT(${blockchainEvents.eventData}, '$.poolId') = ${poolId}`
        )
      );

    // Calculate 24h volume
    let volume24h = 0n;
    let volume7d = 0n;
    let transactionCount24h = 0;

    for (const event of swapEvents) {
      const eventData = event.eventData as { amount0: string; amount1: string; timestamp: string };
      const eventTime = new Date(eventData.timestamp);

      const amount0 = BigInt(eventData.amount0);
      const amount1 = BigInt(eventData.amount1);
      const volume = amount0 < 0n ? -amount0 : amount0; // Use absolute value

      if (eventTime >= sevenDaysAgo) {
        volume7d += volume;
      }

      if (eventTime >= oneDayAgo) {
        volume24h += volume;
        transactionCount24h++;
      }
    }

    // Format volumes (assuming 18 decimals)
    const volume24hFormatted = formatUnits(volume24h, 18);
    const volume7dFormatted = formatUnits(volume7d, 18);

    // Estimate fees (assuming 0.3% fee tier)
    const fees24h = formatUnits(volume24h * 3n / 1000n, 18);

    return {
      poolId,
      volume24h: volume24hFormatted,
      volume7d: volume7dFormatted,
      fees24h,
      tvl: '0', // Would need current liquidity position values
      transactionCount24h,
    };
  } catch (error) {
    console.error('Error calculating pool stats:', error);
    return {
      poolId,
      volume24h: '0',
      volume7d: '0',
      fees24h: '0',
      tvl: '0',
      transactionCount24h: 0,
    };
  }
}

/**
 * Get recent transactions from indexed events
 */
export async function getRecentTransactions(limit: number = 20, type?: 'swap' | 'mint' | 'burn') {
  try {
    let eventTypes: string[];
    if (type === 'swap') {
      eventTypes = ['Swap'];
    } else if (type === 'mint') {
      eventTypes = ['IncreaseLiquidity'];
    } else if (type === 'burn') {
      eventTypes = ['DecreaseLiquidity'];
    } else {
      eventTypes = ['Swap', 'IncreaseLiquidity', 'DecreaseLiquidity'];
    }

    const events = await db
      .select()
      .from(blockchainEvents)
      .where(
        sql`${blockchainEvents.eventType} IN (${sql.join(eventTypes.map(e => sql`${e}`), sql`, `)})`
      )
      .orderBy(desc(blockchainEvents.blockNumber))
      .limit(limit);

    return events.map(event => ({
      id: event.id,
      type: event.eventType === 'Swap' ? 'swap' : event.eventType === 'IncreaseLiquidity' ? 'mint' : 'burn',
      transactionHash: event.transactionHash,
      blockNumber: event.blockNumber,
      data: event.eventData,
      processedAt: event.processedAt,
    }));
  } catch (error) {
    console.error('Error getting recent transactions:', error);
    return [];
  }
}

/**
 * Run full indexing job
 */
export async function runFullIndexing(): Promise<{
  swaps: number;
  liquidityEvents: number;
}> {
  console.log('Starting full DeFi event indexing...');

  const swapEvents = await indexSwapEvents();
  const liquidityEvents = await indexLiquidityEvents();

  console.log(`Indexed ${swapEvents.length} swaps and ${liquidityEvents.length} liquidity events`);

  return {
    swaps: swapEvents.length,
    liquidityEvents: liquidityEvents.length,
  };
}
