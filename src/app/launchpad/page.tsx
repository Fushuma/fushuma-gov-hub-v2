'use client';

import { Navigation } from '@/components/layout/Navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Rocket, TrendingUp, Users, Clock } from 'lucide-react';
import { useAllICOs } from '@/hooks/launchpad';
import { ICOCard } from '@/components/launchpad/ICOCard';
import { getStatus } from '@/lib/launchpad/ico';
import { useMemo } from 'react';
import type { LaunchpadMetadata } from '@/lib/launchpad/types';

// Import launchpad metadata
import launchpadsConfig from '@/config/launchpads.json';

export default function LaunchpadPage() {
  const { data: icos, isLoading } = useAllICOs();

  // Create metadata lookup map
  const metadataMap = useMemo(() => {
    const map = new Map<string, LaunchpadMetadata>();
    (launchpadsConfig as LaunchpadMetadata[]).forEach((config) => {
      map.set(config.key.toLowerCase(), config);
    });
    return map;
  }, []);

  // Sort and categorize ICOs
  const categorizedICOs = useMemo(() => {
    if (!icos) return { live: [], upcoming: [], ended: [], soldOut: [], closed: [] };

    const now = Date.now().toString();
    const live: typeof icos = [];
    const upcoming: typeof icos = [];
    const ended: typeof icos = [];
    const soldOut: typeof icos = [];
    const closed: typeof icos = [];

    icos.forEach((ico) => {
      const status = getStatus(
        ico.data.isClosed,
        ico.data.amount,
        ico.data.totalSold,
        ico.data.startDate.toString(),
        now,
        ico.data.endDate.toString()
      );

      switch (status.status) {
        case 'Live':
          live.push(ico);
          break;
        case 'Upcoming':
          upcoming.push(ico);
          break;
        case 'Ended':
          ended.push(ico);
          break;
        case 'Sold Out':
          soldOut.push(ico);
          break;
        case 'Closed':
          closed.push(ico);
          break;
      }
    });

    // Sort by start date (newest first)
    const sortByDate = (a: typeof icos[0], b: typeof icos[0]) =>
      b.data.startDate - a.data.startDate;

    live.sort(sortByDate);
    upcoming.sort(sortByDate);
    ended.sort(sortByDate);
    soldOut.sort(sortByDate);
    closed.sort(sortByDate);

    return { live, upcoming, ended, soldOut, closed };
  }, [icos]);

  // Combine in display order: Live → Upcoming → Sold Out → Ended → Closed
  const sortedICOs = useMemo(() => {
    return [
      ...categorizedICOs.live,
      ...categorizedICOs.upcoming,
      ...categorizedICOs.soldOut,
      ...categorizedICOs.ended,
      ...categorizedICOs.closed,
    ];
  }, [categorizedICOs]);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2 flex items-center gap-2">
              <Rocket className="h-8 w-8 text-primary" />
              ICO Launchpad
            </h1>
            <p className="text-muted-foreground text-lg">
              Participate in token sales and discover new projects on Fushuma
            </p>
          </div>
          <Link href="/launchpad/create">
            <Button size="lg" className="gap-2">
              <TrendingUp className="h-5 w-5" />
              Create ICO
            </Button>
          </Link>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Rocket className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{icos?.length || 0}</p>
                  <p className="text-sm text-muted-foreground">Total ICOs</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-500/10 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{categorizedICOs.live.length}</p>
                  <p className="text-sm text-muted-foreground">Live</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-500/10 rounded-lg">
                  <Clock className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{categorizedICOs.upcoming.length}</p>
                  <p className="text-sm text-muted-foreground">Upcoming</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-500/10 rounded-lg">
                  <Users className="h-6 w-6 text-purple-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {categorizedICOs.ended.length + categorizedICOs.soldOut.length + categorizedICOs.closed.length}
                  </p>
                  <p className="text-sm text-muted-foreground">Completed</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ICOs Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="animate-pulse">
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-muted rounded-full" />
                    <div className="flex-1">
                      <div className="h-6 bg-muted rounded w-3/4 mb-2" />
                      <div className="h-4 bg-muted rounded w-1/2" />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="h-2 bg-muted rounded" />
                    <div className="h-4 bg-muted rounded w-2/3" />
                    <div className="h-4 bg-muted rounded w-1/2" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : sortedICOs && sortedICOs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedICOs.map((ico) => (
              <ICOCard
                key={ico.data.seed}
                ico={ico}
                metadata={metadataMap.get(ico.key.toLowerCase())}
              />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <Rocket className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg text-muted-foreground mb-4">No ICOs available yet</p>
              <Link href="/launchpad/create">
                <Button>Create the First ICO</Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
