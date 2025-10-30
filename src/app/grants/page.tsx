'use client';

import { useState } from 'react';
import { Navigation } from '@/components/layout/Navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { trpc } from '@/lib/trpc/client';
import { format } from 'date-fns';

type GrantStatus = 'submitted' | 'review' | 'approved' | 'in_progress' | 'completed' | 'rejected';

export default function GrantsPage() {
  const [statusFilter, setStatusFilter] = useState<GrantStatus | undefined>(undefined);
  
  const { data: grants, isLoading, error } = trpc.grants.list.useQuery({
    limit: 20,
    offset: 0,
    status: statusFilter,
  });

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 py-16">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">Grant Applications</h1>
          <Link href="/grants/apply">
            <Button>Apply for Grant</Button>
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
            variant={statusFilter === 'submitted' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('submitted')}
            size="sm"
          >
            Submitted
          </Button>
          <Button
            variant={statusFilter === 'review' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('review')}
            size="sm"
          >
            In Review
          </Button>
          <Button
            variant={statusFilter === 'approved' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('approved')}
            size="sm"
          >
            Approved
          </Button>
          <Button
            variant={statusFilter === 'in_progress' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('in_progress')}
            size="sm"
          >
            In Progress
          </Button>
          <Button
            variant={statusFilter === 'completed' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('completed')}
            size="sm"
          >
            Completed
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
              <p className="text-red-500">Failed to load grants: {error.message}</p>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {!isLoading && !error && grants && grants.length === 0 && (
          <Card>
            <CardContent className="py-16 text-center">
              <h3 className="text-xl font-semibold mb-2">No Grant Applications Found</h3>
              <p className="text-muted-foreground mb-4">
                {statusFilter 
                  ? `There are no ${statusFilter.replace('_', ' ')} grant applications at the moment.`
                  : 'Be the first to apply for a development grant!'}
              </p>
              <Link href="/grants/apply">
                <Button>Apply for Grant</Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Grants List */}
        {!isLoading && !error && grants && grants.length > 0 && (
          <div className="space-y-6">
            {grants.map((grant) => (
              <GrantCard key={grant.id} grant={grant} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function GrantCard({ grant }: { grant: any }) {
  const getStatusClass = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-500';
      case 'in_progress':
        return 'bg-blue-500';
      case 'completed':
        return 'bg-purple-500';
      case 'rejected':
        return 'bg-red-500';
      case 'review':
        return 'bg-yellow-500';
      case 'submitted':
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusLabel = (status: string) => {
    return status.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-2xl font-bold mb-2">{grant.title}</CardTitle>
            <p className="text-sm text-muted-foreground">
              by {grant.applicantName} • {format(new Date(grant.createdAt), 'MMM dd, yyyy')}
            </p>
          </div>
          <Badge className={getStatusClass(grant.status)}>
            {getStatusLabel(grant.status)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground mb-4 line-clamp-2">{grant.description}</p>
        <div className="flex justify-between items-center">
          <div>
            <div className="text-sm text-muted-foreground">Funding Request</div>
            <div className="text-lg font-bold">{grant.fundingRequest.toLocaleString()} FUMA</div>
          </div>
          <Link href={`/grants/${grant.id}`}>
            <Button variant="outline" className="gap-2">
              View Application <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
