import { Metadata } from 'next';
import { DocHero } from '@/components/docs/DocHero';
import { Vote } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Governance Overview | Fushuma Docs',
  description: 'Learn about the Fushuma governance process and how to participate.',
};

export default function GovernanceOverviewPage() {
  return (
    <article>
      <DocHero
        title="Governance Overview"
        description="Fushuma is a community-governed ecosystem. This means that you, as a WFUMA holder, have the power to shape the future of the platform through decentralized decision-making."
        icon={Vote}
      />

      <h2>How Fushuma Governance Works</h2>
      <p>
        The Fushuma governance system is built on a <strong>vote-escrowed (ve) model</strong>, where participants lock their WFUMA tokens to receive voting power. The longer you lock your tokens, the more voting power you receive, incentivizing long-term commitment to the ecosystem. This model is inspired by successful governance frameworks like Curve Finance and is implemented using battle-tested smart contracts.
      </p>

      <h2>The 14-Day Governance Epoch</h2>
      <p>
        Governance operates in recurring <strong>14-day cycles called epochs</strong>. Each epoch is divided into three phases:
      </p>
      <ul>
        <li><strong>Phase 1: Voting (Days 1-7)</strong> - Active voting on proposals and gauge weights</li>
        <li><strong>Phase 2: Distribution (Days 8-10)</strong> - Resource allocation and fund distribution based on votes</li>
        <li><strong>Phase 3: Preparation (Days 11-14)</strong> - Cooldown period and preparation for the next epoch</li>
      </ul>

      <h2>Key Components</h2>

      <h3>veNFTs: Your Voting Power</h3>
      <p>
        When you lock WFUMA tokens in the VotingEscrow contract, you receive a <strong>veNFT (Vote-Escrowed NFT)</strong>. This NFT represents your locked position and determines your voting power. Your power is calculated based on:
      </p>
      <ul>
        <li><strong>Amount Locked:</strong> More tokens = more base voting power</li>
        <li><strong>Lock Duration:</strong> Longer locks = higher multiplier (up to 4x for 4-year locks)</li>
      </ul>
      <p>
        For example, locking 1,000 WFUMA for 2 years gives you approximately 2,500 voting power, while locking for 4 years gives you 4,000 voting power.
      </p>

      <h3>Governance Proposals</h3>
      <p>
        Proposals are the primary mechanism for making changes to the Fushuma ecosystem. Any holder with at least <strong>1,000 voting power</strong> can create a proposal. Proposals follow a clear lifecycle:
      </p>
      <ul>
        <li><strong>Pending:</strong> Awaiting activation</li>
        <li><strong>Active:</strong> Open for voting (7-day window)</li>
        <li><strong>Succeeded/Defeated:</strong> Vote results determined</li>
        <li><strong>Queued:</strong> Waiting in timelock (2-day security delay)</li>
        <li><strong>Executed:</strong> Changes implemented on-chain</li>
      </ul>
      <p>
        For a proposal to pass, it must meet a <strong>4% quorum</strong> (4% of total voting power must participate) and receive a <strong>51% approval</strong> from votes cast.
      </p>

      <h3>Gauge Voting: Resource Allocation</h3>
      <p>
        Gauge voting allows the community to decide how ecosystem resources are allocated. During each epoch's voting phase, veNFT holders distribute their voting power across different gauges (funding destinations). The percentage of votes each gauge receives determines its share of the distributable budget.
      </p>
      <p>
        Current gauges include:
      </p>
      <ul>
        <li><strong>Grant Gauge:</strong> Funds community grants and ecosystem projects</li>
        <li><strong>Liquidity Mining:</strong> Rewards for DeFi liquidity providers</li>
        <li><strong>Developer Incentives:</strong> Support for core development and builders</li>
      </ul>

      <h3>The Governance Council</h3>
      <p>
        The <strong>3-member Governance Council</strong> provides oversight and emergency intervention capabilities. The Council requires 2-of-3 approval for any action and has two key powers:
      </p>
      <ul>
        <li><strong>Veto:</strong> Cancel malicious proposals to protect the protocol</li>
        <li><strong>Expedite:</strong> Fast-track critical proposals in emergencies</li>
      </ul>
      <p>
        The Council cannot create proposals, vote in community polls, or modify governance parameters directly. Their role is strictly oversight and emergency response.
      </p>

      <h2>How Funds Flow Through the System</h2>
      <p>
        The governance system controls the allocation of the Fushuma Treasury through a transparent, on-chain process:
      </p>
      <ol>
        <li><strong>Voting Phase:</strong> Community votes on gauge weights</li>
        <li><strong>Weight Calculation:</strong> GaugeController determines distribution percentages</li>
        <li><strong>Fund Movement:</strong> Treasury transfers funds to gauge contracts based on weights</li>
        <li><strong>Distribution:</strong> Individual gauges distribute to end recipients (grantees, LPs, etc.)</li>
      </ol>
      <p>
        All transactions are recorded on-chain, providing complete transparency and auditability.
      </p>

      <h2>Getting Started with Governance</h2>
      <p>
        Ready to participate? Here's how to get started:
      </p>
      <ol>
        <li><strong>Acquire WFUMA:</strong> You need WFUMA tokens to participate</li>
        <li><strong>Lock Tokens:</strong> Visit the <a href="/governance/venft">veNFT Management</a> page to lock your tokens and receive voting power</li>
        <li><strong>Vote on Proposals:</strong> Browse <a href="/governance">active proposals</a> and cast your votes</li>
        <li><strong>Allocate Resources:</strong> Use <a href="/governance/gauges">gauge voting</a> to influence how ecosystem funds are distributed</li>
      </ol>

      <h2>Testing the System</h2>
      <p>
        We encourage all community members to test the governance system. You can experiment with:
      </p>
      <ul>
        <li>Creating locks with different amounts and durations</li>
        <li>Voting on test proposals</li>
        <li>Allocating gauge weights across different initiatives</li>
        <li>Viewing your voting history and power over time</li>
      </ul>

      <h2>Learn More</h2>
      <p>
        For detailed guides on specific aspects of governance, explore these resources:
      </p>
      <ul>
        <li><a href="/docs/governance/voting">How to Vote on Proposals</a></li>
        <li><a href="/docs/governance/proposals">Creating and Managing Proposals</a></li>
      </ul>

      <h2>Smart Contract Addresses</h2>
      <p>
        All governance contracts are deployed on the Fushuma zkEVM+ Mainnet (Chain ID: 121224):
      </p>
      <ul>
        <li><strong>WFUMA:</strong> <code>0xBcA7B11c788dBb85bE92627ef1e60a2A9B7e2c6E</code></li>
        <li><strong>VotingEscrow:</strong> <code>0x80Ebf301efc7b0FF1825dC3B4e8d69e414eaa26f</code></li>
        <li><strong>FushumaGovernor:</strong> <code>0xF36107b3AA203C331284E5A467C1c58bDD5b591D</code></li>
        <li><strong>GaugeController:</strong> <code>0x41E7ba36C43CCd4b83a326bB8AEf929e109C9466</code></li>
        <li><strong>GrantGauge:</strong> <code>0x0D6833778cf1fa803D21075b800483F68f57A153</code></li>
        <li><strong>GovernanceCouncil:</strong> <code>0x92bCcdcae7B73A5332429e517D26515D447e9997</code></li>
        <li><strong>EpochManager:</strong> <code>0x36C3b4EA7dC2622b8C63a200B60daC0ab2d8f453</code></li>
      </ul>
      <p>
        You can verify all contracts on <a href="https://fumascan.com" target="_blank" rel="noopener noreferrer">Fumascan</a>.
      </p>
    </article>
  );
}
