'use client';

import { useState, useMemo } from 'react';
import { Navigation } from '@/components/layout/Navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowRight, Wallet, RefreshCw, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useAccount } from 'wagmi';
import {
  useTotalVotingPower,
  useProposalThreshold,
  getProposalStateLabel,
  getProposalStateColor,
  ProposalState,
} from '@/lib/governance';
import { useGovernanceProposals, type GovernanceProposal } from '@/lib/governance/useProposals';

export default function GovernancePage() {
  const { address, isConnected } = useAccount();
  const [statusFilter, setStatusFilter] = useState<ProposalState | 'all'>('all');

  // Fetch proposals from the blockchain
  const { proposals: onChainProposals, loading, error, refetch } = useGovernanceProposals();

  // Get user's voting power
  const { data: votingPower } = useTotalVotingPower(address);
  const { data: proposalThreshold } = useProposalThreshold();

  // Filter proposals based on status
  const filteredProposals = useMemo(() => {
    return onChainProposals.filter(
      (p) => statusFilter === 'all' || p.state === statusFilter
    );
  }, [onChainProposals, statusFilter]);

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
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={() => refetch()}
              disabled={loading}
              title="Refresh proposals"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Link href="/governance/create">
              <Button disabled={!isConnected || !canCreateProposal}>
                Create Proposal
              </Button>
            </Link>
          </div>
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

        {/* Error State */}
        {error && (
          <Card className="mb-6 border-red-500">
            <CardContent className="py-4">
              <div className="flex items-center gap-2 text-red-600">
                <AlertCircle className="h-5 w-5" />
                <span>Error loading proposals: {error.message}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loading State */}
        {loading && (
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2 mt-2"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredProposals.length === 0 && (
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
        {!loading && filteredProposals.length > 0 && (
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

function ProposalCard({ proposal }: { proposal: GovernanceProposal }) {
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
