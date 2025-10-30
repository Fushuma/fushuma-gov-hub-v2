'use client';

import { useParams, useRouter } from 'next/navigation';
import { Navigation } from '@/components/layout/Navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc/client';
import { ArrowLeft, Calendar, User, TrendingUp, TrendingDown } from 'lucide-react';
import { format } from 'date-fns';
import { useState } from 'react';
import { toast } from 'sonner';

export default function ProposalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const proposalId = parseInt(params.id as string);
  const [selectedVote, setSelectedVote] = useState<'for' | 'against' | 'abstain' | null>(null);

  const { data: proposal, isLoading, error } = trpc.proposals.getById.useQuery(
    { id: proposalId },
    { enabled: !isNaN(proposalId) }
  );

  const { data: votes } = trpc.proposals.getVotes.useQuery(
    { proposalId },
    { enabled: !isNaN(proposalId) }
  );

  const { data: userVote } = trpc.proposals.getUserVote.useQuery(
    { proposalId },
    { enabled: !isNaN(proposalId) }
  );

  const voteMutation = trpc.proposals.vote.useMutation({
    onSuccess: () => {
      toast.success('Vote submitted successfully!');
      setSelectedVote(null);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to submit vote');
    },
  });

  const handleVote = (voteChoice: 'for' | 'against' | 'abstain') => {
    if (!proposal) return;
    
    voteMutation.mutate({
      proposalId: proposal.id,
      voteChoice,
      votingPower: 1,
    });
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-blue-500';
      case 'passed':
        return 'bg-green-500';
      case 'rejected':
      case 'cancelled':
        return 'bg-red-500';
      case 'executed':
        return 'bg-purple-500';
      case 'pending':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusLabel = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  if (isNaN(proposalId)) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container mx-auto px-4 py-16">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Invalid Proposal ID</h1>
            <Button onClick={() => router.push('/governance')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Proposals
            </Button>
          </div>
        </main>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container mx-auto px-4 py-16">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-300 rounded w-1/4"></div>
            <div className="h-64 bg-gray-300 rounded"></div>
          </div>
        </main>
      </div>
    );
  }

  if (error || !proposal) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container mx-auto px-4 py-16">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Proposal Not Found</h1>
            <p className="text-muted-foreground mb-4">
              The proposal you're looking for doesn't exist or has been removed.
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

  const totalVotes = proposal.votesFor + proposal.votesAgainst;
  const forPercentage = totalVotes > 0 ? (proposal.votesFor / totalVotes) * 100 : 0;
  const againstPercentage = totalVotes > 0 ? (proposal.votesAgainst / totalVotes) * 100 : 0;

  const isActive = proposal.status === 'active';
  const hasVoted = !!userVote;

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
                  <Badge className={getStatusClass(proposal.status)}>
                    {getStatusLabel(proposal.status)}
                  </Badge>
                </div>
                <div className="flex gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    <span>{proposal.proposer}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>Created {format(new Date(proposal.createdAt), 'MMM dd, yyyy')}</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="prose dark:prose-invert max-w-none">
                  <p className="whitespace-pre-wrap">{proposal.description}</p>
                </div>
              </CardContent>
            </Card>

            {/* Voting Timeline */}
            <Card>
              <CardHeader>
                <CardTitle>Voting Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Start Date:</span>
                    <span className="font-medium">
                      {format(new Date(proposal.startDate), 'MMM dd, yyyy HH:mm')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">End Date:</span>
                    <span className="font-medium">
                      {format(new Date(proposal.endDate), 'MMM dd, yyyy HH:mm')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Quorum:</span>
                    <span className="font-medium">{proposal.quorum.toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Votes */}
            {votes && votes.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Recent Votes ({votes.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {votes.slice(0, 10).map((vote) => (
                      <div
                        key={vote.id}
                        className="flex justify-between items-center py-2 border-b last:border-b-0"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-mono">
                            {vote.voterAddress.slice(0, 6)}...{vote.voterAddress.slice(-4)}
                          </span>
                          <Badge
                            variant="outline"
                            className={
                              vote.voteChoice === 'for'
                                ? 'border-green-500 text-green-500'
                                : vote.voteChoice === 'against'
                                ? 'border-red-500 text-red-500'
                                : 'border-gray-500 text-gray-500'
                            }
                          >
                            {vote.voteChoice}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {vote.votingPower.toLocaleString()} votes
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Voting Panel */}
          <div className="space-y-6">
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
                      {proposal.votesFor.toLocaleString()}
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
                      {proposal.votesAgainst.toLocaleString()}
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

                <div className="pt-4 border-t">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Votes:</span>
                    <span className="font-medium">{totalVotes.toLocaleString()}</span>
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
                {hasVoted ? (
                  <div className="text-center py-4">
                    <p className="text-muted-foreground mb-2">You have already voted</p>
                    <Badge variant="outline" className="text-lg">
                      {userVote.voteChoice.toUpperCase()}
                    </Badge>
                  </div>
                ) : !isActive ? (
                  <div className="text-center py-4 text-muted-foreground">
                    Voting is not active for this proposal
                  </div>
                ) : (
                  <>
                    <Button
                      onClick={() => handleVote('for')}
                      disabled={voteMutation.isPending}
                      className="w-full bg-green-500 hover:bg-green-600"
                    >
                      Vote For
                    </Button>
                    <Button
                      onClick={() => handleVote('against')}
                      disabled={voteMutation.isPending}
                      className="w-full bg-red-500 hover:bg-red-600"
                    >
                      Vote Against
                    </Button>
                    <Button
                      onClick={() => handleVote('abstain')}
                      disabled={voteMutation.isPending}
                      variant="outline"
                      className="w-full"
                    >
                      Abstain
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
