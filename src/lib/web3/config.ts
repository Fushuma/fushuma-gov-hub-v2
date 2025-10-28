import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { http } from 'wagmi';
import { defineChain } from 'viem';

// Fushuma Network Chain Definition
export const fushuma = defineChain({
  id: 121224,
  name: 'Fushuma',
  nativeCurrency: {
    decimals: 18,
    name: 'Fushuma',
    symbol: 'FSM',
  },
  rpcUrls: {
    default: {
      http: [process.env.NEXT_PUBLIC_FUSHUMA_RPC_URL || 'https://rpc.fushuma.com'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Fumascan',
      url: process.env.NEXT_PUBLIC_FUSHUMA_EXPLORER || 'https://fumascan.com',
    },
  },
  testnet: false,
});

export const wagmiConfig = getDefaultConfig({
  appName: 'Fushuma Governance Hub',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'placeholder-project-id-get-from-walletconnect',
  chains: [fushuma],
  transports: {
    [fushuma.id]: http(),
  },
  ssr: true,
});

