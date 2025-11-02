import { Metadata } from 'next';
import { DocHero } from '@/components/docs/DocHero';
import { TrendingUp } from 'lucide-react';

export const metadata: Metadata = {
  title: 'DeFi Overview | Fushuma Docs',
  description: 'Learn about the Fushuma DeFi ecosystem and how to use FumaSwap.',
};

export default function DeFiOverviewPage() {
  return (
    <article>
      <DocHero
        title="DeFi Overview"
        description="Welcome to the Fushuma DeFi ecosystem, powered by FumaSwap. This guide will give you a high-level overview of what you can do with FumaSwap and how to get started."
        icon={TrendingUp}
      />

      <h2>What is FumaSwap?</h2>
      <p>
        FumaSwap is a decentralized exchange (DEX) that allows you to trade digital assets on the Fushuma Network. It is a fork of PancakeSwap v4, which means it inherits the latest features and security of one of the most popular DEXs in the world.
      </p>

      <h2>Key Features</h2>
      <ul>
        <li>
          <strong>Swapping:</strong> Instantly swap between different cryptocurrencies.
        </li>
        <li>
          <strong>Liquidity Providing:</strong> Earn fees by providing liquidity to pools.
        </li>
        <li>
          <strong>Concentrated Liquidity:</strong> Maximize your capital efficiency by providing liquidity in specific price ranges.
        </li>
        <li>
          <strong>Low Fees:</strong> Enjoy low trading fees and gas costs.
        </li>
      </ul>

      <h2>Getting Started</h2>
      <p>
        To get started with FumaSwap, you will need a compatible wallet and some FUMA tokens. You can follow our <a href="/docs/getting-started">Getting Started guide</a> to set up your wallet and get your first FUMA.
      </p>

      <h2>Next Steps</h2>
      <p>
        Once you are ready, you can dive into the following guides to learn how to use FumaSwap:
      </p>
      <ul>
        <li>
          <a href="/docs/defi/swapping">Swapping Tokens</a>
        </li>
        <li>
          <a href="/docs/defi/liquidity">Providing Liquidity</a>
        </li>
        <li>
          <a href="/docs/defi/positions">Managing Positions</a>
        </li>
      </ul>
    </article>
  );
}
