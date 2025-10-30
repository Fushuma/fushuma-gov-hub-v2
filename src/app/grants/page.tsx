import { Navigation } from '@/components/layout/Navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

const mockGrants = [
  {
    id: 1,
    title: 'Fushuma DEX Aggregator',
    status: 'Approved',
    summary: 'A grant application for the development of a DEX aggregator that will provide users with the best rates across all Fushuma DEXs.',
    amount: 50000,
    date: '2025-10-15',
  },
  {
    id: 2,
    title: 'Fushuma NFT Marketplace',
    status: 'Pending',
    summary: 'A grant to build a feature-rich NFT marketplace on Fushuma, supporting multiple collections and a seamless user experience.',
    amount: 75000,
    date: '2025-09-28',
  },
  {
    id: 3,
    title: 'Fushuma Mobile Wallet',
    status: 'Rejected',
    summary: 'A proposal to create a native mobile wallet for Fushuma, with a focus on security and ease of use.',
    amount: 100000,
    date: '2025-08-12',
  },
];

export default function GrantsPage() {
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
        <div className="space-y-6">
          {[...mockGrants].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((grant) => (
            <GrantCard key={grant.id} grant={grant} />
          ))}
        </div>
      </main>
    </div>
  );
}

function GrantCard({ grant }: { grant: any }) {
  const getStatusClass = (status: string) => {
    switch (status) {
      case 'Approved':
        return 'bg-green-500';
      case 'Pending':
        return 'bg-yellow-500';
      case 'Rejected':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="text-2xl font-bold">{grant.title}</CardTitle>
          <Badge className={getStatusClass(grant.status)}>{grant.status}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground mb-4">{grant.summary}</p>
        <div className="flex justify-between items-center">
          <div>
            <div className="text-sm text-muted-foreground">Amount</div>
            <div className="text-lg font-bold">{grant.amount.toLocaleString()} FUMA</div>
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
