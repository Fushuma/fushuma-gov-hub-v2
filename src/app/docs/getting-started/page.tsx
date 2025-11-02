import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Getting Started | Fushuma Docs',
  description: 'Learn how to get started with the Fushuma ecosystem.',
};

export default function GettingStartedPage() {
  return (
    <article>
      <h1>Getting Started</h1>
      <p className="lead">
        Welcome to the Fushuma ecosystem! This guide will help you get set up and ready to explore everything Fushuma has to offer.
      </p>

      <h2>What You Can Do</h2>
      <p>
        The Fushuma Hub is your gateway to a decentralized world of finance, governance, and innovation. Here are just a few of the things you can do:
      </p>
      <ul>
        <li>
          <strong>Trade</strong> tokens on our decentralized exchange, FumaSwap.
        </li>
        <li>
          <strong>Vote</strong> on proposals and shape the future of the ecosystem.
        </li>
        <li>
          <strong>Fund</strong> new projects through our community grants program.
        </li>
        <li>
          <strong>Launch</strong> your own project on our token launchpad.
        </li>
        <li>
          <strong>Join</strong> our community of builders and leaders in the Taishi Program.
        </li>
      </ul>

      <h2>Next Steps</h2>
      <p>
        Follow these guides to get started:
      </p>
      <ul>
        <li>
          <a href="/docs/getting-started/wallet-setup">Wallet Setup</a>
        </li>
        <li>
          <a href="/docs/getting-started/getting-fuma">Getting FUMA</a>
        </li>
      </ul>
    </article>
  );
}
