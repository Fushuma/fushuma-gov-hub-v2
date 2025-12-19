import { getDefaultConfig, connectorsForWallets } from '@rainbow-me/rainbowkit';
import { metaMaskWallet, walletConnectWallet, coinbaseWallet, rainbowWallet, trustWallet, injectedWallet } from '@rainbow-me/rainbowkit/wallets';
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
// Note: Wallet functions must be invoked with empty object to use default config
// injectedWallet is added as a fallback to detect MetaMask and other browser wallets
const connectors = connectorsForWallets(
  [
    {
      groupName: 'Popular',
      wallets: [
        injectedWallet, // Fallback for any injected wallet (MetaMask, etc.)
        metaMaskWallet({ projectId }),
        walletConnectWallet({ projectId }),
        coinbaseWallet({ appName: 'Fushuma Governance Hub' }),
      ],
    },
    {
      groupName: 'More',
      wallets: [
        rainbowWallet({ projectId }),
        trustWallet({ projectId }),
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
  // SSR is disabled since WalletProvider is dynamically imported with ssr: false
  // This prevents hydration mismatches with wallet detection
  ssr: false,
});

