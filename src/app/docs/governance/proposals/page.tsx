import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Creating Proposals | Fushuma Docs',
  description: 'Learn how to create a proposal in the Fushuma governance system.',
};

export default function CreatingProposalsPage() {
  return (
    <article>
      <h1>Creating Proposals</h1>
      <p className="lead">
        Creating a proposal is a great way to suggest a change to the Fushuma ecosystem. This guide will explain the process of creating and submitting a proposal.
      </p>

      <h2>1. Draft Your Proposal</h2>
      <p>
        Before you create a proposal, it is a good idea to draft it out and get feedback from the community. You can do this on the Fushuma forum or Discord server.
      </p>

      <h2>2. Go to the Create Proposal Page</h2>
      <p>
        Once you are ready, navigate to the <a href="/governance/create">Create Proposal page</a>.
      </p>

      <h2>3. Fill Out the Proposal Form</h2>
      <p>
        You will need to provide a title, a description, and any relevant links or documents for your proposal. Make sure your proposal is clear, concise, and easy to understand.
      </p>

      <h2>4. Submit Your Proposal</h2>
      <p>
        Once you have filled out the form, you can submit your proposal. You will need to pay a small fee in FUMA to prevent spam. After you have submitted your proposal, it will be visible to the community for voting.
      </p>

      <h2>Proposal Lifecycle</h2>
      <ol>
        <li>
          <strong>Draft:</strong> The proposal is being drafted and discussed in the community.
        </li>
        <li>
          <strong>Active:</strong> The proposal is open for voting.
        </li>
        <li>
          <strong>Passed:</strong> The proposal has been approved by the community.
        </li>
        <li>
          <strong>Rejected:</strong> The proposal has been rejected by the community.
        </li>
        <li>
          <strong>Executed:</strong> The proposal has been implemented.
        </li>
      </ol>
    </article>
  );
}
