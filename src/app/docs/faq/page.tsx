import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'FAQ | Fushuma Docs',
  description: 'Frequently asked questions about the Fushuma ecosystem.',
};

export default function FAQPage() {
  return (
    <article>
      <h1>Frequently Asked Questions</h1>
      <p className="lead">
        Have a question? We have answers. Here are some of the most frequently asked questions about the Fushuma ecosystem.
      </p>

      <h2>General</h2>
      <details>
        <summary>What is Fushuma?</summary>
        <p>
          Fushuma is a community-governed ecosystem for decentralized finance (DeFi), governance, and innovation. It is a platform where you can trade, vote, fund, and launch new projects.
        </p>
      </details>
      <details>
        <summary>What is FUMA?</summary>
        <p>
          FUMA is the native coin of the Fushuma Network. It is used to pay for gas fees and to participate in the Fushuma ecosystem.
        </p>
      </details>

      <h2>DeFi (FumaSwap)</h2>
      <details>
        <summary>What is FumaSwap?</summary>
        <p>
          FumaSwap is a decentralized exchange (DEX) on the Fushuma Network. It allows you to trade cryptocurrencies in a fast, cheap, and secure way.
        </p>
      </details>
      <details>
        <summary>What is the difference between FUMA and WFUMA?</summary>
        <p>
          FUMA is the native coin of the Fushuma Network, while WFUMA (Wrapped FUMA) is an ERC-20 token that represents FUMA. You need to wrap your FUMA to trade it on FumaSwap.
        </p>
      </details>

      <h2>Governance</h2>
      <details>
        <summary>How do I vote on proposals?</summary>
        <p>
          You can vote on proposals on the <a href="/governance">Governance page</a>. You will need to have FUMA tokens in your wallet to vote.
        </p>
      </details>
      <details>
        <summary>How do I create a proposal?</summary>
        <p>
          You can create a proposal on the <a href="/governance/create">Create Proposal page</a>. You will need to pay a small fee in FUMA to prevent spam.
        </p>
      </details>

      <h2>Launchpad</h2>
      <details>
        <summary>How do I launch an ICO?</summary>
        <p>
          You can launch an ICO on the <a href="/launchpad/create">Create ICO page</a>. You will need to submit your project for review.
        </p>
      </details>
      <details>
        <summary>How do I participate in an ICO?</summary>
        <p>
          You can participate in ICOs on the <a href="/launchpad">Launchpad page</a>. You will need to have FUMA tokens in your wallet to invest.
        </p>
      </details>
    </article>
  );
}
