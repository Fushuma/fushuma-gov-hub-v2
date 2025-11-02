/**
 * Bridge Networks Configuration
 * Defines supported networks for bridge operations
 */

export interface BridgeNetwork {
  chainId: number;
  name: string;
  symbol: string;
  rpcUrls: string[];
  blockExplorerUrl: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  icon?: string;
}

export const BRIDGE_NETWORKS: { [chainId: number]: BridgeNetwork } = {
  1: {
    chainId: 1,
    name: 'Ethereum',
    symbol: 'ETH',
    rpcUrls: ['https://eth.llamarpc.com'],
    blockExplorerUrl: 'https://etherscan.io',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18
    }
  },
  56: {
    chainId: 56,
    name: 'BNB Smart Chain',
    symbol: 'BNB',
    rpcUrls: ['https://bsc-dataseed.binance.org'],
    blockExplorerUrl: 'https://bscscan.com',
    nativeCurrency: {
      name: 'BNB',
      symbol: 'BNB',
      decimals: 18
    }
  },
  137: {
    chainId: 137,
    name: 'Polygon',
    symbol: 'MATIC',
    rpcUrls: ['https://polygon-rpc.com'],
    blockExplorerUrl: 'https://polygonscan.com',
    nativeCurrency: {
      name: 'MATIC',
      symbol: 'MATIC',
      decimals: 18
    }
  },
  121224: {
    chainId: 121224,
    name: 'Fushuma',
    symbol: 'FUMA',
    rpcUrls: ['https://rpc.fushuma.com'],
    blockExplorerUrl: 'https://fumascan.com',
    nativeCurrency: {
      name: 'Fushuma',
      symbol: 'FUMA',
      decimals: 18
    }
  },
  42161: {
    chainId: 42161,
    name: 'Arbitrum One',
    symbol: 'ETH',
    rpcUrls: ['https://arb1.arbitrum.io/rpc'],
    blockExplorerUrl: 'https://arbiscan.io',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18
    }
  },
  8453: {
    chainId: 8453,
    name: 'Base',
    symbol: 'ETH',
    rpcUrls: ['https://mainnet.base.org'],
    blockExplorerUrl: 'https://basescan.org',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18
    }
  },
  130: {
    chainId: 130,
    name: 'Huobi ECO Chain',
    symbol: 'HT',
    rpcUrls: ['https://http-mainnet.hecochain.com'],
    blockExplorerUrl: 'https://hecoinfo.com',
    nativeCurrency: {
      name: 'Huobi Token',
      symbol: 'HT',
      decimals: 18
    }
  },
  820: {
    chainId: 820,
    name: 'Callisto',
    symbol: 'CLO',
    rpcUrls: ['https://rpc.callisto.network'],
    blockExplorerUrl: 'https://explorer.callisto.network',
    nativeCurrency: {
      name: 'Callisto',
      symbol: 'CLO',
      decimals: 18
    }
  }
};

/**
 * Get network by chain ID
 */
export function getNetworkByChainId(chainId: number | undefined): BridgeNetwork | undefined {
  if (!chainId) return undefined;
  return BRIDGE_NETWORKS[chainId];
}

/**
 * Get all supported bridge networks
 */
export function getAllBridgeNetworks(): BridgeNetwork[] {
  return Object.values(BRIDGE_NETWORKS);
}

/**
 * Check if chain is supported for bridging
 */
export function isBridgeSupported(chainId: number | undefined): boolean {
  if (!chainId) return false;
  return chainId in BRIDGE_NETWORKS;
}
