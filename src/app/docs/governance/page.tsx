import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Governance Overview | Fushuma Docs',
  description: 'Learn about the Fushuma governance process and how to participate.',
};

export default function GovernanceOverviewPage() {
  return (
    <article>
      <h1>Governance Overview</h1>
      <p className="lead">
        Fushuma is a community-governed ecosystem. This means that you, as a FUMA holder, have the power to shape the future of the platform. This guide provides an overview of the governance process and how you can get involved.
      </p>

      <h2>How it Works</h2>
      <p>
        The Fushuma governance process is based on Aragon, a popular framework for creating and managing decentralized autonomous organizations (DAOs). The process is designed to be transparent, fair, and accessible to all FUMA holders.
      </p>

      <h2>Key Components</h2>
      <ul>
        <li>
          <strong>Proposals:</strong> Any community member can create a proposal to suggest a change to the Fushuma ecosystem. Proposals can range from simple parameter changes to major new features.
        </li>
        <li>
          <strong>Voting:</strong> FUMA holders can vote on proposals using their tokens. The more FUMA you hold, the more voting power you have.
        </li>
        <li>
          <strong>Treasury:</strong> The Fushuma Treasury is a community-controlled fund that is used to finance new projects and initiatives. Proposals can be created to request funding from the Treasury.
        </li>
      </ul>

      <h2>Next Steps</h2>
      <p>
        To learn more about how to participate in Fushuma governance, you can read the following guides:
      </p>
      <ul>
        <li>
          <a href="/docs/governance/voting">How to Vote</a>
        </li>
        <li>
          <a href="/docs/governance/proposals">Creating Proposals</a>
        </li>
      </ul>
    </article>
  );
}
