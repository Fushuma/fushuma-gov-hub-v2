// ICO Statistics Component

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import type { IIcoInfo } from '@/lib/launchpad/types';
import { TrendingUp, Target, Clock, Gift } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ICOStatsProps {
  ico: IIcoInfo;
  currentPrice: number;
}

export function ICOStats({ ico, currentPrice }: ICOStatsProps) {
  const soldPercentage = (ico.totalSold / ico.amount) * 100;
  const remainingTokens = (ico.amount - ico.totalSold) / ico.icoDecimals;
  const totalTokens = ico.amount / ico.icoDecimals;
  const soldTokens = ico.totalSold / ico.icoDecimals;

  const formatDate = (timestamp: number) => {
    if (!timestamp || timestamp === 0) return 'No end date';
    const date = new Date(timestamp);
    return formatDistanceToNow(date, { addSuffix: true });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Token Sale Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-4 w-4" />
            Token Sale Progress
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">Sold</span>
              <span className="font-semibold">{soldPercentage.toFixed(1)}%</span>
            </div>
            <Progress value={soldPercentage} className="h-2" />
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <p className="text-muted-foreground">Sold</p>
              <p className="font-semibold">{soldTokens.toLocaleString()}</p>
            </div>
            <div className="text-right">
              <p className="text-muted-foreground">Remaining</p>
              <p className="font-semibold">{remainingTokens.toLocaleString()}</p>
            </div>
          </div>
          <div className="text-xs text-muted-foreground pt-2 border-t">
            Total: {totalTokens.toLocaleString()} tokens
          </div>
        </CardContent>
      </Card>

      {/* Pricing Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Pricing
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-sm text-muted-foreground">Current Price</p>
            <p className="text-2xl font-bold">{currentPrice.toFixed(6)}</p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <p className="text-muted-foreground">Start</p>
              <p className="font-semibold">
                {(Number(ico.startPrice) / ico.costDecimals).toFixed(6)}
              </p>
            </div>
            {Number(ico.endPrice) > 0 && (
              <div className="text-right">
                <p className="text-muted-foreground">End</p>
                <p className="font-semibold">
                  {(Number(ico.endPrice) / ico.costDecimals).toFixed(6)}
                </p>
              </div>
            )}
          </div>
          {Number(ico.endPrice) === 0 && (
            <div className="text-xs text-muted-foreground pt-2 border-t">
              Fixed price ICO
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bonus & Timing */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Gift className="h-4 w-4" />
            Bonus & Timing
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {ico.bonusPercentage > 0 && (
            <div>
              <p className="text-sm text-muted-foreground">Bonus</p>
              <p className="text-xl font-bold text-green-600">
                {ico.bonusPercentage / 100}%
              </p>
              <p className="text-xs text-muted-foreground">
                Reserve: {(ico.bonusReserve / ico.icoDecimals).toLocaleString()}
              </p>
            </div>
          )}
          <div className="pt-2 border-t">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground">
                  {ico.endDate > 0 ? 'Ends' : 'Started'} {formatDate(ico.endDate || ico.startDate)}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
