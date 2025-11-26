'use client';

import { useParams, useRouter } from 'next/navigation';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, TrendingUp, Droplets, Plus, Minus, DollarSign, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { usePosition } from '@/lib/fumaswap/hooks/usePositions';
import { formatFee } from '@/lib/fumaswap/pools';
import { toast } from 'sonner';
import { useMemo, useState } from 'react';
import { calculatePositionAmounts, tickToReadablePrice } from '@/lib/fumaswap/utils/positionUtils';
import { collectFees, removeLiquidity } from '@/lib/fumaswap/liquidity';
import { CL_POSITION_MANAGER_ADDRESS } from '@/lib/fumaswap/contracts';

// Format token amount for display
function formatTokenAmount(amount: string, decimals: number, displayDecimals: number = 4): string {
  try {
    const value = BigInt(amount);
    const divisor = BigInt(10 ** decimals);
    const integerPart = value / divisor;
    const fractionalPart = value % divisor;

    const fractionalStr = fractionalPart.toString().padStart(decimals, '0').slice(0, displayDecimals);

    if (integerPart === 0n && fractionalPart === 0n) {
      return '0';
    }

    return `${integerPart}.${fractionalStr}`.replace(/\.?0+$/, '') || '0';
  } catch {
    return '0';
  }
}

