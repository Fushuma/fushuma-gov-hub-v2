/**
 * Static pool data for initialized pools
 * Updated with WORKING pool - November 18, 2025
 * 
 * Pool initialized on CLPoolManager: 0xef02f995FEC090E21709A7eBAc2197d249B1a605
 * Fee tier: 0.05% (500) - Better for stablecoin pairs
 * 
 * FIXED: Using pool with correct sqrtPriceX96 value
 * 
 * Note: Only including USDT/WFUMA pool as it's fully functional.
 * WFUMA/USDC pool has incorrect initialization and needs to be recreated.
 */

import type { Pool } from './pools';

export const STATIC_POOLS: Pool[] = [
  {
    id: '0x390e74e189f584c21c6b1612c516e396cec8793025d0014702e63b8cee69715e',
    token0: '0x1e11d176117dbEDbd234b1c6a10C6eb8dceD275e', // USDT
    token1: '0xBcA7B11c788dBb85bE92627ef1e60a2A9B7e2c6E', // WFUMA
    token0Symbol: 'USDT',
    token1Symbol: 'WFUMA',
    fee: 500, // 0.05% - Better for stablecoin pairs
    liquidity: '0', // Will be populated when liquidity is added
    sqrtPriceX96: '204566235978907012552139472896', // CORRECT: 1 WFUMA = 0.15 USDT
    tick: 18972, // Correct tick value
    tvl: '0',
    volume24h: '0',
    apr: 0,
  },
];
