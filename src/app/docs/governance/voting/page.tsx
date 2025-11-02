import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'How to Vote | Fushuma Docs',
  description: 'Learn how to vote on proposals in the Fushuma governance system.',
};

export default function HowToVotePage() {
  return (
    <article>
      <h1>How to Vote</h1>
      <p className="lead">
        Voting is one of the most important ways you can participate in Fushuma governance. This guide will show you how to vote on proposals and make your voice heard.
      </p>

      <h2>1. Go to the Governance Page</h2>
      <p>
        Navigate to the <a href="/governance">Governance page</a> to see a list of all active and past proposals.
      </p>

      <h2>2. Connect Your Wallet</h2>
      <p>
        Connect your wallet to the Fushuma Hub. You will need to have FUMA tokens in your wallet to vote.
      </p>

      <h2>3. Review the Proposal</h2>
      <p>
        Click on a proposal to view the details. Make sure you understand what the proposal is about and what the potential consequences of passing or rejecting it are.
      </p>

      <h2>4. Cast Your Vote</h2>
      <p>
        Once you have made a decision, you can cast your vote by clicking the "For" or "Against" button. You will need to confirm the transaction in your wallet. Your voting power is proportional to the amount of FUMA you hold.
      </p>

      <h2>5. Delegating Your Vote</h2>
      <p>
        If you don't have time to vote on every proposal, you can delegate your voting power to another community member that you trust. This allows them to vote on your behalf.
      </p>
    </article>
  );
}
