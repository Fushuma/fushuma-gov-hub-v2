import { Navigation } from '@/components/layout/Navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

const mockProposals = [
  {
    id: 1,
    title: 'Protocol Upgrade: Fushuma V2',
    status: 'Active',
    summary: 'This proposal outlines the upgrade to Fushuma V2, which includes a new fee structure, improved governance module, and enhanced security features.',
    votesFor: 1234567,
    votesAgainst: 12345,
  },
  {
    id: 2,
    title: 'Grant Application: Fushuma DEX Aggregator',
    status: 'Passed',
    summary: 'A grant application for the development of a DEX aggregator that will provide users with the best rates across all Fushuma DEXs.',
    votesFor: 987654,
    votesAgainst: 54321,
  },
  {
    id: 3,
    title: 'Community Treasury Allocation: Q4 2025',
    status: 'Failed',
    summary: 'A proposal to allocate 1,000,000 FUMA from the community treasury to fund various community initiatives in Q4 2025.',
    votesFor: 123456,
    votesAgainst: 765432,
  },
];

export default function GovernancePage() {
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
        <div className="space-y-6">
          {mockProposals.map((proposal) => (
            <ProposalCard key={proposal.id} proposal={proposal} />
          ))}
        </div>
      </main>
    </div>
  );
}

function ProposalCard({ proposal }: { proposal: any }) {
  const getStatusClass = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-blue-500';
      case 'Passed':
        return 'bg-green-500';
      case 'Failed':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="text-2xl font-bold">{proposal.title}</CardTitle>
          <Badge className={getStatusClass(proposal.status)}>{proposal.status}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground mb-4">{proposal.summary}</p>
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
