/**
 * Bridge Tokens Configuration
 *
 * Mirrors the production bridge app (github.com/Fushuma/Bridge,
 * src/app/constants/tokenLists/tokenLists2.json). Each bridged asset is
 * wrapped per source chain, so the same symbol can appear as multiple
 * variants (e.g. USDT bridged from Ethereum is a different Fushuma token
 * than USDT bridged from BSC).
 */

/**
 * Marker address the bridge uses for a chain's native coin
 * (FUMA on Fushuma, ETH on Ethereum/Arbitrum/Base/Unichain, BNB on BSC,
 * POL on Polygon). Deposits of native coins attach the amount as
 * msg.value instead of doing an ERC20 transfer.
 */
export const NATIVE_TOKEN_ADDRESS = '0x0000000000000000000000000000000000000001' as const;

// Zero address is used as a placeholder for "not available"
export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const;

/**
 * Check if an address is valid (not undefined, not empty, and not zero
 * address). The native marker address is valid.
 */
function isValidTokenAddress(address: `0x${string}` | '' | undefined): boolean {
  return address !== undefined &&
         address !== '' &&
         address !== ZERO_ADDRESS;
}

export interface BridgeToken {
  /** Unique key (symbol + variation) */
  key: string;
  symbol: string;
  name: string;
  /** Source-chain variation for wrapped assets (e.g. 'eth', 'bsc') */
  variation?: string;
  address: { [chainId: number]: `0x${string}` | '' | undefined };
  decimals: { [chainId: number]: number };
  logoURI?: string;
  projectLink?: string;
}

/**
 * Supported bridge tokens - kept in sync with the production bridge's
 * tokenLists2.json.
 */
export const BRIDGE_TOKENS: { [key: string]: BridgeToken } = {
  fuma: {
    key: 'fuma',
    symbol: 'FUMA',
    name: 'Fushuma Coin',
    address: {
      121224: NATIVE_TOKEN_ADDRESS,
      1: '0x42c8d7460153178a8C3344DBE3EDc96A7Aa19322',
      56: '0x42c8d7460153178a8C3344DBE3EDc96A7Aa19322',
      137: '0x42c8d7460153178a8C3344DBE3EDc96A7Aa19322',
      8453: '0x42c8d7460153178a8C3344DBE3EDc96A7Aa19322',
      130: '0x42c8d7460153178a8C3344DBE3EDc96A7Aa19322',
      42161: '0x42c8d7460153178a8C3344DBE3EDc96A7Aa19322'
    },
    decimals: {
      121224: 18,
      1: 18,
      56: 18,
      137: 18,
      8453: 18,
      130: 18,
      42161: 18
    },
    projectLink: 'https://fushuma.com'
  },
  usdt_eth: {
    key: 'usdt_eth',
    symbol: 'USDT',
    name: 'Tether USD',
    variation: 'eth',
    address: {
      1: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      121224: '0x1e11d176117dbEDbd234b1c6a10C6eb8dceD275e'
    },
    decimals: {
      1: 6,
      121224: 6
    },
    projectLink: 'https://tether.to'
  },
  usdt_bsc: {
    key: 'usdt_bsc',
    symbol: 'USDT',
    name: 'Tether USD',
    variation: 'bsc',
    address: {
      56: '0x55d398326f99059fF775485246999027B3197955',
      121224: '0x9d0FB7b3fb7d37476aECcc47e29732460feB3be0'
    },
    decimals: {
      56: 18,
      121224: 18
    },
    projectLink: 'https://tether.to'
  },
  usdc: {
    key: 'usdc',
    symbol: 'USDC',
    name: 'USD Coin',
    address: {
      8453: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      121224: '0xf8EA5627691E041dae171350E8Df13c592084848'
    },
    decimals: {
      8453: 18,
      121224: 18
    },
    projectLink: 'https://www.circle.com/usdc'
  },
  bnb: {
    key: 'bnb',
    symbol: 'BNB',
    name: 'Binance Coin',
    address: {
      56: NATIVE_TOKEN_ADDRESS,
      121224: '0x27544116035a3dB6602268304117f6A056e58547'
    },
    decimals: {
      56: 18,
      121224: 18
    }
  },
  eth_eth: {
    key: 'eth_eth',
    symbol: 'ETH',
    name: 'Ethereum Coin',
    variation: 'eth',
    address: {
      1: NATIVE_TOKEN_ADDRESS,
      121224: '0x42c8d7460153178a8C3344DBE3EDc96A7Aa19322'
    },
    decimals: {
      1: 18,
      121224: 18
    }
  },
  eth_unichain: {
    key: 'eth_unichain',
    symbol: 'ETH',
    name: 'Ethereum Coin',
    variation: 'unichain',
    address: {
      130: NATIVE_TOKEN_ADDRESS,
      121224: '0x4922caaf79952d9f987AC6a449f891bfE97B9389'
    },
    decimals: {
      130: 18,
      121224: 18
    }
  },
  eth_arbitrum: {
    key: 'eth_arbitrum',
    symbol: 'ETH',
    name: 'Ethereum Coin',
    variation: 'arbitrum',
    address: {
      42161: NATIVE_TOKEN_ADDRESS,
      121224: '0x6Dd5b658B6FA6242Cef0404F91951fC62741A3A3'
    },
    decimals: {
      42161: 18,
      121224: 18
    }
  },
  eth_base: {
    key: 'eth_base',
    symbol: 'ETH',
    name: 'Ethereum Coin',
    variation: 'base',
    address: {
      8453: NATIVE_TOKEN_ADDRESS,
      121224: '0xdE88176B951E703B9ba7423FE1FED62e16e3F5E4'
    },
    decimals: {
      8453: 18,
      121224: 18
    }
  },
  pol: {
    key: 'pol',
    symbol: 'POL',
    name: 'Polygon Coin',
    address: {
      137: NATIVE_TOKEN_ADDRESS,
      121224: '0x8095fa918029F28AEccE771E683Aa7dB587cDf07'
    },
    decimals: {
      137: 18,
      121224: 18
    }
  }
};

