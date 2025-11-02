import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Wallet Setup | Fushuma Docs',
  description: 'Learn how to set up a wallet to use with the Fushuma ecosystem.',
};

export default function WalletSetupPage() {
  return (
    <article>
      <h1>Wallet Setup</h1>
      <p className="lead">
        To interact with the Fushuma ecosystem, you will need a compatible cryptocurrency wallet. This guide will help you set up a wallet and connect it to the Fushuma Hub.
      </p>

      <h2>What is a Wallet?</h2>
      <p>
        A cryptocurrency wallet is a software program that allows you to store and manage your digital assets. It is your gateway to the world of decentralized applications (dApps) like Fushuma.
      </p>

      <h2>Recommended Wallets</h2>
      <p>
        We recommend using one of the following wallets:
      </p>
      <ul>
        <li>
          <strong>MetaMask:</strong> A popular browser extension wallet that is easy to use and widely supported.
        </li>
        <li>
          <strong>Trust Wallet:</strong> A mobile wallet that is great for managing your assets on the go.
        </li>
        <li>
          <strong>Coinbase Wallet:</strong> A user-friendly wallet from the popular cryptocurrency exchange.
        </li>
      </ul>

      <h2>Connecting to Fushuma Hub</h2>
      <p>
        Once you have set up your wallet, you can connect it to the Fushuma Hub by clicking the "Connect Wallet" button in the top right corner of the page. You will be prompted to approve the connection in your wallet.
      </p>
    </article>
  );
}
