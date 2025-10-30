'use client';

import { useState } from 'react';
import { Navigation } from '@/components/layout/Navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { trpc } from '@/lib/trpc/client';

type ProposalStatus = 'pending' | 'active' | 'passed' | 'rejected' | 'executed' | 'cancelled';

export default function GovernancePage() {
  const [statusFilter, setStatusFilter] = useState<ProposalStatus | undefined>(undefined);
  
  const { data: proposals, isLoading, error } = trpc.proposals.list.useQuery({
    limit: 20,
    offset: 0,
    status: statusFilter,
  });

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

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 py-16">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">Governance Proposals</h1>
          <Link href="/governance/create">
            <Button>Create Proposal</Button>
          </Link>
        </div>

        {/* Status Filters */}
        <div className="flex gap-2 mb-6 flex-wrap">
          <Button
            variant={statusFilter === undefined ? 'default' : 'outline'}
            onClick={() => setStatusFilter(undefined)}
            size="sm"
          >
            All
          </Button>
          <Button
            variant={statusFilter === 'active' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('active')}
            size="sm"
          >
            Active
          </Button>
          <Button
            variant={statusFilter === 'passed' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('passed')}
            size="sm"
          >
            Passed
          </Button>
          <Button
            variant={statusFilter === 'rejected' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('rejected')}
            size="sm"
          >
            Rejected
          </Button>
          <Button
            variant={statusFilter === 'pending' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('pending')}
            size="sm"
          >
            Pending
          </Button>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-48 bg-gray-300 rounded-lg"></div>
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {error && (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-red-500">Failed to load proposals: {error.message}</p>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {!isLoading && !error && proposals && proposals.length === 0 && (
          <Card>
            <CardContent className="py-16 text-center">
              <h3 className="text-xl font-semibold mb-2">No Proposals Found</h3>
              <p className="text-muted-foreground mb-4">
                {statusFilter 
                  ? `There are no ${statusFilter} proposals at the moment.`
                  : 'Be the first to create a governance proposal!'}
              </p>
              <Link href="/governance/create">
                <Button>Create First Proposal</Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Proposals List */}
        {!isLoading && !error && proposals && proposals.length > 0 && (
          <div className="space-y-6">
            {proposals.map((proposal) => (
              <ProposalCard key={proposal.id} proposal={proposal} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function ProposalCard({ proposal }: { proposal: any }) {
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

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="text-2xl font-bold">{proposal.title}</CardTitle>
          <Badge className={getStatusClass(proposal.status)}>
            {getStatusLabel(proposal.status)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground mb-4 line-clamp-2">{proposal.description}</p>
        <div className="flex justify-between items-center">
          <div className="flex gap-4">
            <div>
              <div className="text-sm text-muted-foreground">For</div>
              <div className="text-lg font-bold">{proposal.votesFor.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Against</div>
              <div className="text-lg font-bold">{proposal.votesAgainst.toLocaleString()}</div>
            </div>
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
