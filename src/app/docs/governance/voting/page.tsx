import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'How to Vote | Fushuma Docs',
  description: 'Learn how to vote on proposals in the Fushuma governance system.',
};

export default function HowToVotePage() {
  return (
    <article>
      <h1>How to Vote on Proposals</h1>
      <p className="lead">
        Voting is the core mechanism through which the Fushuma community makes decisions. This comprehensive guide will walk you through the entire voting process, from acquiring voting power to casting your vote on proposals.
      </p>

      <h2>Prerequisites: Getting Voting Power</h2>
      <p>
        Unlike traditional token-based voting, Fushuma uses a <strong>vote-escrowed (ve) model</strong>. You cannot vote directly with WFUMA tokens. Instead, you must lock your tokens to receive voting power through a veNFT.
      </p>

      <h3>Step 1: Acquire WFUMA Tokens</h3>
      <p>
        WFUMA (Wrapped FUMA) is the governance token of the Fushuma ecosystem. You can acquire WFUMA through:
      </p>
      <ul>
        <li><strong>Wrap FUMA:</strong> Visit the <a href="/governance/wrap">Wrap FUMA page</a> to convert your FUMA tokens to WFUMA (1:1 exchange rate)</li>
        <li><strong>Trade:</strong> Buy WFUMA on decentralized exchanges like FumaSwap</li>
        <li><strong>Earn:</strong> Receive WFUMA through grants or ecosystem rewards</li>
      </ul>
      <p>
        The easiest method is to wrap your existing FUMA tokens. Simply navigate to the wrap page, enter the amount you want to convert, and confirm the transaction. The process is instant and you can unwrap back to FUMA at any time.
      </p>

      <h3>Step 2: Lock WFUMA to Get a veNFT</h3>
      <p>
        Navigate to the <a href="/governance/venft">veNFT Management page</a> and follow these steps:
      </p>
      <ol>
        <li><strong>Connect Your Wallet:</strong> Click "Connect Wallet" and approve the connection</li>
        <li><strong>Enter Lock Amount:</strong> Input the amount of WFUMA you want to lock (minimum: 1 WFUMA)</li>
        <li><strong>Choose Lock Duration:</strong> Select how long you want to lock your tokens (1 month to 4 years)</li>
        <li><strong>Review Voting Power:</strong> The interface will show your expected voting power based on the multiplier</li>
        <li><strong>Approve WFUMA:</strong> Click "Approve WFUMA" and confirm the transaction</li>
        <li><strong>Create Lock:</strong> Click "Create Lock" and confirm the transaction to mint your veNFT</li>
      </ol>

      <h3>Understanding the Voting Power Multiplier</h3>
      <p>
        Your voting power is calculated as: <strong>Locked Amount × Time Multiplier</strong>
      </p>
      <p>
        The time multiplier scales linearly from 1x to 4x based on your lock duration:
      </p>
      <ul>
        <li><strong>1 month:</strong> ~1.08x multiplier</li>
        <li><strong>3 months:</strong> ~1.25x multiplier</li>
        <li><strong>6 months:</strong> ~1.50x multiplier</li>
        <li><strong>1 year:</strong> ~2.50x multiplier</li>
        <li><strong>2 years:</strong> ~3.00x multiplier</li>
        <li><strong>4 years (maximum):</strong> 4.00x multiplier</li>
      </ul>
      <p>
        <strong>Example:</strong> Locking 1,000 WFUMA for 2 years gives you approximately 3,000 voting power.
      </p>

      <h2>Voting on Proposals</h2>
      <p>
        Once you have voting power, you can participate in governance decisions.
      </p>

      <h3>Step 1: Browse Active Proposals</h3>
      <p>
        Go to the <a href="/governance">Governance Proposals page</a>. You will see:
      </p>
      <ul>
        <li>Your current voting power displayed in the dashboard</li>
        <li>A list of all proposals with their current status</li>
        <li>Filters to view Active, Pending, Succeeded, or Executed proposals</li>
      </ul>

      <h3>Step 2: Review a Proposal</h3>
      <p>
        Click on any proposal to view its details. The proposal page shows:
      </p>
      <ul>
        <li><strong>Title and Description:</strong> What the proposal aims to achieve</li>
        <li><strong>Proposer:</strong> Who created the proposal</li>
        <li><strong>Status:</strong> Current state (Active, Succeeded, etc.)</li>
        <li><strong>Voting Timeline:</strong> Start and end blocks for voting</li>
        <li><strong>Current Results:</strong> Vote counts for For, Against, and Abstain</li>
        <li><strong>Time Remaining:</strong> How much time is left to vote (for active proposals)</li>
      </ul>

      <h3>Step 3: Cast Your Vote</h3>
      <p>
        On the right side of the proposal page, you will see the "Cast Your Vote" panel. Follow these steps:
      </p>
      <ol>
        <li><strong>Verify Your Voting Power:</strong> Confirm the amount of voting power you have</li>
        <li><strong>Choose Your Vote:</strong> Select one of three options:
          <ul>
            <li><strong>Vote For:</strong> Support the proposal</li>
            <li><strong>Vote Against:</strong> Oppose the proposal</li>
            <li><strong>Abstain:</strong> Participate in quorum without taking a position</li>
          </ul>
        </li>
        <li><strong>Confirm Transaction:</strong> Click your chosen button and approve the transaction in your wallet</li>
        <li><strong>Wait for Confirmation:</strong> Your vote will be recorded on-chain once the transaction is confirmed</li>
      </ol>

      <h3>Important Voting Rules</h3>
      <ul>
        <li><strong>One Vote Per Proposal:</strong> You can only vote once on each proposal. Choose carefully!</li>
        <li><strong>Voting Power Snapshot:</strong> Your voting power is measured at the start of the voting period, not when you cast your vote</li>
        <li><strong>No Vote Changes:</strong> Once cast, votes cannot be changed or withdrawn</li>
        <li><strong>Active Proposals Only:</strong> You can only vote on proposals in the "Active" state</li>
      </ul>

      <h2>Understanding Proposal Outcomes</h2>
      <p>
        For a proposal to pass, it must meet two requirements:
      </p>
      <ol>
        <li><strong>Quorum (4%):</strong> At least 4% of the total voting power must participate in the vote</li>
        <li><strong>Approval (51%):</strong> More than 51% of votes cast must be "For"</li>
      </ol>
      <p>
        If both conditions are met, the proposal moves to "Succeeded" status. It then enters a 2-day timelock period before execution, providing a final review window for the community and the Governance Council.
      </p>

      <h2>Gauge Voting: Allocating Resources</h2>
      <p>
        In addition to voting on proposals, you can use your voting power to influence how ecosystem resources are allocated through gauge voting.
      </p>

      <h3>How Gauge Voting Works</h3>
      <p>
        Navigate to the <a href="/governance/gauges">Gauge Voting page</a> during the voting phase of an epoch (Days 1-7). You will see a list of gauges, each representing a funding destination.
      </p>

      <h3>Allocating Your Votes</h3>
      <ol>
        <li><strong>Review Available Gauges:</strong> See the current weight and description of each gauge</li>
        <li><strong>Enter Percentages:</strong> For each gauge, enter the percentage of your voting power you want to allocate</li>
        <li><strong>Check Total Allocation:</strong> Ensure your total allocation does not exceed 100%</li>
        <li><strong>Submit Votes:</strong> Click "Submit Votes" and confirm the transaction</li>
      </ol>
      <p>
        Your gauge votes determine how the ecosystem budget is distributed in the next epoch. For example, if you allocate 60% to the Grant Gauge, you are signaling that 60% of your voting power supports directing funds to community grants.
      </p>

      <h2>Monitoring Your Voting Activity</h2>
      <p>
        You can track your voting history and current positions:
      </p>
      <ul>
        <li><strong>Proposal Votes:</strong> Each proposal page shows if you have already voted</li>
        <li><strong>Gauge Allocations:</strong> The gauge voting page displays your current allocations</li>
        <li><strong>Voting Power:</strong> Your total voting power is always visible in the governance dashboard</li>
        <li><strong>On-Chain Records:</strong> All votes are permanent blockchain records viewable on <a href="https://fumascan.com" target="_blank" rel="noopener noreferrer">Fumascan</a></li>
      </ul>

      <h2>Best Practices for Voters</h2>
      <ul>
        <li><strong>Do Your Research:</strong> Read proposals carefully and understand their implications</li>
        <li><strong>Participate Regularly:</strong> Vote on proposals and gauge weights each epoch to maximize your influence</li>
        <li><strong>Long-Term Thinking:</strong> Lock tokens for longer periods to maximize your voting power and commitment</li>
        <li><strong>Engage with the Community:</strong> Discuss proposals in forums and Discord before voting</li>
        <li><strong>Monitor Outcomes:</strong> Track the results of your votes and the impact on the ecosystem</li>
      </ul>

      <h2>Troubleshooting</h2>
      <h3>I don't see my voting power</h3>
      <p>
        Make sure you have locked WFUMA tokens to create a veNFT. Simply holding WFUMA is not enough—you must lock them in the VotingEscrow contract.
      </p>

      <h3>I can't vote on a proposal</h3>
      <p>
        Check that:
      </p>
      <ul>
        <li>The proposal is in "Active" status</li>
        <li>You have voting power (veNFT)</li>
        <li>You haven't already voted on this proposal</li>
        <li>Your wallet is connected to the correct network (Fushuma zkEVM+ Mainnet)</li>
      </ul>

      <h3>My transaction failed</h3>
      <p>
        Common causes include:
      </p>
      <ul>
        <li>Insufficient gas (FUMA) for the transaction</li>
        <li>Voting period has ended</li>
        <li>Network congestion—try again with higher gas</li>
      </ul>

      <h2>Next Steps</h2>
      <p>
        Now that you understand how to vote, explore these related topics:
      </p>
      <ul>
        <li><a href="/docs/governance/proposals">Creating Proposals</a> - Learn how to submit your own proposals</li>
        <li><a href="/docs/governance">Governance Overview</a> - Understand the full governance system</li>
      </ul>
    </article>
  );
}
