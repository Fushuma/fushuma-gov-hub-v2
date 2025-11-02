'use client';

import { useAccount } from 'wagmi';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Wallet, Plus, TrendingUp, Droplets, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { usePositions } from '@/lib/pancakeswap/hooks/usePositions';
import { formatTokenAmount } from '@/lib/pancakeswap/utils/tokens';
import { formatFee } from '@/lib/pancakeswap/pools';

export default function PositionsPage() {
  const { address, isConnected } = useAccount();
  const { positions, isLoading } = usePositions();

  if (!isConnected) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card className="max-w-2xl mx-auto">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Wallet className="h-16 w-16 text-muted-foreground mb-4" />
            <h2 className="text-2xl font-bold mb-2">Connect Your Wallet</h2>
            <p className="text-muted-foreground text-center mb-6">
              Connect your wallet to view and manage your liquidity positions
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">Your Positions</h1>
          <p className="text-muted-foreground">
            Manage your liquidity positions and collect earned fees
          </p>
        </div>
        <Link href="/defi/pancakeswap/liquidity">
          <Button size="lg">
            <Plus className="h-4 w-4 mr-2" />
            New Position
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="h-32" />
            </Card>
          ))}
        </div>
      ) : positions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Droplets className="h-16 w-16 text-muted-foreground mb-4" />
            <h2 className="text-2xl font-bold mb-2">No Positions Yet</h2>
            <p className="text-muted-foreground text-center mb-6 max-w-md">
              You don't have any liquidity positions. Add liquidity to a pool to start earning trading fees.
            </p>
            <Link href="/defi/pancakeswap/liquidity">
              <Button size="lg">
                <Plus className="h-4 w-4 mr-2" />
                Add Liquidity
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {positions.map((position) => (
            <Card key={position.tokenId} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-2xl">
                      {position.token0Symbol}/{position.token1Symbol}
                    </CardTitle>
                    <Badge variant="secondary">{formatFee(position.fee)}</Badge>
                  </div>
                  <Badge variant="outline">
                    #{position.tokenId}
                  </Badge>
                </div>
                <CardDescription>
                  Concentrated Liquidity Position
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Liquidity Info */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Liquidity</p>
                    <p className="text-lg font-semibold">
                      {formatTokenAmount(BigInt(position.liquidity || '0'), 18, 2)}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">{position.token0Symbol}</p>
                    <p className="text-lg font-semibold">
                      {formatTokenAmount(BigInt('0'), 18, 4)}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">{position.token1Symbol}</p>
                    <p className="text-lg font-semibold">
                      {formatTokenAmount(BigInt('0'), 18, 4)}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Uncollected Fees</p>
                    <div className="flex items-center gap-1">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      <p className="text-lg font-semibold text-green-500">
                        $0.00
                      </p>
                    </div>
                  </div>
                </div>

                {/* Price Range */}
                <div className="rounded-lg border p-4 bg-muted/50">
                  <p className="text-sm font-medium mb-2">Price Range</p>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Min Price</p>
                      <p className="font-mono">
                        {(1.0001 ** position.tickLower).toFixed(6)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {position.token1Symbol} per {position.token0Symbol}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Max Price</p>
                      <p className="font-mono">
                        {(1.0001 ** position.tickUpper).toFixed(6)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {position.token1Symbol} per {position.token0Symbol}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Link href={`/defi/pancakeswap/positions/${position.tokenId}`} className="flex-1">
                    <Button variant="outline" className="w-full">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                  </Link>
                  <Button variant="outline" disabled>
                    Collect Fees
                  </Button>
                  <Button variant="outline" disabled>
                    Remove Liquidity
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Info Card */}
      <Card className="mt-8 border-primary/20 bg-primary/5">
        <CardContent className="py-6">
          <div className="flex items-start gap-3">
            <TrendingUp className="h-5 w-5 text-primary mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-primary mb-1">Earn Trading Fees</p>
              <p className="text-muted-foreground">
                Your liquidity positions earn a portion of all trading fees from swaps that occur within your price range. 
                The tighter your price range, the more fees you earn when the price is within that range.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
