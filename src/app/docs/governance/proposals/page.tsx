import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Creating Proposals | Fushuma Docs',
  description: 'Learn how to create a proposal in the Fushuma governance system.',
};

export default function CreatingProposalsPage() {
  return (
    <article>
      <h1>Creating and Managing Proposals</h1>
      <p className="lead">
        Proposals are the primary mechanism for making changes to the Fushuma ecosystem. This guide explains how to create, submit, and manage governance proposals, from initial ideation to final execution.
      </p>

      <h2>Prerequisites for Creating Proposals</h2>
      <p>
        To create a proposal, you must meet the <strong>proposal threshold</strong> requirement. This is a spam prevention mechanism that ensures only committed community members can submit proposals.
      </p>

      <h3>Proposal Threshold: 1,000 Voting Power</h3>
      <p>
        You need at least <strong>1,000 voting power</strong> to create a proposal. This is achieved by locking WFUMA tokens in the VotingEscrow contract. For example:
      </p>
      <ul>
        <li>Lock 1,000 WFUMA for 1 month (~1.08x multiplier) = ~1,080 voting power ✓</li>
        <li>Lock 500 WFUMA for 1 year (~2.5x multiplier) = ~1,250 voting power ✓</li>
        <li>Lock 250 WFUMA for 4 years (4x multiplier) = 1,000 voting power ✓</li>
      </ul>
      <p>
        If you don't have enough voting power, visit the <a href="/governance/venft">veNFT Management page</a> to lock more tokens or extend your lock duration.
      </p>

      <h2>The Proposal Creation Process</h2>

      <h3>Step 1: Community Discussion (Pre-Proposal Phase)</h3>
      <p>
        Before creating an on-chain proposal, it is strongly recommended to discuss your idea with the community. This helps refine your proposal, identify potential issues, and gauge community support.
      </p>
      <ul>
        <li><strong>Fushuma Forum:</strong> Post a detailed proposal draft for feedback</li>
        <li><strong>Discord:</strong> Discuss in the #governance channel</li>
        <li><strong>Temperature Check:</strong> Create an informal poll to gauge interest</li>
      </ul>
      <p>
        Successful proposals typically have strong community support before going on-chain. Use this phase to iterate on your idea and build consensus.
      </p>

      <h3>Step 2: Draft Your Proposal</h3>
      <p>
        A well-structured proposal should include:
      </p>
      <ul>
        <li><strong>Title:</strong> Clear and concise (e.g., "Increase Grant Gauge Allocation by 10%")</li>
        <li><strong>Summary:</strong> One-paragraph overview of the proposal</li>
        <li><strong>Motivation:</strong> Why is this change needed? What problem does it solve?</li>
        <li><strong>Specification:</strong> Detailed technical description of the proposed changes</li>
        <li><strong>Impact Analysis:</strong> How will this affect the ecosystem, users, and treasury?</li>
        <li><strong>Implementation:</strong> Step-by-step plan for executing the proposal</li>
        <li><strong>Timeline:</strong> Expected timeframe for implementation</li>
        <li><strong>Risks:</strong> Potential downsides or challenges</li>
      </ul>

      <h3>Step 3: Submit On-Chain</h3>
      <p>
        Once your proposal has been discussed and refined, you can submit it on-chain:
      </p>
      <ol>
        <li>Navigate to the <a href="/governance/create">Create Proposal page</a></li>
        <li>Connect your wallet (ensure you have 1,000+ voting power)</li>
        <li>Fill out the proposal form with your title and description</li>
        <li>Set the voting parameters (quorum, duration)</li>
        <li>Review and submit the transaction</li>
        <li>Confirm in your wallet and pay the gas fee</li>
      </ol>
      <p>
        <strong>Note:</strong> Creating a proposal requires a transaction on the Fushuma blockchain. Make sure you have enough FUMA for gas fees.
      </p>

      <h2>The Proposal Lifecycle</h2>
      <p>
        Once submitted, your proposal goes through several stages:
      </p>

      <h3>1. Pending</h3>
      <p>
        Your proposal has been created but is not yet active for voting. It is awaiting the start of the next voting phase or review by the Governance Council. During this time:
      </p>
      <ul>
        <li>The proposal is visible on the governance page</li>
        <li>Community members can review and discuss it</li>
        <li>The proposer can cancel it if needed</li>
      </ul>

      <h3>2. Active</h3>
      <p>
        The proposal is now open for voting. This phase lasts for <strong>7 days</strong> (the voting phase of the current epoch). During this time:
      </p>
      <ul>
        <li>All veNFT holders can cast their votes (For, Against, or Abstain)</li>
        <li>Vote counts are updated in real-time</li>
        <li>The proposal page shows time remaining and current results</li>
      </ul>

      <h3>3. Succeeded or Defeated</h3>
      <p>
        After the 7-day voting period ends, the proposal outcome is determined:
      </p>
      <ul>
        <li><strong>Succeeded:</strong> The proposal met the 4% quorum requirement and received 51%+ approval</li>
        <li><strong>Defeated:</strong> The proposal failed to meet quorum or approval threshold</li>
      </ul>

      <h3>4. Queued (Succeeded Proposals Only)</h3>
      <p>
        Successful proposals enter a <strong>2-day timelock period</strong>. This is a security measure that:
      </p>
      <ul>
        <li>Provides a final review window for the community</li>
        <li>Allows the Governance Council to veto malicious proposals</li>
        <li>Gives users time to react to significant changes</li>
      </ul>
      <p>
        During this phase, the proposal cannot be executed yet, but it is locked in and ready for implementation.
      </p>

      <h3>5. Executed</h3>
      <p>
        After the timelock expires, the proposal can be executed. Execution means:
      </p>
      <ul>
        <li>The proposed changes are implemented on-chain</li>
        <li>Smart contract functions are called automatically</li>
        <li>The proposal is marked as complete</li>
      </ul>
      <p>
        Anyone can trigger the execution transaction once the timelock period has passed.
      </p>

      <h3>6. Cancelled</h3>
      <p>
        A proposal can be cancelled in two ways:
      </p>
      <ul>
        <li><strong>By the Proposer:</strong> Before voting starts, the proposer can cancel their own proposal</li>
        <li><strong>By the Council:</strong> The Governance Council can veto a proposal at any stage if it is deemed harmful</li>
      </ul>

      <h2>Types of Proposals</h2>

      <h3>Parameter Change Proposals</h3>
      <p>
        These proposals modify governance or protocol parameters, such as:
      </p>
      <ul>
        <li>Changing the proposal threshold</li>
        <li>Adjusting quorum requirements</li>
        <li>Modifying epoch duration</li>
        <li>Updating gauge weights</li>
      </ul>

      <h3>Treasury Proposals</h3>
      <p>
        These proposals allocate funds from the Fushuma Treasury for specific purposes:
      </p>
      <ul>
        <li>Funding grants for ecosystem projects</li>
        <li>Paying for audits or development work</li>
        <li>Marketing and partnership initiatives</li>
      </ul>

      <h3>Smart Contract Upgrade Proposals</h3>
      <p>
        These proposals implement changes to the core protocol contracts:
      </p>
      <ul>
        <li>Deploying new contract versions</li>
        <li>Upgrading proxy implementations</li>
        <li>Adding new features to the protocol</li>
      </ul>

      <h3>Governance Process Proposals</h3>
      <p>
        These proposals modify the governance process itself:
      </p>
      <ul>
        <li>Electing new Governance Council members</li>
        <li>Changing voting mechanisms</li>
        <li>Creating new gauges</li>
      </ul>

      <h2>Best Practices for Proposers</h2>

      <h3>Do's</h3>
      <ul>
        <li><strong>Engage Early:</strong> Discuss your idea in the community before submitting on-chain</li>
        <li><strong>Be Clear:</strong> Write proposals that are easy to understand for all community members</li>
        <li><strong>Provide Data:</strong> Support your proposal with evidence, analysis, and projections</li>
        <li><strong>Consider Alternatives:</strong> Acknowledge other approaches and explain why yours is best</li>
        <li><strong>Be Responsive:</strong> Answer questions and address concerns from the community</li>
        <li><strong>Plan Implementation:</strong> Have a clear execution plan before proposing</li>
      </ul>

      <h3>Don'ts</h3>
      <ul>
        <li><strong>Don't Rush:</strong> Take time to refine your proposal based on feedback</li>
        <li><strong>Don't Be Vague:</strong> Avoid proposals that lack specific details or implementation plans</li>
        <li><strong>Don't Ignore Concerns:</strong> Address community feedback seriously</li>
        <li><strong>Don't Propose Without Support:</strong> Gauge community interest before going on-chain</li>
      </ul>

      <h2>The Role of the Governance Council</h2>
      <p>
        The 3-member Governance Council has two powers related to proposals:
      </p>

      <h3>Veto Power</h3>
      <p>
        The Council can veto a proposal if 2 of 3 members agree it is harmful to the protocol. This is a defensive measure against:
      </p>
      <ul>
        <li>Malicious proposals that could drain the treasury</li>
        <li>Proposals that introduce security vulnerabilities</li>
        <li>Governance attacks by bad actors</li>
      </ul>

      <h3>Expedite Power</h3>
      <p>
        For critical proposals (e.g., emergency bug fixes), the Council can expedite execution by skipping the 2-day timelock. This requires 2 of 3 Council members to approve.
      </p>

      <h2>Monitoring Your Proposal</h2>
      <p>
        After submitting a proposal, you can track its progress:
      </p>
      <ul>
        <li><strong>Proposal Page:</strong> View real-time vote counts and status</li>
        <li><strong>Governance Dashboard:</strong> See your proposal in the list of all proposals</li>
        <li><strong>On-Chain Records:</strong> All proposal data is permanently recorded on the blockchain</li>
      </ul>

      <h2>What Happens If My Proposal Fails?</h2>
      <p>
        If your proposal is defeated, you can:
      </p>
      <ul>
        <li>Analyze the voting results to understand why it failed</li>
        <li>Gather more community feedback</li>
        <li>Revise the proposal based on concerns raised</li>
        <li>Resubmit an improved version in a future epoch</li>
      </ul>
      <p>
        Failure is a normal part of the governance process. Use it as an opportunity to refine your ideas and build stronger consensus.
      </p>

      <h2>Next Steps</h2>
      <p>
        Ready to participate in governance? Explore these resources:
      </p>
      <ul>
        <li><a href="/docs/governance/voting">How to Vote</a> - Learn how to vote on proposals</li>
        <li><a href="/docs/governance">Governance Overview</a> - Understand the full governance system</li>
        <li><a href="/governance">View Proposals</a> - See current and past proposals</li>
      </ul>
    </article>
  );
}
