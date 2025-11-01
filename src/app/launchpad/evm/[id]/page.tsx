'use client';

import { useParams, useRouter } from 'next/navigation';
import { Navigation } from '@/components/layout/Navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useICOData, usePurchaseHistory } from '@/hooks/launchpad';
import { BuyTokensCard } from '@/components/launchpad/BuyTokensCard';
import { ICOStats } from '@/components/launchpad/ICOStats';
import { VestingInfo } from '@/components/launchpad/VestingInfo';
import { PurchaseHistoryTable } from '@/components/launchpad/PurchaseHistoryTable';
import { OwnerControls } from '@/components/launchpad/OwnerControls';
import { getStatus, calculateCurrentPrice } from '@/lib/launchpad/ico';
import { ChevronLeft, ExternalLink, Globe, Twitter, Send } from 'lucide-react';
import { useMemo } from 'react';
import { useAccount } from 'wagmi';
import type { LaunchpadMetadata } from '@/lib/launchpad/types';
import launchpadsConfig from '@/config/launchpads.json';

export default function ICODetailPage() {
  const params = useParams();
  const router = useRouter();
  const { address } = useAccount();
  const icoId = params.id ? parseInt(params.id as string) : null;

  const { data: ico, isLoading, refetch: refetchICO } = useICOData(icoId);
  
  // Check if current user is the ICO owner
  const isOwner = useMemo(() => {
    if (!address || !ico) return false;
    return address.toLowerCase() === ico.data.owner.toLowerCase();
  }, [address, ico]);
  const { data: purchases, refetch: refetchPurchases } = usePurchaseHistory(
    icoId?.toString() || null,
    ico?.data.vestingContracts || null,
    ico?.data.unlockPercentage || 0
  );

  // Get metadata
  const metadata = useMemo(() => {
    if (!ico) return null;
    const configs = launchpadsConfig as LaunchpadMetadata[];
    return configs.find((config) => config.key.toLowerCase() === ico.key.toLowerCase());
  }, [ico]);

  // Calculate status and price
  const status = useMemo(() => {
    if (!ico) return null;
    return getStatus(
      ico.data.isClosed,
      ico.data.amount,
      ico.data.totalSold,
      ico.data.startDate.toString(),
      Date.now().toString(),
      ico.data.endDate.toString()
    );
  }, [ico]);

  const currentPrice = useMemo(() => {
    if (!ico || !status) return 0;
    if (status.status !== 'Live' && status.status !== 'Upcoming') return 0;
    return calculateCurrentPrice(
      ico.data.startPrice,
      ico.data.endPrice,
      ico.data.totalSold,
      ico.data.amount,
      ico.data.costDecimals
    );
  }, [ico, status]);

  const handlePurchaseSuccess = () => {
    refetchICO();
    refetchPurchases();
  };

  const getStatusBadgeClass = (color: string) => {
    const colorMap: Record<string, string> = {
      green: 'bg-green-500 hover:bg-green-600',
      blue: 'bg-blue-500 hover:bg-blue-600',
      yellow: 'bg-yellow-500 hover:bg-yellow-600',
      red: 'bg-red-500 hover:bg-red-600',
      gray: 'bg-gray-500 hover:bg-gray-600',
    };
    return colorMap[color] || 'bg-gray-500';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container mx-auto px-4 py-8">
          <div className="space-y-6">
            <div className="h-8 bg-muted rounded w-1/4 animate-pulse" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <Card className="h-64 animate-pulse" />
                <Card className="h-96 animate-pulse" />
              </div>
              <div className="space-y-6">
                <Card className="h-96 animate-pulse" />
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!ico || !status) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-lg text-muted-foreground mb-4">ICO not found</p>
              <Button onClick={() => router.push('/launchpad')}>
                Back to Launchpad
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.push('/launchpad')}
            className="mb-4"
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Launchpad
          </Button>

          <div className="flex items-start gap-4">
            {metadata?.projectLogo && (
              <img
                src={metadata.projectLogo}
                alt={metadata.name}
                className="w-20 h-20 rounded-full object-cover"
              />
            )}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-4xl font-bold">
                  {metadata?.name || `ICO #${ico.data.seed}`}
                </h1>
                <Badge className={getStatusBadgeClass(status.color)}>
                  {status.status}
                </Badge>
              </div>
              {metadata?.description && (
                <p className="text-lg text-muted-foreground mb-3">
                  {metadata.description}
                </p>
              )}
              {metadata?.links && (
                <div className="flex gap-3">
                  {metadata.links.web && (
                    <a
                      href={metadata.links.web.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline flex items-center gap-1"
                    >
                      <Globe className="h-4 w-4" />
                      Website
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  {metadata.links.x && (
                    <a
                      href={metadata.links.x.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline flex items-center gap-1"
                    >
                      <Twitter className="h-4 w-4" />
                      Twitter
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  {metadata.links.telegram && (
                    <a
                      href={metadata.links.telegram.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline flex items-center gap-1"
                    >
                      <Send className="h-4 w-4" />
                      Telegram
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Stats */}
            <ICOStats ico={ico.data} currentPrice={currentPrice} />

            {/* Vesting Info */}
            <VestingInfo ico={ico.data} />

            {/* Purchase History */}
            {address && purchases && (
              <PurchaseHistoryTable
                purchases={purchases}
                ico={ico.data}
                onClaimSuccess={handlePurchaseSuccess}
              />
            )}
          </div>

          {/* Right Column - Buy Card & Owner Controls */}
          <div className="space-y-6">
            <BuyTokensCard
              ico={ico.data}
              status={status.status}
              currentPrice={currentPrice}
              onPurchaseSuccess={handlePurchaseSuccess}
            />
            
            {isOwner && (
              <OwnerControls
                ico={ico.data}
                onActionSuccess={handlePurchaseSuccess}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
