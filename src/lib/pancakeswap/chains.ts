import { defineChain } from 'viem';

/**
 * Fushuma Network Chain Configuration
 * Polygon CDK-based Layer 2
 */
export const fushuma = defineChain({
  id: 121224,
  name: 'Fushuma Network',
  nativeCurrency: {
    decimals: 18,
    name: 'FUMA',
    symbol: 'FUMA',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.fushuma.network'], // Replace with actual RPC
      webSocket: ['wss://ws.fushuma.network'], // Replace with actual WebSocket
    },
    public: {
      http: ['https://rpc.fushuma.network'],
      webSocket: ['wss://ws.fushuma.network'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Fushuma Explorer',
      url: 'https://explorer.fushuma.network', // Replace with actual explorer
    },
  },
  contracts: {
    // Will be populated after contract deployment
    multicall3: {
      address: '0x0000000000000000000000000000000000000000', // To be deployed
      blockCreated: 0,
    },
  },
  testnet: false,
});

/**
 * Fushuma Testnet Configuration (if available)
 */
export const fushumaTestnet = defineChain({
  id: 121225, // Adjust based on actual testnet chain ID
  name: 'Fushuma Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Test FUMA',
    symbol: 'tFUMA',
  },
  rpcUrls: {
    default: {
      http: ['https://testnet-rpc.fushuma.network'],
    },
    public: {
      http: ['https://testnet-rpc.fushuma.network'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Fushuma Testnet Explorer',
      url: 'https://testnet-explorer.fushuma.network',
    },
  },
  testnet: true,
});

