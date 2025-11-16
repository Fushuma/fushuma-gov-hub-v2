'use client';

import { useState, useEffect } from 'react';
import { Navigation } from '@/components/layout/Navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowRight, Wallet } from 'lucide-react';
import Link from 'next/link';
import { useAccount } from 'wagmi';
import {
  useTotalVotingPower,
  useProposalThreshold,
  getProposalStateLabel,
  getProposalStateColor,
  ProposalState,
} from '@/lib/governance';

// Mock data for now - will be replaced with contract event indexing
const MOCK_PROPOSALS = [
  {
    id: 1n,
    title: 'Increase Grant Budget for Q1 2026',
    description: 'Proposal to increase the quarterly grant budget from 100,000 WFUMA to 150,000 WFUMA to support more community projects.',
    proposer: '0xC8e420222d4c93355776eD77f9A34757fb6f3eea',
    state: ProposalState.Active,
    forVotes: 45000n,
    againstVotes: 12000n,
    abstainVotes: 3000n,
    startBlock: 1000000n,
    endBlock: 1050400n,
    createdAt: new Date('2025-11-10'),
  },
  {
    id: 2n,
    title: 'Protocol Upgrade: Fushuma V3',
    description: 'Major protocol upgrade to improve transaction speeds and reduce gas costs. This includes optimizations to the zkEVM layer.',
    proposer: '0x7152B9A7BD708750892e577Fcc96ea24FDDF37a4',
    state: ProposalState.Succeeded,
    forVotes: 120000n,
    againstVotes: 8000n,
    abstainVotes: 2000n,
    startBlock: 950000n,
    endBlock: 1000400n,
    createdAt: new Date('2025-11-05'),
  },
  {
    id: 3n,
    title: 'Add New Gauge for DeFi Rewards',
    description: 'Create a new gauge to distribute rewards to liquidity providers on FumaSwap.',
    proposer: '0x45FAc82b24511927a201C2cdFC506625dECe3d22',
    state: ProposalState.Pending,
    forVotes: 0n,
    againstVotes: 0n,
    abstainVotes: 0n,
    startBlock: 1100000n,
    endBlock: 1150400n,
    createdAt: new Date('2025-11-15'),
  },
];