export default function PositionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const tokenId = params.id as string;
  const { writeContractAsync } = useWriteContract();

  const { position, isLoading, refetch } = usePosition(tokenId);

  // Transaction state
  const [isCollecting, setIsCollecting] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();

  // Wait for transaction confirmation
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  // Calculate position amounts and prices using SDK
  const positionData = useMemo(() => {
    if (!position) return null;

    const currentTick = position.poolCurrentTick ?? 0;
    const sqrtPriceX96 = position.poolSqrtPriceX96 ?? '79228162514264337593543950336'; // 1:1 price default

    // Calculate token amounts using SDK
    const { amount0, amount1 } = calculatePositionAmounts(position, currentTick, sqrtPriceX96);

    // Calculate prices using SDK (handles overflow properly)
    const minPrice = tickToReadablePrice(position.tickLower, position.token0, position.token1);
    const maxPrice = tickToReadablePrice(position.tickUpper, position.token0, position.token1);
    const currentPrice = tickToReadablePrice(currentTick, position.token0, position.token1);

    // Check if position is in range
    const inRange = currentTick >= position.tickLower && currentTick < position.tickUpper;

    return {
      amount0,
      amount1,
      minPrice,
      maxPrice,
      currentPrice,
      inRange,
      currentTick,
    };
  }, [position]);

  const handleCollectFees = async () => {
    if (!position || !address) return;

    try {
      setIsCollecting(true);
      toast.info('Collecting fees...');

      const result = await collectFees(
        {
          tokenId: position.tokenId,
          recipient: address,
          amount0Max: BigInt('340282366920938463463374607431768211455'), // uint128 max
          amount1Max: BigInt('340282366920938463463374607431768211455'),
        },
        writeContractAsync
      );

      if (result?.hash) {
        setTxHash(result.hash);
        toast.success('Fee collection submitted! Waiting for confirmation...');
      }
    } catch (error: any) {
      console.error('Error collecting fees:', error);
      toast.error(error.message || 'Failed to collect fees');
    } finally {
      setIsCollecting(false);
    }
  };

  const handleIncreaseLiquidity = () => {
    // Navigate to add liquidity page with pre-filled data
    router.push(`/defi/fumaswap/liquidity?tokenId=${tokenId}`);
  };

  const handleRemoveLiquidity = async () => {
    if (!position || !address) return;

    try {
      setIsRemoving(true);

      // Remove 100% of liquidity
      const liquidity = BigInt(position.liquidity);
      if (liquidity === 0n) {
        toast.error('No liquidity to remove');
        return;
      }

      toast.info('Removing liquidity...');

      const result = await removeLiquidity(
        {
          tokenId: position.tokenId,
          liquidity,
          amount0Min: 0n, // Accept any amount (consider adding slippage protection)
          amount1Min: 0n,
          deadline: 20, // 20 minutes
        },
        writeContractAsync
      );

      if (result?.hash) {
        setTxHash(result.hash);
        toast.success('Liquidity removal submitted! Waiting for confirmation...');
      }
    } catch (error: any) {
      console.error('Error removing liquidity:', error);
      toast.error(error.message || 'Failed to remove liquidity');
    } finally {
      setIsRemoving(false);
    }
  };

  // Refetch position data after successful transaction
  useMemo(() => {
    if (isSuccess && txHash) {
      toast.success('Transaction confirmed!');
      refetch();
      setTxHash(undefined);
    }
  }, [isSuccess, txHash, refetch]);

  const hasLiquidity = position && BigInt(position.liquidity) > 0n;
  const isProcessing = isCollecting || isRemoving || isConfirming;

  if (!isConnected) {
    router.push('/defi/fumaswap/positions');
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
            <Link href="/defi/fumaswap/positions">
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
        <Link href="/defi/fumaswap/positions">
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
                  {formatTokenAmount(position.liquidity || '0', 18, 2)}
                </p>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground mb-1">{position.token0Symbol}</p>
                <p className="text-2xl font-bold">
                  {formatTokenAmount(positionData?.amount0 || '0', 18, 4)}
                </p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-1">{position.token1Symbol}</p>
                <p className="text-2xl font-bold">
                  {formatTokenAmount(positionData?.amount1 || '0', 6, 4)}
                </p>
              </div>
            </div>

            <Separator />

            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="font-medium">Uncollected Fees</p>
                <Button onClick={handleCollectFees} disabled={isProcessing}>
                  {isCollecting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <DollarSign className="h-4 w-4 mr-2" />
                  )}
                  {isCollecting ? 'Collecting...' : 'Collect Fees'}
                </Button>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground mb-1">{position.token0Symbol} Fees</p>
                  <p className="text-xl font-semibold text-green-500">
                    {formatTokenAmount(position.tokensOwed0 || '0', 18, 6)}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">≈ $0.00</p>
                </div>

                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground mb-1">{position.token1Symbol} Fees</p>
                  <p className="text-xl font-semibold text-green-500">
                    {formatTokenAmount(position.tokensOwed1 || '0', 6, 6)}
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
                  {positionData?.minPrice || '0'}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  {position.token1Symbol} per {position.token0Symbol}
                </p>
              </div>

              <div className="rounded-lg border p-4 bg-primary/5 border-primary/20">
                <p className="text-sm text-muted-foreground mb-2">Current Price</p>
                <p className="text-xl font-mono font-semibold text-primary">
                  {positionData?.currentPrice || '0'}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  {position.token1Symbol} per {position.token0Symbol}
                </p>
              </div>

              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground mb-2">Max Price</p>
                <p className="text-xl font-mono font-semibold">
                  {positionData?.maxPrice || '0'}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  {position.token1Symbol} per {position.token0Symbol}
                </p>
              </div>
            </div>

            <div className={`rounded-lg p-4 ${positionData?.inRange ? 'bg-green-500/10' : 'bg-orange-500/10'}`}>
              <div className="flex items-start gap-2">
                <TrendingUp className={`h-4 w-4 mt-0.5 ${positionData?.inRange ? 'text-green-500' : 'text-orange-500'}`} />
                <div className="text-sm">
                  <p className="font-medium mb-1">
                    Position Status: {positionData?.inRange ? 'In Range' : 'Out of Range'}
                  </p>
                  <p className="text-muted-foreground">
                    {positionData?.inRange
                      ? 'Your position is currently earning fees. If the price moves outside your range, your position will stop earning fees until the price returns to your range.'
                      : 'Your position is currently NOT earning fees. The price must return to your range for your position to start earning fees again.'}
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
            <Button onClick={handleIncreaseLiquidity} className="w-full" size="lg" disabled={isProcessing}>
              <Plus className="h-4 w-4 mr-2" />
              Increase Liquidity
            </Button>

            <Button
              onClick={handleRemoveLiquidity}
              variant="outline"
              className="w-full"
              size="lg"
              disabled={isProcessing || !hasLiquidity}
            >
              {isRemoving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Minus className="h-4 w-4 mr-2" />
              )}
              {isRemoving ? 'Removing...' : 'Remove Liquidity'}
            </Button>

            {isConfirming && (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Waiting for confirmation...
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
