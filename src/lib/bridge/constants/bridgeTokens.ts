/**
 * Bridge Tokens Configuration
 * Defines tokens that can be bridged across chains
 */

// Special address marker for native tokens (common convention)
export const NATIVE_TOKEN_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' as const;

// Zero address is used as a placeholder for "not available"
export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const;

/**
 * Check if an address is valid (not undefined, not empty, and not zero address)
 * Native token address is considered valid as it represents native currency
 */
function isValidTokenAddress(address: `0x${string}` | '' | undefined): boolean {
  return address !== undefined &&
         address !== '' &&
         address !== ZERO_ADDRESS;
}

export interface BridgeToken {
  symbol: string;
  name: string;
  address: { [chainId: number]: `0x${string}` | '' | undefined };
  decimals: { [chainId: number]: number };
  logoURI?: string;
  projectLink?: string;
  isNative?: { [chainId: number]: boolean };
}

/**
 * Supported bridge tokens
 * Ported from Bridge application
 */
export const BRIDGE_TOKENS: { [key: string]: BridgeToken } = {
  fuma: {
    symbol: 'FUMA',
    name: 'Fushuma',
    address: {
      121224: NATIVE_TOKEN_ADDRESS, // Native token on Fushuma chain
      1: '0x0000000000000000000000000000000000000000',
      56: '0x0000000000000000000000000000000000000000',
      137: '0x0000000000000000000000000000000000000000'
    },
    decimals: {
      121224: 18,
      1: 18,
      56: 18,
      137: 18
    },
    isNative: {
      121224: true // FUMA is native on Fushuma chain
    },
    projectLink: 'https://fushuma.com'
  },
  wclo: {
    symbol: 'WCLO',
    name: 'Wrapped CLO',
    address: {
      820: '0xF5AD6F6EDeC824C7fD54A66d241a227F6503aD3a',
      20729: '0xbd2D3BCe975FD72E44A73cC8e834aD1B8441BdDa'
    },
    decimals: {
      820: 18,
      20729: 18
    },
    projectLink: 'https://callisto.network'
  },
  usdt: {
    symbol: 'USDT',
    name: 'Tether USD',
    address: {
      820: '0xbf6c50889d3a620eb42C0F188b65aDe90De958c4',
      1: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      56: '0x55d398326f99059fF775485246999027B3197955',
      137: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
      121224: '0x0000000000000000000000000000000000000000'
    },
    decimals: {
      820: 18,
      1: 6,
      56: 18,
      137: 6,
      121224: 18
    },
    projectLink: 'https://tether.to'
  },
  usdc: {
    symbol: 'USDC',
    name: 'USD Coin',
    address: {
      1: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      56: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
      137: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
      121224: '0x0000000000000000000000000000000000000000'
    },
    decimals: {
      1: 6,
      56: 18,
      137: 6,
      121224: 18
    },
    projectLink: 'https://www.circle.com/usdc'
  },
  weth: {
    symbol: 'WETH',
    name: 'Wrapped Ether',
    address: {
      1: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      137: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
      42161: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      8453: '0x4200000000000000000000000000000000000006',
      121224: '0x0000000000000000000000000000000000000000'
    },
    decimals: {
      1: 18,
      137: 18,
      42161: 18,
      8453: 18,
      121224: 18
    },
    projectLink: 'https://weth.io'
  },
  wbtc: {
    symbol: 'WBTC',
    name: 'Wrapped Bitcoin',
    address: {
      1: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
      137: '0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6',
      121224: '0x0000000000000000000000000000000000000000'
    },
    decimals: {
      1: 8,
      137: 8,
      121224: 8
    },
    projectLink: 'https://wbtc.network'
  },
  ccbnb: {
    symbol: 'ccBNB',
    name: 'Callisto BNB',
    address: {
      820: '0xCC78D0A86B0c0a3b32DEBd773Ec815130F9527CF'
    },
    decimals: {
      820: 18
    },
    projectLink: 'https://callisto.enterprise'
  },
  cceth: {
    symbol: 'ccETH',
    name: 'Callisto ETH',
    address: {
      820: '0xcC00860947035a26Ffe24EcB1301ffAd3a89f910'
    },
    decimals: {
      820: 18
    },
    projectLink: 'https://callisto.enterprise'
  }
};

/**
 * Get token by symbol
 */
export function getTokenBySymbol(symbol: string): BridgeToken | undefined {
  return BRIDGE_TOKENS[symbol.toLowerCase()];
}

/**
 * Get all bridge tokens
 */
export function getAllBridgeTokens(): BridgeToken[] {
  return Object.values(BRIDGE_TOKENS);
}

/**
 * Get tokens available on a specific chain
 * Filters out tokens with zero address (not actually deployed)
 */
export function getTokensByChain(chainId: number): BridgeToken[] {
  return Object.values(BRIDGE_TOKENS).filter(
    (token) => isValidTokenAddress(token.address[chainId])
  );
}

/**
 * Check if token is supported on chain
 * Returns false for zero address (placeholder for not available)
 */
export function isTokenSupportedOnChain(symbol: string, chainId: number): boolean {
  const token = getTokenBySymbol(symbol);
  if (!token) return false;
  return isValidTokenAddress(token.address[chainId]);
}

/**
 * Get token address on specific chain
 */
export function getTokenAddress(symbol: string, chainId: number): `0x${string}` | '' | undefined {
  const token = getTokenBySymbol(symbol);
  if (!token) return undefined;
  return token.address[chainId];
}

/**
 * Get token decimals on specific chain
 */
export function getTokenDecimals(symbol: string, chainId: number): number | undefined {
  const token = getTokenBySymbol(symbol);
  if (!token) return undefined;
  return token.decimals[chainId];
}

/**
 * Check if token is native on a specific chain
 */
export function isNativeToken(symbol: string, chainId: number): boolean {
  const token = getTokenBySymbol(symbol);
  if (!token) return false;
  return token.isNative?.[chainId] === true;
}
