import { getDefaultConfig, connectorsForWallets } from '@rainbow-me/rainbowkit';
import { metaMaskWallet, walletConnectWallet, coinbaseWallet, rainbowWallet, trustWallet, injectedWallet } from '@rainbow-me/rainbowkit/wallets';
import { http, createConfig } from 'wagmi';
import { defineChain } from 'viem';
import { mainnet, bsc, polygon, arbitrum, base, unichain } from 'viem/chains';

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
        injectedWallet as any, // Fallback for any injected wallet (MetaMask, etc.)
        metaMaskWallet as any,
        walletConnectWallet as any,
        coinbaseWallet as any,
      ],
    },
    {
      groupName: 'More',
      wallets: [
        rainbowWallet as any,
        trustWallet as any,
      ],
    },
  ],
  {
    appName: 'Fushuma Governance Hub',
    projectId,
  }
);

// Fushuma first (the app's home chain); the other chains are bridge
// source/destination networks, matching the production bridge app.
export const wagmiConfig = createConfig({
  connectors,
  chains: [fushuma, mainnet, bsc, polygon, arbitrum, base, unichain],
  transports: {
    [fushuma.id]: http(),
    [mainnet.id]: http('https://ethereum.publicnode.com'),
    [bsc.id]: http('https://bsc-dataseed.binance.org'),
    [polygon.id]: http('https://polygon-rpc.com'),
    [arbitrum.id]: http('https://arb1.arbitrum.io/rpc'),
    [base.id]: http('https://mainnet.base.org'),
    [unichain.id]: http('https://mainnet.unichain.org'),
  },
  // SSR is disabled since WalletProvider is dynamically imported with ssr: false
  // This prevents hydration mismatches with wallet detection
  ssr: false,
});

/** The app's home chain id - governance and FumaSwap live here. */
export const FUSHUMA_CHAIN_ID = fushuma.id;

