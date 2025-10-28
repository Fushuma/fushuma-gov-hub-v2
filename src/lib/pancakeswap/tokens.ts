import { Token } from '@pancakeswap/sdk';
import { COMMON_TOKENS } from './contracts';

/**
 * Token definitions for Fushuma Network
 */

export const FUMA_TOKEN = new Token(
  121224, // Fushuma chain ID
  COMMON_TOKENS.FUMA,
  18,
  'FUMA',
  'Fushuma Token'
);

export const WFUMA_TOKEN = new Token(
  121224,
  COMMON_TOKENS.WFUMA,
  18,
  'WFUMA',
  'Wrapped FUMA'
);

export const USDC_TOKEN = new Token(
  121224,
  COMMON_TOKENS.USDC,
  6,
  'USDC',
  'USD Coin'
);

export const USDT_TOKEN = new Token(
  121224,
  COMMON_TOKENS.USDT,
  6,
  'USDT',
  'Tether USD'
);

export const WETH_TOKEN = new Token(
  121224,
  COMMON_TOKENS.WETH,
  18,
  'WETH',
  'Wrapped Ether'
);

export const WBTC_TOKEN = new Token(
  121224,
  COMMON_TOKENS.WBTC,
  8,
  'WBTC',
  'Wrapped Bitcoin'
);

/**
 * List of common base tokens for trading pairs
 */
export const BASES_TO_CHECK_TRADES_AGAINST = [
  WFUMA_TOKEN,
  USDC_TOKEN,
  USDT_TOKEN,
  WETH_TOKEN,
  WBTC_TOKEN,
];

/**
 * Default token list for the swap interface
 */
export const DEFAULT_TOKEN_LIST = [
  FUMA_TOKEN,
  WFUMA_TOKEN,
  USDC_TOKEN,
  USDT_TOKEN,
  WETH_TOKEN,
  WBTC_TOKEN,
];

/**
 * Create a token instance from address and metadata
 */
export function createToken(
  address: `0x${string}`,
  decimals: number,
  symbol: string,
  name: string
): Token {
  return new Token(121224, address, decimals, symbol, name);
}

/**
 * Get token by symbol
 */
export function getTokenBySymbol(symbol: string): Token | undefined {
  return DEFAULT_TOKEN_LIST.find((token) => token.symbol === symbol);
}

/**
 * Check if token is native FUMA
 */
export function isNativeFUMA(token: Token): boolean {
  return token.address === COMMON_TOKENS.FUMA;
}

/**
 * Check if token is WFUMA
 */
export function isWFUMA(token: Token): boolean {
  return token.address === COMMON_TOKENS.WFUMA;
}