/**
 * Human-readable label, disambiguating wrapped variants of the same
 * symbol (e.g. "USDT (via Ethereum)" vs "USDT (via BSC)").
 */
export function getTokenLabel(token: BridgeToken): string {
  if (!token.variation) return token.symbol;
  const variationNames: { [key: string]: string } = {
    eth: 'Ethereum',
    bsc: 'BSC',
    unichain: 'Unichain',
    arbitrum: 'Arbitrum',
    base: 'Base'
  };
  return `${token.symbol} (via ${variationNames[token.variation] || token.variation})`;
}

/**
 * Get token by key (symbol + variation)
 */
export function getTokenByKey(key: string): BridgeToken | undefined {
  return BRIDGE_TOKENS[key.toLowerCase()];
}

/**
 * Get all bridge tokens
 */
export function getAllBridgeTokens(): BridgeToken[] {
  return Object.values(BRIDGE_TOKENS);
}

/**
 * Get tokens available on a specific chain
 */
export function getTokensByChain(chainId: number): BridgeToken[] {
  return Object.values(BRIDGE_TOKENS).filter(
    (token) => isValidTokenAddress(token.address[chainId])
  );
}

/**
 * Get tokens bridgeable on a specific route - the token must have a
 * valid address on both the source and destination chains.
 */
export function getTokensForRoute(fromChainId: number, toChainId: number): BridgeToken[] {
  return Object.values(BRIDGE_TOKENS).filter(
    (token) =>
      isValidTokenAddress(token.address[fromChainId]) &&
      isValidTokenAddress(token.address[toChainId])
  );
}

/**
 * Get token address on specific chain
 */
export function getTokenAddress(key: string, chainId: number): `0x${string}` | '' | undefined {
  const token = getTokenByKey(key);
  if (!token) return undefined;
  return token.address[chainId];
}

/**
 * Get token decimals on specific chain
 */
export function getTokenDecimals(key: string, chainId: number): number | undefined {
  const token = getTokenByKey(key);
  if (!token) return undefined;
  return token.decimals[chainId];
}

/**
 * Check if an address is the bridge's native-coin marker
 */
export function isNativeTokenAddress(address: `0x${string}` | '' | undefined): boolean {
  return address === NATIVE_TOKEN_ADDRESS;
}

/**
 * Check if a token is the native coin on a specific chain
 */
export function isNativeToken(key: string, chainId: number): boolean {
  const token = getTokenByKey(key);
  if (!token) return false;
  return token.address[chainId] === NATIVE_TOKEN_ADDRESS;
}
