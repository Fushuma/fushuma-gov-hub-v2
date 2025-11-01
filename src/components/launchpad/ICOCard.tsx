// ICO Card Component for displaying ICO information

'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import Link from 'next/link';
import type { IIcoInfoWithKey, IcoStatusInfo, LaunchpadMetadata } from '@/lib/launchpad/types';
import { getStatus, calculateCurrentPrice } from '@/lib/launchpad/ico';
import { formatDistanceToNow } from 'date-fns';

interface ICOCardProps {
  ico: IIcoInfoWithKey;
  metadata?: LaunchpadMetadata;
}

export function ICOCard({ ico, metadata }: ICOCardProps) {
  const status = getStatus(
    ico.data.isClosed,
    ico.data.amount,
    ico.data.totalSold,
    ico.data.startDate.toString(),
    Date.now().toString(),
    ico.data.endDate.toString()
  );

  const currentPrice = calculateCurrentPrice(
    ico.data.startPrice,
    ico.data.endPrice,
    ico.data.totalSold,
    ico.data.amount,
    ico.data.costDecimals
  );

  const soldPercentage = (ico.data.totalSold / ico.data.amount) * 100;
  
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

  const formatDate = (timestamp: number) => {
    if (!timestamp || timestamp === 0) return 'No end date';
    const date = new Date(timestamp);
    return formatDistanceToNow(date, { addSuffix: true });
  };

  return (
    <Link href={`/launchpad/evm/${ico.data.seed}`}>
      <Card className="hover:border-primary transition-all duration-200 cursor-pointer h-full hover:shadow-lg">
        <CardHeader>
          <div className="flex items-start gap-3 mb-2">
            {metadata?.projectLogo && (
              <img
                src={metadata.projectLogo}
                alt={metadata.name}
                className="w-12 h-12 rounded-full object-cover"
              />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start gap-2">
                <CardTitle className="text-xl line-clamp-1">
                  {metadata?.name || `ICO #${ico.data.seed}`}
                </CardTitle>
                <Badge className={getStatusBadgeClass(status.color)}>
                  {status.status}
                </Badge>
              </div>
            </div>
          </div>
          
          {metadata?.description && (
            <CardDescription className="line-clamp-2 mt-2">
              {metadata.description}
            </CardDescription>
          )}
        </CardHeader>

        <CardContent>
          <div className="space-y-4">
            {/* Progress Bar */}
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-semibold">{soldPercentage.toFixed(1)}%</span>
              </div>
              <Progress value={soldPercentage} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>{(ico.data.totalSold / ico.data.icoDecimals).toLocaleString()} sold</span>
                <span>{(ico.data.amount / ico.data.icoDecimals).toLocaleString()} total</span>
              </div>
            </div>

            {/* Price */}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Current Price</span>
              <span className="font-semibold">{currentPrice.toFixed(6)}</span>
            </div>

            {/* Bonus */}
            {ico.data.bonusPercentage > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Bonus</span>
                <span className="font-semibold text-green-500">
                  {ico.data.bonusPercentage / 100}%
                </span>
              </div>
            )}

            {/* Timing */}
            <div className="pt-2 border-t text-xs text-muted-foreground">
              {status.status === 'Upcoming' && (
                <span>Starts {formatDate(ico.data.startDate)}</span>
              )}
              {status.status === 'Live' && ico.data.endDate > 0 && (
                <span>Ends {formatDate(ico.data.endDate)}</span>
              )}
              {(status.status === 'Ended' || status.status === 'Closed' || status.status === 'Sold Out') && (
                <span>Ended {formatDate(ico.data.endDate || ico.data.startDate)}</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
