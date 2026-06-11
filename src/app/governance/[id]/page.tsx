'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Navigation } from '@/components/layout/Navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Calendar, User, TrendingUp, TrendingDown, Clock, CheckCircle, Play, ListChecks, ExternalLink } from 'lucide-react';
import { useAccount, useBlockNumber, useWaitForTransactionReceipt } from 'wagmi';
import { toast } from 'sonner';
import {
  useCastVote,
  useHasVoted,
  useTotalVotingPower,
  useQueueProposal,
  useExecuteProposal,
  getProposalStateLabel,
  getProposalStateColor,
  canVoteOnProposal,
  canQueueProposal,
  canExecuteProposal,
  estimateTimeUntilEnd,
  formatLockDuration,
  hashProposalDescription,
  ProposalState,
  VoteType,
  FUSHUMA_GOVERNOR_ADDRESS,
  FushumaGovernorAbi,
  GOVERNANCE_PARAMS,
  GOVERNANCE_NETWORK,
} from '@/lib/governance';
import { useGovernanceProposal } from '@/lib/governance/useProposals';

// Helper to get transaction explorer URL
const getTransactionUrl = (hash: string) =>
  `${GOVERNANCE_NETWORK.explorerUrl}/tx/${hash}`;

function parseProposalId(id: string): bigint | undefined {
  try {
    return BigInt(id);
  } catch {
    return undefined;
  }
}