export default function GovernancePage() {
  const { address, isConnected } = useAccount();
  const [statusFilter, setStatusFilter] = useState<ProposalState | 'all'>('all');
  const [proposals, setProposals] = useState(MOCK_PROPOSALS);

  // Get user's voting power
  const { data: votingPower } = useTotalVotingPower(address);
  const { data: proposalThreshold } = useProposalThreshold();

  // Filter proposals based on status
  const filteredProposals = proposals.filter(
    (p) => statusFilter === 'all' || p.state === statusFilter
  );

  const canCreateProposal = votingPower && proposalThreshold && votingPower >= proposalThreshold;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Governance Proposals</h1>
            <p className="text-muted-foreground">
              Vote on proposals to shape the future of Fushuma
            </p>
          </div>
          <Link href="/governance/create">
            <Button disabled={!isConnected || !canCreateProposal}>
              Create Proposal
            </Button>
          </Link>
        </div>

        {/* User Stats */}
        {isConnected && (
          <Card className="mb-6">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Your Voting Power:</span>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">
                    {votingPower ? (Number(votingPower) / 1e18).toLocaleString(undefined, { maximumFractionDigits: 2 }) : '0'}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {canCreateProposal ? (
                      <span className="text-green-500">✓ Can create proposals</span>
                    ) : (
                      <span>
                        Need {proposalThreshold ? (Number(proposalThreshold) / 1e18).toLocaleString() : '1,000'} to propose
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Status Filters */}
        <div className="flex gap-2 mb-6 flex-wrap">
          <Button
            variant={statusFilter === 'all' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('all')}
            size="sm"
          >
            All
          </Button>
          <Button
            variant={statusFilter === ProposalState.Active ? 'default' : 'outline'}
            onClick={() => setStatusFilter(ProposalState.Active)}
            size="sm"
          >
            Active
          </Button>
          <Button
            variant={statusFilter === ProposalState.Pending ? 'default' : 'outline'}
            onClick={() => setStatusFilter(ProposalState.Pending)}
            size="sm"
          >
            Pending
          </Button>
          <Button
            variant={statusFilter === ProposalState.Succeeded ? 'default' : 'outline'}
            onClick={() => setStatusFilter(ProposalState.Succeeded)}
            size="sm"
          >
            Succeeded
          </Button>
          <Button
            variant={statusFilter === ProposalState.Queued ? 'default' : 'outline'}
            onClick={() => setStatusFilter(ProposalState.Queued)}
            size="sm"
          >
            Queued
          </Button>
          <Button
            variant={statusFilter === ProposalState.Executed ? 'default' : 'outline'}
            onClick={() => setStatusFilter(ProposalState.Executed)}
            size="sm"
          >
            Executed
          </Button>
        </div>

        {/* Empty State */}
        {filteredProposals.length === 0 && (
          <Card>
            <CardContent className="py-16 text-center">
              <h3 className="text-xl font-semibold mb-2">No Proposals Found</h3>
              <p className="text-muted-foreground mb-4">
                {statusFilter !== 'all'
                  ? `There are no ${getProposalStateLabel(statusFilter as ProposalState).toLowerCase()} proposals at the moment.`
                  : 'Be the first to create a governance proposal!'}
              </p>
              {isConnected && canCreateProposal ? (
                <Link href="/governance/create">
                  <Button>Create First Proposal</Button>
                </Link>
              ) : null}
            </CardContent>
          </Card>
        )}

        {/* Proposals List */}
        {filteredProposals.length > 0 && (
          <div className="space-y-6">
            {filteredProposals.map((proposal) => (
              <ProposalCard key={proposal.id.toString()} proposal={proposal} />
            ))}
          </div>
        )}

        {/* Info Banner */}
        {!isConnected && (
          <Card className="mt-6 border-blue-500">
            <CardContent className="py-4">
              <p className="text-center text-sm">
                <Wallet className="inline h-4 w-4 mr-2" />
                Connect your wallet to view your voting power and participate in governance
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}

function ProposalCard({ proposal }: { proposal: typeof MOCK_PROPOSALS[0] }) {
  const totalVotes = proposal.forVotes + proposal.againstVotes + proposal.abstainVotes;
  const forPercentage = totalVotes > 0n ? Number((proposal.forVotes * 10000n) / totalVotes) / 100 : 0;
  const againstPercentage = totalVotes > 0n ? Number((proposal.againstVotes * 10000n) / totalVotes) / 100 : 0;

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <CardTitle className="text-2xl font-bold">{proposal.title}</CardTitle>
              <Badge className={getProposalStateColor(proposal.state)}>
                {getProposalStateLabel(proposal.state)}
              </Badge>
            </div>
            <div className="text-sm text-muted-foreground">
              Proposed by {proposal.proposer.slice(0, 6)}...{proposal.proposer.slice(-4)} •{' '}
              {proposal.createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground mb-4 line-clamp-2">{proposal.description}</p>
        
        {/* Vote Progress */}
        {totalVotes > 0n && (
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-green-600 font-medium">
                For: {(Number(proposal.forVotes) / 1e18).toLocaleString()} ({forPercentage.toFixed(1)}%)
              </span>
              <span className="text-red-600 font-medium">
                Against: {(Number(proposal.againstVotes) / 1e18).toLocaleString()} ({againstPercentage.toFixed(1)}%)
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div className="flex h-full">
                <div
                  className="bg-green-500"
                  style={{ width: `${forPercentage}%` }}
                ></div>
                <div
                  className="bg-red-500"
                  style={{ width: `${againstPercentage}%` }}
                ></div>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center">
          <div className="text-sm text-muted-foreground">
            Total Votes: {(Number(totalVotes) / 1e18).toLocaleString()}
          </div>
          <Link href={`/governance/${proposal.id}`}>
            <Button variant="outline" className="gap-2">
              View Details <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
