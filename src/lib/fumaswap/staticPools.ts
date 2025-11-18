/**
 * Static pool data for initialized pools
 * This is a temporary solution until RPC connectivity issues are resolved
 */

import type { Pool } from './pools';

export const STATIC_POOLS: Pool[] = [
  {
    id: '0x1', // Placeholder - actual pool ID would be calculated
    token0: '0x1e11d176117dbEDbd234b1c6a10C6eb8dceD275e', // USDT
    token1: '0xBcA7B11c788dBb85bE92627ef1e60a2A9B7e2c6E', // WFUMA
    token0Symbol: 'USDT',
    token1Symbol: 'WFUMA',
    fee: 3000, // 0.3%
    liquidity: '0', // Will be populated when liquidity is added
    sqrtPriceX96: '204566235978907027483824037442879488', // Initial price from initialization
    tick: -18420, // Calculated from initial price
    tvl: '0',
    volume24h: '0',
    apr: 0,
  },
  {
    id: '0x2', // Placeholder - actual pool ID would be calculated
    token0: '0xBcA7B11c788dBb85bE92627ef1e60a2A9B7e2c6E', // WFUMA
    token1: '0xf8EA5627691E041dae171350E8Df13c592084848', // USDC
    token0Symbol: 'WFUMA',
    token1Symbol: 'USDC',
    fee: 3000, // 0.3%
    liquidity: '0', // Will be populated when liquidity is added
    sqrtPriceX96: '30684935396836050468864', // Initial price from initialization
    tick: -184206, // Calculated from initial price
    tvl: '0',
    volume24h: '0',
    apr: 0,
  },
];
