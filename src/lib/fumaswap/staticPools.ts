/**
 * Static pool data for initialized pools
 * Updated for Shanghai EVM deployment - November 18, 2025
 * 
 * These pools are initialized on the NEW CLPoolManager: 0xef02f995FEC090E21709A7eBAc2197d249B1a605
 */

import type { Pool } from './pools';

export const STATIC_POOLS: Pool[] = [
  {
    id: '0xa4f46d75a88dbad944baba146e6bdc84ec1c4c0b6abc10d045c129890cb86d02',
    token0: '0x1e11d176117dbEDbd234b1c6a10C6eb8dceD275e', // USDT
    token1: '0xBcA7B11c788dBb85bE92627ef1e60a2A9B7e2c6E', // WFUMA
    token0Symbol: 'USDT',
    token1Symbol: 'WFUMA',
    fee: 3000, // 0.3%
    liquidity: '0', // Will be populated when liquidity is added
    sqrtPriceX96: '204566235978907027483824037442879488', // 1 WFUMA = 0.15 USDT
    tick: -18420,
    tvl: '0',
    volume24h: '0',
    apr: 0,
  },
  {
    id: '0xa23303934ed7b1dd29079297a5c77f60cb5077118561a86127319dca61f1bfb9',
    token0: '0xBcA7B11c788dBb85bE92627ef1e60a2A9B7e2c6E', // WFUMA
    token1: '0xf8EA5627691E041dae171350E8Df13c592084848', // USDC
    token0Symbol: 'WFUMA',
    token1Symbol: 'USDC',
    fee: 3000, // 0.3%
    liquidity: '0', // Will be populated when liquidity is added
    sqrtPriceX96: '30684935396836050468864', // 1 WFUMA = 0.15 USDC
    tick: -184206,
    tvl: '0',
    volume24h: '0',
    apr: 0,
  },
];
