/**
 * Static pool data for initialized pools
 * Updated with CORRECT pool - November 20, 2025
 * 
 * Pool initialized on CLPoolManager: 0x2D691Ff314F7BB2Ce9Aeb94d556440Bb0DdbFe1e
 * Fee tier: 0.3% (3000) - Standard tier for most pairs
 * 
 * Price: 1 FUMA = 0.0015 USDT (666.67 FUMA per 1 USDT)
 * Initial tick: 341350
 * sqrtPriceX96: 2045662359789070127264287784752381952
 * 
 * This is the ACTIVE pool for WFUMA/USDT trading.
 */

import type { Pool } from './pools';

export const STATIC_POOLS: Pool[] = [
  {
    id: '0xd10c2ad6aed8e4657623710081889cbb99f85521be73d2c6b9b6d17fd63b97e8',
    token0: '0x1e11d176117dbEDbd234b1c6a10C6eb8dceD275e', // USDT
    token1: '0xBcA7B11c788dBb85bE92627ef1e60a2A9B7e2c6E', // WFUMA
    token0Symbol: 'USDT',
    token1Symbol: 'WFUMA',
    fee: 3000, // 0.3% - Standard tier
    liquidity: '0', // Will be populated when liquidity is added
    sqrtPriceX96: '2045662359789070127264287784752381952', // 1 FUMA = 0.0015 USDT
    tick: 341350, // Correct tick for the price
    tvl: '0',
    volume24h: '0',
    apr: 0,
  },
];
