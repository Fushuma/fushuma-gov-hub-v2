import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Getting FUMA | Fushuma Docs',
  description: 'Learn how to get FUMA to use in the Fushuma ecosystem.',
};

export default function GettingFUMAPage() {
  return (
    <article>
      <h1>Getting FUMA</h1>
      <p className="lead">
        FUMA is the native coin of the Fushuma Network. You will need FUMA to pay for gas fees and to participate in the Fushuma ecosystem. This guide will show you how to get FUMA.
      </p>

      <h2>Where to Get FUMA</h2>
      <p>
        You can get FUMA from the following sources:
      </p>
      <ul>
        <li>
          <strong>Exchanges:</strong> FUMA is available on several cryptocurrency exchanges. You can buy FUMA with fiat currency or other cryptocurrencies.
        </li>
        <li>
          <strong>Faucets:</strong> If you are a developer, you can get free FUMA from a testnet faucet to use for testing purposes.
        </li>
        <li>
          <strong>Community:</strong> You can also get FUMA from other community members through airdrops, giveaways, or by providing value to the ecosystem.
        </li>
      </ul>

      <h2>Adding FUMA to Your Wallet</h2>
      <p>
        Once you have acquired FUMA, you will need to add it to your wallet. You can do this by sending the FUMA to your wallet address. Make sure you are on the Fushuma Network when you do this.
      </p>
    </article>
  );
}
