import { Metadata } from 'next';
import Image from 'next/image';

export const metadata: Metadata = {
  title: 'Bridge Overview | Fushuma Docs',
  description: 'Learn how to bridge tokens across different blockchain networks using Fushuma Bridge.',
};

export default function BridgeOverviewPage() {
  return (
    <article>
      <div className="flex items-center gap-4 mb-6">
        <Image 
          src="/fushuma-bridge-logo.png" 
          alt="Fushuma Bridge Logo" 
          width={147} 
          height={32}
          className="object-contain"
        />
      </div>
      <h1>Fushuma Bridge</h1>
      
      <p className="lead">
        The Fushuma Bridge enables seamless transfer of tokens between different blockchain networks. Move your assets across multiple chains quickly, securely, and with minimal fees.
      </p>

      <h2>What is a Blockchain Bridge?</h2>
      <p>
        A blockchain bridge is a protocol that allows you to transfer tokens from one blockchain network to another. For example, you can move tokens from Ethereum to BNB Chain, or from Polygon to Fushuma. This is essential for accessing different DeFi ecosystems and taking advantage of lower transaction fees on various networks.
      </p>

      <h2>Supported Networks</h2>
      <p>
        The Fushuma Bridge currently supports the following blockchain networks:
      </p>
      <ul>
        <li><strong>Ethereum</strong> - The main Ethereum network</li>
        <li><strong>BNB Chain</strong> - Binance Smart Chain for fast, low-cost transactions</li>
        <li><strong>Polygon</strong> - Layer 2 scaling solution for Ethereum</li>
        <li><strong>Fushuma</strong> - The native Fushuma blockchain</li>
        <li><strong>Arbitrum</strong> - Ethereum Layer 2 optimistic rollup</li>
        <li><strong>Base</strong> - Coinbase's Layer 2 network</li>
        <li><strong>Optimism</strong> - Ethereum Layer 2 optimistic rollup</li>
        <li><strong>Avalanche</strong> - High-performance blockchain platform</li>
      </ul>

      <h2>How Does It Work?</h2>
      <p>
        When you bridge tokens, the process involves locking your tokens on the source chain and minting equivalent tokens on the destination chain. The bridge uses a validator network to ensure the security and integrity of cross-chain transfers.
      </p>
      <ol>
        <li><strong>Lock</strong> - Your tokens are locked in a smart contract on the source chain</li>
        <li><strong>Verify</strong> - Validators confirm the transaction</li>
        <li><strong>Mint</strong> - Equivalent tokens are minted on the destination chain</li>
        <li><strong>Claim</strong> - You receive your tokens on the destination chain</li>
      </ol>

      <h2>Bridge Features</h2>
      <ul>
        <li><strong>Multi-Chain Support</strong> - Bridge between 8+ blockchain networks</li>
        <li><strong>Fast Transfers</strong> - Most transfers complete within minutes</li>
        <li><strong>Low Fees</strong> - Competitive bridge fees and gas optimization</li>
        <li><strong>Secure</strong> - Validated by a decentralized network of validators</li>
        <li><strong>Transaction History</strong> - Track all your bridge transactions in one place</li>
      </ul>

      <h2>Getting Started</h2>
      <div className="flex flex-col md:flex-row gap-6 items-start">
        <div className="flex-1">
          <p>
            To start using the Fushuma Bridge, you'll need:
          </p>
          <ul>
            <li>A Web3 wallet (MetaMask, WalletConnect, etc.)</li>
            <li>Tokens on one of the supported networks</li>
            <li>Enough native tokens for gas fees on both source and destination chains</li>
          </ul>
          <p>
            Ready to bridge? Check out our step-by-step guides:
          </p>
          <ul>
            <li><a href="/docs/bridge/bridging-tokens">How to Bridge Tokens</a></li>
            <li><a href="/docs/bridge/claiming-tokens">How to Claim Tokens</a></li>
            <li><a href="/docs/bridge/troubleshooting">Troubleshooting</a></li>
          </ul>
        </div>
        <div className="flex-shrink-0">
          <Image 
            src="/bridge-ninja-mascot.png" 
            alt="Bridge Ninja Mascot" 
            width={200} 
            height={200}
            className="object-contain"
          />
        </div>
      </div>
    </article>
  );
}
