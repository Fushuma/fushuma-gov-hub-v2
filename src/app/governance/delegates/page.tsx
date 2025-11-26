'use client';

import { useState } from 'react';
import { Navigation } from '@/components/layout/Navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  Users,
  Search,
  ExternalLink,
  CheckCircle,
  TrendingUp,
  UserPlus,
  Loader2,
} from 'lucide-react';
import { useAccount } from 'wagmi';
import { trpc } from '@/lib/trpc';
import Link from 'next/link';

// Format address for display
function formatAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// Format voting power
function formatVotingPower(power: number): string {
  if (power >= 1e18) {
    return `${(power / 1e18).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  }
  return power.toLocaleString();
}

export default function DelegatesPage() {
  const { address, isConnected } = useAccount();
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch delegates
  const {
    data: delegatesData,
    isLoading,
    refetch,
  } = trpc.delegates.list.useQuery({
    limit: 20,
    offset: 0,
    orderBy: 'votingPower',
  });

  // Search delegates
  const { data: searchResults, isLoading: isSearching } = trpc.delegates.search.useQuery(
    { query: searchQuery, limit: 10 },
    { enabled: searchQuery.length > 2 }
  );

  // Get user's current delegation
  const { data: userDelegation } = trpc.delegates.getUserDelegation.useQuery(
    { userAddress: address || '' },
    { enabled: !!address }
  );

  const displayDelegates = searchQuery.length > 2 ? searchResults : delegatesData?.delegates;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 py-16 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Delegates</h1>
          <p className="text-muted-foreground">
            Discover and delegate your voting power to trusted community members
          </p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Delegates</p>
                  <p className="text-2xl font-bold">{delegatesData?.total || 0}</p>
                </div>
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Your Delegation</p>
                  <p className="text-2xl font-bold">
                    {userDelegation ? formatAddress(userDelegation.delegate) : 'None'}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <Link href="/governance/delegates/register">
                <Button className="w-full" size="lg">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Become a Delegate
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search delegates by name or address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Delegates List */}
        <Card>
          <CardHeader>
            <CardTitle>Active Delegates</CardTitle>
            <CardDescription>
              Community members who accept voting power delegation
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading || isSearching ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">Loading delegates...</span>
              </div>
            ) : !displayDelegates || displayDelegates.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No Delegates Found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery
                    ? 'No delegates match your search.'
                    : 'Be the first to register as a delegate!'}
                </p>
                <Link href="/governance/delegates/register">
                  <Button>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Register as Delegate
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {displayDelegates.map((delegate) => (
                  <div
                    key={delegate.address}
                    className="flex items-start gap-4 p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={delegate.avatarUrl || undefined} />
                      <AvatarFallback>
                        {delegate.name?.slice(0, 2).toUpperCase() || '??'}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold truncate">
                          {delegate.name || formatAddress(delegate.address)}
                        </h3>
                        {delegate.verified && (
                          <CheckCircle className="h-4 w-4 text-blue-500 flex-shrink-0" />
                        )}
                      </div>

                      <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                        {delegate.bio || 'No bio provided'}
                      </p>

                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <span className="font-mono">{formatAddress(delegate.address)}</span>
                        <Separator orientation="vertical" className="h-4" />
                        <span>{delegate.delegatorCount || 0} delegators</span>
                        <Separator orientation="vertical" className="h-4" />
                        <span>{formatVotingPower(delegate.votingPower || 0)} voting power</span>
                      </div>

                      {delegate.twitterHandle && (
                        <a
                          href={`https://twitter.com/${delegate.twitterHandle}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-500 hover:underline mt-1 inline-flex items-center gap-1"
                        >
                          @{delegate.twitterHandle}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>

                    <div className="flex flex-col gap-2">
                      <Link href={`/governance/delegates/${delegate.address}`}>
                        <Button variant="outline" size="sm">
                          View Profile
                        </Button>
                      </Link>
                      {isConnected && address?.toLowerCase() !== delegate.address.toLowerCase() && (
                        <Button size="sm" disabled>
                          Delegate
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info Box */}
        <Card className="mt-8">
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <Users className="h-8 w-8 text-muted-foreground flex-shrink-0" />
              <div>
                <h3 className="font-semibold mb-2">About Delegation</h3>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Delegation allows you to give your voting power to a trusted delegate</li>
                  <li>Your tokens remain in your wallet - only voting power is delegated</li>
                  <li>You can change or revoke your delegation at any time</li>
                  <li>Delegates vote on your behalf in governance proposals</li>
                  <li>Anyone can register as a delegate to receive delegations</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