export default function ProposalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const proposalId = parseProposalId(params.id as string);

  // Proposal data from the blockchain (state, votes, and the
  // ProposalCreated event for title/description/call data)
  const {
    proposal,
    loading: isLoadingProposal,
    refetch: refetchProposal,
  } = useGovernanceProposal(proposalId);

  // Contract hooks
  const { data: currentBlock } = useBlockNumber({ watch: true });
  const { data: votingPower } = useTotalVotingPower(address);
  const { data: hasVoted } = useHasVoted(proposal?.id, address);
  const { writeContract: castVote, isPending: isVoting, data: voteHash } = useCastVote();
  const { writeContract: queueProposal, isPending: isQueueing, data: queueHash } = useQueueProposal();
  const { writeContract: executeProposal, isPending: isExecuting, data: executeHash } = useExecuteProposal();

  // Wait for transaction receipts
  const { isSuccess: isVoteSuccess, isLoading: isVoteConfirming } = useWaitForTransactionReceipt({ hash: voteHash });
  const { isSuccess: isQueueSuccess } = useWaitForTransactionReceipt({ hash: queueHash });
  const { isSuccess: isExecuteSuccess } = useWaitForTransactionReceipt({ hash: executeHash });

  const [selectedVote, setSelectedVote] = useState<VoteType | null>(null);
  const [confirmedVoteHash, setConfirmedVoteHash] = useState<string | null>(null);

  // Handle vote success - refetch so the tallies update
  useEffect(() => {
    if (isVoteSuccess && voteHash) {
      toast.success('Vote cast successfully!');
      setConfirmedVoteHash(voteHash);
      setSelectedVote(null);
      refetchProposal();
    }
  }, [isVoteSuccess, voteHash, refetchProposal]);

  // Handle queue success
  useEffect(() => {
    if (isQueueSuccess && queueHash) {
      toast.success('Proposal queued for execution!');
      refetchProposal();
    }
  }, [isQueueSuccess, queueHash, refetchProposal]);

  // Handle execute success
  useEffect(() => {
    if (isExecuteSuccess && executeHash) {
      toast.success('Proposal executed successfully!');
      refetchProposal();
    }
  }, [isExecuteSuccess, executeHash, refetchProposal]);

  if (isLoadingProposal) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container mx-auto px-4 py-16">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-32" />
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2 space-y-6">
                <div className="h-64 bg-muted rounded" />
                <div className="h-40 bg-muted rounded" />
              </div>
              <div className="space-y-6">
                <div className="h-64 bg-muted rounded" />
                <div className="h-48 bg-muted rounded" />
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (proposalId === undefined || !proposal) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container mx-auto px-4 py-16">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Proposal Not Found</h1>
            <p className="text-muted-foreground mb-4">
              The proposal you're looking for doesn't exist.
            </p>
            <Button onClick={() => router.push('/governance')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Proposals
            </Button>
          </div>
        </main>
      </div>
    );
  }

  const handleVote = async (voteType: VoteType) => {
    if (!isConnected) {
      toast.error('Please connect your wallet to vote');
      return;
    }

    if (!votingPower || votingPower === 0n) {
      toast.error('You need voting power to vote. Lock WFUMA to get voting power.');
      return;
    }

    if (hasVoted) {
      toast.error('You have already voted on this proposal');
      return;
    }

    setSelectedVote(voteType);
    
    try {
      await castVote({
        address: FUSHUMA_GOVERNOR_ADDRESS as `0x${string}`,
        abi: FushumaGovernorAbi,
        functionName: 'castVote',
        args: [proposal.id, voteType],
      });
      // Success will be handled by transaction confirmation
      // Don't show success toast here to avoid showing it before tx is confirmed
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to cast vote';
      toast.error(errorMessage);
      setSelectedVote(null);
    }
  };

  // Queue/execute need the exact call data and original description
  // string recovered from the ProposalCreated event
  const hasExecutionData =
    !!proposal.targets &&
    !!proposal.values &&
    !!proposal.calldatas &&
    proposal.rawDescription !== undefined;

  const handleQueueProposal = async () => {
    if (!isConnected) {
      toast.error('Please connect your wallet');
      return;
    }
    if (!hasExecutionData) {
      toast.error('Could not recover proposal call data from the blockchain');
      return;
    }

    try {
      const descriptionHash = hashProposalDescription(proposal.rawDescription!);

      await queueProposal({
        address: FUSHUMA_GOVERNOR_ADDRESS as `0x${string}`,
        abi: FushumaGovernorAbi,
        functionName: 'queue',
        args: [
          proposal.targets as `0x${string}`[],
          proposal.values,
          proposal.calldatas as `0x${string}`[],
          descriptionHash,
        ],
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to queue proposal';
      toast.error(errorMessage);
    }
  };

  const handleExecuteProposal = async () => {
    if (!isConnected) {
      toast.error('Please connect your wallet');
      return;
    }
    if (!hasExecutionData) {
      toast.error('Could not recover proposal call data from the blockchain');
      return;
    }

    try {
      const descriptionHash = hashProposalDescription(proposal.rawDescription!);

      await executeProposal({
        address: FUSHUMA_GOVERNOR_ADDRESS as `0x${string}`,
        abi: FushumaGovernorAbi,
        functionName: 'execute',
        args: [
          proposal.targets as `0x${string}`[],
          proposal.values,
          proposal.calldatas as `0x${string}`[],
          descriptionHash,
        ],
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to execute proposal';
      toast.error(errorMessage);
    }
  };

  const totalVotes = proposal.forVotes + proposal.againstVotes + proposal.abstainVotes;
  const forPercentage = totalVotes > 0n ? Number((proposal.forVotes * 10000n) / totalVotes) / 100 : 0;
  const againstPercentage = totalVotes > 0n ? Number((proposal.againstVotes * 10000n) / totalVotes) / 100 : 0;
  const abstainPercentage = totalVotes > 0n ? Number((proposal.abstainVotes * 10000n) / totalVotes) / 100 : 0;

  const isActive = canVoteOnProposal(proposal.state);
  const blocksRemaining = currentBlock && proposal.endBlock > currentBlock ? proposal.endBlock - currentBlock : 0n;
  const timeRemaining = currentBlock ? estimateTimeUntilEnd(proposal.endBlock, currentBlock) : 0;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 py-16">
        <Button
          variant="ghost"
          onClick={() => router.push('/governance')}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Proposals
        </Button>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            {/* Proposal Header */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start mb-4">
                  <CardTitle className="text-3xl font-bold">{proposal.title}</CardTitle>
                  <Badge className={getProposalStateColor(proposal.state)}>
                    {getProposalStateLabel(proposal.state)}
                  </Badge>
                </div>
                <div className="flex gap-4 text-sm text-muted-foreground flex-wrap">
                  <div className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    <span>
                      {proposal.proposer.slice(0, 6)}...{proposal.proposer.slice(-4)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>
                      Created {proposal.createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                  {isActive && timeRemaining > 0 && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>Ends in {formatLockDuration(timeRemaining)}</span>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="prose dark:prose-invert max-w-none">
                  <div className="whitespace-pre-wrap">{proposal.description}</div>
                </div>
              </CardContent>
            </Card>

            {/* Voting Timeline */}
            <Card>
              <CardHeader>
                <CardTitle>Voting Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Start Block:</span>
                    <span className="font-medium">{proposal.startBlock.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">End Block:</span>
                    <span className="font-medium">{proposal.endBlock.toLocaleString()}</span>
                  </div>
                  {currentBlock && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Current Block:</span>
                        <span className="font-medium">{currentBlock.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Blocks Remaining:</span>
                        <span className="font-medium">{blocksRemaining.toLocaleString()}</span>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Voting Panel */}
          <div className="space-y-6">
            {/* Current Results */}
            <Card>
              <CardHeader>
                <CardTitle>Current Results</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* For Votes */}
                <div>
                  <div className="flex justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      <span className="font-medium">For</span>
                    </div>
                    <span className="font-bold text-green-500">
                      {(Number(proposal.forVotes) / 1e18).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full transition-all"
                      style={{ width: `${forPercentage}%` }}
                    ></div>
                  </div>
                  <div className="text-right text-sm text-muted-foreground mt-1">
                    {forPercentage.toFixed(1)}%
                  </div>
                </div>

                {/* Against Votes */}
                <div>
                  <div className="flex justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <TrendingDown className="h-4 w-4 text-red-500" />
                      <span className="font-medium">Against</span>
                    </div>
                    <span className="font-bold text-red-500">
                      {(Number(proposal.againstVotes) / 1e18).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-red-500 h-2 rounded-full transition-all"
                      style={{ width: `${againstPercentage}%` }}
                    ></div>
                  </div>
                  <div className="text-right text-sm text-muted-foreground mt-1">
                    {againstPercentage.toFixed(1)}%
                  </div>
                </div>

                {/* Abstain Votes */}
                {proposal.abstainVotes > 0n && (
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="font-medium">Abstain</span>
                      <span className="font-bold">
                        {(Number(proposal.abstainVotes) / 1e18).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-gray-500 h-2 rounded-full transition-all"
                        style={{ width: `${abstainPercentage}%` }}
                      ></div>
                    </div>
                    <div className="text-right text-sm text-muted-foreground mt-1">
                      {abstainPercentage.toFixed(1)}%
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Votes:</span>
                    <span className="font-medium">
                      {(Number(totalVotes) / 1e18).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Voting Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Cast Your Vote</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {!isConnected ? (
                  <div className="text-center py-4 text-muted-foreground">
                    Connect your wallet to vote
                  </div>
                ) : !votingPower || votingPower === 0n ? (
                  <div className="text-center py-4">
                    <p className="text-muted-foreground mb-2">You need voting power to vote</p>
                    <Button
                      onClick={() => router.push('/governance/venft')}
                      size="sm"
                    >
                      Lock WFUMA to get voting power
                    </Button>
                  </div>
                ) : hasVoted || confirmedVoteHash ? (
                  <div className="text-center py-4">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
                    <p className="text-muted-foreground mb-2">
                      {confirmedVoteHash ? 'Your vote has been recorded!' : 'You have already voted'}
                    </p>
                    <p className="text-sm mb-3">
                      Your voting power: {(Number(votingPower) / 1e18).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </p>
                    {confirmedVoteHash && (
                      <a
                        href={getTransactionUrl(confirmedVoteHash)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                      >
                        View transaction <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                ) : isVoteConfirming ? (
                  <div className="text-center py-4">
                    <Clock className="h-12 w-12 text-blue-500 mx-auto mb-2 animate-pulse" />
                    <p className="text-muted-foreground mb-2">Confirming your vote...</p>
                    <p className="text-sm text-muted-foreground">
                      Please wait while the transaction is being confirmed
                    </p>
                  </div>
                ) : !isActive ? (
                  <div className="text-center py-4 text-muted-foreground">
                    Voting is not active for this proposal
                  </div>
                ) : (
                  <>
                    <div className="text-sm text-center mb-3">
                      <span className="text-muted-foreground">Your voting power:</span>
                      <span className="font-bold ml-2">
                        {(Number(votingPower) / 1e18).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <Button
                      onClick={() => handleVote(VoteType.For)}
                      disabled={isVoting}
                      className="w-full bg-green-500 hover:bg-green-600"
                    >
                      {isVoting && selectedVote === VoteType.For ? 'Voting...' : 'Vote For'}
                    </Button>
                    <Button
                      onClick={() => handleVote(VoteType.Against)}
                      disabled={isVoting}
                      className="w-full bg-red-500 hover:bg-red-600"
                    >
                      {isVoting && selectedVote === VoteType.Against ? 'Voting...' : 'Vote Against'}
                    </Button>
                    <Button
                      onClick={() => handleVote(VoteType.Abstain)}
                      disabled={isVoting}
                      variant="outline"
                      className="w-full"
                    >
                      {isVoting && selectedVote === VoteType.Abstain ? 'Voting...' : 'Abstain'}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Proposal Execution Actions */}
            {(canQueueProposal(proposal.state) || canExecuteProposal(proposal.state)) && (
              <Card>
                <CardHeader>
                  <CardTitle>Proposal Execution</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {canQueueProposal(proposal.state) && (
                    <>
                      <p className="text-sm text-muted-foreground mb-3">
                        This proposal has passed and can be queued for execution.
                      </p>
                      <Button
                        onClick={handleQueueProposal}
                        disabled={!isConnected || isQueueing || !hasExecutionData}
                        className="w-full"
                      >
                        <ListChecks className="h-4 w-4 mr-2" />
                        {isQueueing ? 'Queueing...' : 'Queue for Execution'}
                      </Button>
                    </>
                  )}
                  {canExecuteProposal(proposal.state) && (
                    <>
                      <p className="text-sm text-muted-foreground mb-3">
                        This proposal is queued and ready to be executed after the timelock delay of {GOVERNANCE_PARAMS.FushumaGovernor.timelockDelay / 86400} days.
                      </p>
                      <Button
                        onClick={handleExecuteProposal}
                        disabled={!isConnected || isExecuting || !hasExecutionData}
                        className="w-full bg-green-600 hover:bg-green-700"
                      >
                        <Play className="h-4 w-4 mr-2" />
                        {isExecuting ? 'Executing...' : 'Execute Proposal'}
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Proposal State Info for other states */}
            {proposal.state === ProposalState.Executed && (
              <Card className="border-green-500">
                <CardContent className="py-4 text-center">
                  <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                  <p className="text-sm font-medium text-green-600">Proposal Executed</p>
                </CardContent>
              </Card>
            )}
            {proposal.state === ProposalState.Defeated && (
              <Card className="border-red-500">
                <CardContent className="py-4 text-center">
                  <TrendingDown className="h-8 w-8 text-red-500 mx-auto mb-2" />
                  <p className="text-sm font-medium text-red-600">Proposal Defeated</p>
                </CardContent>
              </Card>
            )}
            {proposal.state === ProposalState.Canceled && (
              <Card className="border-gray-500">
                <CardContent className="py-4 text-center">
                  <Clock className="h-8 w-8 text-gray-500 mx-auto mb-2" />
                  <p className="text-sm font-medium text-gray-600">Proposal Canceled</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
