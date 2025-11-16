/**
 * Viem Client Configuration for Fushuma Network
 */

import { createPublicClient, http } from 'viem';
import { defineChain } from 'viem';

/**
 * Fushuma Network Chain Definition
 */
export const fushuma = defineChain({
  id: 121224,
  name: 'Fushuma',
  network: 'fushuma',
  nativeCurrency: {
    decimals: 18,
    name: 'FUMA',
    symbol: 'FUMA',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.fushuma.com'],
    },
    public: {
      http: ['https://rpc.fushuma.com'],
    },
  },
  blockExplorers: {
    default: {
      name: 'FumaScan',
      url: 'https://fumascan.com',
    },
  },
  testnet: false,
});

/**
 * Public Client for reading from the blockchain
 */
export const publicClient = createPublicClient({
  chain: fushuma,
  transport: http(),
});
