import { getDefaultConfig, connectorsForWallets } from '@rainbow-me/rainbowkit';
import { metaMaskWallet, walletConnectWallet, coinbaseWallet, rainbowWallet, trustWallet } from '@rainbow-me/rainbowkit/wallets';
import { http, createConfig } from 'wagmi';
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

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'placeholder-project-id-get-from-walletconnect';

// Configure wallet connectors with MetaMask first
const connectors = connectorsForWallets(
  [
    {
      groupName: 'Popular',
      wallets: [
        metaMaskWallet,
        walletConnectWallet,
        coinbaseWallet,
      ],
    },
    {
      groupName: 'More',
      wallets: [
        rainbowWallet,
        trustWallet,
      ],
    },
  ],
  {
    appName: 'Fushuma Governance Hub',
    projectId,
  }
);

export const wagmiConfig = createConfig({
  connectors,
  chains: [fushuma],
  transports: {
    [fushuma.id]: http(),
  },
  ssr: true,
});

