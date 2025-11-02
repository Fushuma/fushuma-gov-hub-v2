/**
 * Bridge Configuration
 * Ported from Bridge application
 */

// API Endpoints
export const COINGECKO_URL = 'https://api.coingecko.com/api/v3/';
export const CLAIM_API_URL = 'https://iy4y4qnffokbpqzmb55f2c6jpy0vmwiq.lambda-url.us-east-1.on.aws/claim?';
export const STAKE_URL = 'https://wallet.callisto.network/';
export const GETCLO_URL = 'https://trading.bitfinex.com/t/CLO:USD?demo=true';

// Deposit event ABI
export const DEPOSIT_EVENT_ABI = [
  { type: 'address', name: 'token', internalType: 'address', indexed: true },
  { type: 'address', name: 'sender', internalType: 'address', indexed: true },
  { type: 'uint256', name: 'value', internalType: 'uint256', indexed: false },
  { type: 'uint256', name: 'toChainId', internalType: 'uint256', indexed: false },
  { type: 'address', name: 'toToken', internalType: 'address', indexed: false }
] as const;

// Block confirmations required per chain (add 2 block confirmations to ensure transaction is confirmed on backend)
export const BLOCK_CONFIRMATIONS: { [chainId: number]: number } = {
  56: 5, // BSC
  1: 6, // Ethereum
  137: 302, // Polygon
  121224: 66, // Fushuma
  8453: 302, // Base
  130: 602, // Huobi ECO
  42161: 1202 // Arbitrum
};

// Minimum gas amounts per chain
export const MIN_GAS_AMOUNT: { [chainId: number]: number } = {
  121224: 0.01, // Fushuma
  1: 0.005, // Ethereum
  56: 0.001, // BSC
  137: 0.01, // Polygon
  42161: 0.001, // Arbitrum
  8453: 0.001, // Base
  130: 0.001 // Huobi ECO
};

// Native wrapped coin addresses per chain
export const NATIVE_W_COINS: { [chainId: number]: `0x${string}` | '' } = {
  20729: '0xF5AD6F6EDeC824C7fD54A66d241a227F6503aD3a',
  820: '0xF5AD6F6EDeC824C7fD54A66d241a227F6503aD3a',
  56: '',
  97: '',
  1: '',
  42: '',
  61: '',
  137: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270'
};

// Required signatures for bridge operations (defined in bridgeSignatures.ts)

// Signature API base URL
export const SIGNATURE_API_URL = 'https://iy4y4qnffokbpqzmb55f2c6jpy0vmwiq.lambda-url.us-east-1.on.aws/';

/**
 * Get block confirmations required for a chain
 */
export function getBlockConfirmations(chainId: number | undefined): number {
  if (!chainId) return 6; // Default
  return BLOCK_CONFIRMATIONS[chainId] || 6;
}

/**
 * Get minimum gas amount for a chain
 */
export function getMinGasAmount(chainId: number | undefined): number {
  if (!chainId) return 0.001; // Default
  return MIN_GAS_AMOUNT[chainId] || 0.001;
}

/**
 * Get native wrapped coin address for a chain
 */
export function getNativeWrappedCoin(chainId: number | undefined): `0x${string}` | '' {
  if (!chainId) return '';
  return NATIVE_W_COINS[chainId] || '';
}
