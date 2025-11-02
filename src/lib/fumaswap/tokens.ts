import { Token } from '@fumaswap/sdk';
import { PAYMENT_TOKENS } from '../launchpad/contracts';

/**
 * Token definitions for Fushuma Network
 * 
 * Note: WFUMA, WETH, WBTC addresses are placeholders until contracts are deployed
 * USDC and USDT use actual deployed addresses from launchpad
 */

const FUSHUMA_CHAIN_ID = 121224;

export const FUMA_TOKEN = new Token(
  FUSHUMA_CHAIN_ID,
  '0x0000000000000000000000000000000000000000', // Native token placeholder
  18,
  'FUMA',
  'Fushuma Token'
);

export const WFUMA_TOKEN = new Token(
  FUSHUMA_CHAIN_ID,
  '0x0000000000000000000000000000000000000000', // To be deployed
  18,
  'WFUMA',
  'Wrapped FUMA'
);

// Using actual deployed addresses from launchpad
export const USDC_TOKEN = new Token(
  FUSHUMA_CHAIN_ID,
  PAYMENT_TOKENS.USDC, // 0xf8EA5627691E041dae171350E8Df13c592084848
  6,
  'USDC',
  'USD Coin'
);

export const USDT_TOKEN = new Token(
  FUSHUMA_CHAIN_ID,
  PAYMENT_TOKENS.USDT, // 0x1e11d176117dbEDbd234b1c6a10C6eb8dceD275e
  6,
  'USDT',
  'Tether USD'
);

export const WETH_TOKEN = new Token(
  FUSHUMA_CHAIN_ID,
  '0x0000000000000000000000000000000000000000', // To be deployed
  18,
  'WETH',
  'Wrapped Ether'
);

export const WBTC_TOKEN = new Token(
  FUSHUMA_CHAIN_ID,
  '0x0000000000000000000000000000000000000000', // To be deployed
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
 * Only includes tokens with deployed contracts or native token
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
 * Tokens that are actually deployed and can be used
 * (excludes placeholder addresses)
 */
export const DEPLOYED_TOKENS = [
  USDC_TOKEN,
  USDT_TOKEN,
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
  return new Token(FUSHUMA_CHAIN_ID, address, decimals, symbol, name);
}

/**
 * Get token by symbol
 */
export function getTokenBySymbol(symbol: string): Token | undefined {
  return DEFAULT_TOKEN_LIST.find((token) => token.symbol === symbol);
}

/**
 * Get token by address
 */
export function getTokenByAddress(address: string): Token | undefined {
  return DEFAULT_TOKEN_LIST.find(
    (token) => token.address.toLowerCase() === address.toLowerCase()
  );
}

/**
 * Check if token is native FUMA
 */
export function isNativeFUMA(token: Token): boolean {
  return token.address === '0x0000000000000000000000000000000000000000';
}

/**
 * Check if token is WFUMA
 */
export function isWFUMA(token: Token): boolean {
  return token.symbol === 'WFUMA';
}

/**
 * Check if token address is a placeholder (not deployed)
 */
export function isPlaceholderAddress(address: string): boolean {
  return address === '0x0000000000000000000000000000000000000000';
}

/**
 * Check if token is deployed and usable
 */
export function isTokenDeployed(token: Token): boolean {
  return !isPlaceholderAddress(token.address) || isNativeFUMA(token);
}
