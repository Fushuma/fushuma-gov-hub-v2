'use client';

import { useParams, useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, TrendingUp, Droplets, Plus, Minus, DollarSign } from 'lucide-react';
import Link from 'next/link';
import { usePosition } from '@/lib/pancakeswap/hooks/usePositions';
import { formatTokenAmount } from '@/lib/pancakeswap/utils/tokens';
import { formatFee } from '@/lib/pancakeswap/pools';
import { toast } from 'sonner';

export default function PositionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { isConnected } = useAccount();
  const tokenId = params.id as string;
  
  const { position, isLoading } = usePosition(tokenId);

  const handleCollectFees = () => {
    toast.info('Fee collection will be available after contract deployment');
  };

  const handleIncreaseLiquidity = () => {
    toast.info('Increase liquidity will be available after contract deployment');
  };

  const handleRemoveLiquidity = () => {
    toast.info('Remove liquidity will be available after contract deployment');
  };

  if (!isConnected) {
    router.push('/defi/pancakeswap/positions');
    return null;
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card className="animate-pulse">
          <CardContent className="h-96" />
        </Card>
      </div>
    );
  }

  if (!position) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Droplets className="h-16 w-16 text-muted-foreground mb-4" />
            <h2 className="text-2xl font-bold mb-2">Position Not Found</h2>
            <p className="text-muted-foreground text-center mb-6">
              The position you're looking for doesn't exist or you don't own it.
            </p>
            <Link href="/defi/pancakeswap/positions">
              <Button>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Positions
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <Link href="/defi/pancakeswap/positions">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Positions
          </Button>
        </Link>
        
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-4xl font-bold">
                {position.token0Symbol}/{position.token1Symbol}
              </h1>
              <Badge variant="secondary">{formatFee(position.fee)}</Badge>
            </div>
            <p className="text-muted-foreground">
              Position #{position.tokenId}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Liquidity Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Liquidity Overview</CardTitle>
            <CardDescription>Current value and composition of your position</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Value</p>
                <p className="text-2xl font-bold">$0.00</p>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground mb-1">Liquidity</p>
                <p className="text-2xl font-bold">
                  {formatTokenAmount(BigInt(position.liquidity || '0'), 18, 2)}
                </p>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground mb-1">{position.token0Symbol}</p>
                <p className="text-2xl font-bold">
                  {formatTokenAmount(BigInt('0'), 18, 4)}
                </p>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground mb-1">{position.token1Symbol}</p>
                <p className="text-2xl font-bold">
                  {formatTokenAmount(BigInt('0'), 18, 4)}
                </p>
              </div>
            </div>

            <Separator />

            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="font-medium">Uncollected Fees</p>
                <Button onClick={handleCollectFees} disabled>
                  <DollarSign className="h-4 w-4 mr-2" />
                  Collect Fees
                </Button>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground mb-1">{position.token0Symbol} Fees</p>
                  <p className="text-xl font-semibold text-green-500">
                    {formatTokenAmount(BigInt(position.tokensOwed0 || '0'), 18, 6)}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">≈ $0.00</p>
                </div>
                
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground mb-1">{position.token1Symbol} Fees</p>
                  <p className="text-xl font-semibold text-green-500">
                    {formatTokenAmount(BigInt(position.tokensOwed1 || '0'), 18, 6)}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">≈ $0.00</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Price Range */}
        <Card>
          <CardHeader>
            <CardTitle>Price Range</CardTitle>
            <CardDescription>Your position earns fees when the price is within this range</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground mb-2">Min Price</p>
                <p className="text-xl font-mono font-semibold">
                  {(1.0001 ** position.tickLower).toFixed(6)}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  {position.token1Symbol} per {position.token0Symbol}
                </p>
              </div>

              <div className="rounded-lg border p-4 bg-primary/5 border-primary/20">
                <p className="text-sm text-muted-foreground mb-2">Current Price</p>
                <p className="text-xl font-mono font-semibold text-primary">
                  1.000000
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  {position.token1Symbol} per {position.token0Symbol}
                </p>
              </div>

              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground mb-2">Max Price</p>
                <p className="text-xl font-mono font-semibold">
                  {(1.0001 ** position.tickUpper).toFixed(6)}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  {position.token1Symbol} per {position.token0Symbol}
                </p>
              </div>
            </div>

            <div className="rounded-lg bg-muted p-4">
              <div className="flex items-start gap-2">
                <TrendingUp className="h-4 w-4 text-primary mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium mb-1">Position Status: In Range</p>
                  <p className="text-muted-foreground">
                    Your position is currently earning fees. If the price moves outside your range, 
                    your position will stop earning fees until the price returns to your range.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Manage Position</CardTitle>
            <CardDescription>Increase or decrease your liquidity</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button onClick={handleIncreaseLiquidity} className="w-full" size="lg" disabled>
              <Plus className="h-4 w-4 mr-2" />
              Increase Liquidity
            </Button>
            
            <Button onClick={handleRemoveLiquidity} variant="outline" className="w-full" size="lg" disabled>
              <Minus className="h-4 w-4 mr-2" />
              Remove Liquidity
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
