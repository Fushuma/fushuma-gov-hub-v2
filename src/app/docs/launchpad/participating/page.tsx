import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Participating in ICOs | Fushuma Docs',
  description: 'Learn how to participate in token sales on the Fushuma Launchpad.',
};

export default function ParticipatingInIPOsPage() {
  return (
    <article>
      <h1>Participating in ICOs</h1>
      <p className="lead">
        This guide will show you how to participate in Initial Coin Offerings (ICOs) on the Fushuma Launchpad and get early access to new tokens.
      </p>

      <h2>1. Go to the Launchpad Page</h2>
      <p>
        Navigate to the <a href="/launchpad">Launchpad page</a> to see a list of all active and upcoming ICOs.
      </p>

      <h2>2. Connect Your Wallet</h2>
      <p>
        Connect your wallet to the Fushuma Hub. You will need to have FUMA tokens in your wallet to participate in ICOs.
      </p>

      <h2>3. Review the Project</h2>
      <p>
        Click on a project to view the details. Make sure you do your own research and understand the project before you invest.
      </p>

      <h2>4. Participate in the ICO</h2>
      <p>
        Once you have decided to invest in a project, you can enter the amount of FUMA you want to contribute and click the "Participate" button. You will need to confirm the transaction in your wallet.
      </p>

      <h2>5. Claim Your Tokens</h2>
      <p>
        After the ICO has ended, you will be able to claim your tokens from the project page. Your tokens will be sent to your wallet.
      </p>
    </article>
  );
}
