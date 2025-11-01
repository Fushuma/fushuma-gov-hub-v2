// Vesting Information Component

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { IIcoInfo } from '@/lib/launchpad/types';
import { Lock, Unlock, Calendar, TrendingUp, Clock } from 'lucide-react';

interface VestingInfoProps {
  ico: IIcoInfo;
}

export function VestingInfo({ ico }: VestingInfoProps) {
  const formatDuration = (seconds: number): string => {
    if (seconds === 0) return 'None';
    
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) {
      return `${days} day${days > 1 ? 's' : ''}`;
    } else if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''}`;
    } else {
      return `${minutes} minute${minutes > 1 ? 's' : ''}`;
    }
  };

  const hasVesting = ico.unlockPercentage < 10000;

  if (!hasVesting) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Unlock className="h-4 w-4" />
            Token Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              100% Unlocked
            </Badge>
            <span className="text-sm text-muted-foreground">
              All tokens are available immediately after purchase
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Lock className="h-4 w-4" />
          Vesting Schedule
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Unlock className="h-4 w-4 text-green-600" />
              <p className="text-sm text-muted-foreground">Unlocked</p>
            </div>
            <p className="text-xl font-bold">{ico.unlockPercentage / 100}%</p>
            <p className="text-xs text-muted-foreground">Available immediately</p>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="h-4 w-4 text-blue-600" />
              <p className="text-sm text-muted-foreground">Cliff Period</p>
            </div>
            <p className="text-xl font-bold">{formatDuration(ico.cliffPeriod)}</p>
            <p className="text-xs text-muted-foreground">Lock period</p>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-purple-600" />
              <p className="text-sm text-muted-foreground">Vesting Rate</p>
            </div>
            <p className="text-xl font-bold">{ico.vestingPercentage / 100}%</p>
            <p className="text-xs text-muted-foreground">Per interval</p>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-orange-600" />
              <p className="text-sm text-muted-foreground">Interval</p>
            </div>
            <p className="text-xl font-bold">{formatDuration(ico.vestingInterval)}</p>
            <p className="text-xs text-muted-foreground">Release frequency</p>
          </div>
        </div>

        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
          <p className="text-sm text-blue-900 dark:text-blue-100">
            <strong>How it works:</strong> {ico.unlockPercentage / 100}% of your tokens are available immediately. 
            After a {formatDuration(ico.cliffPeriod)} cliff period, the remaining tokens vest at {ico.vestingPercentage / 100}% 
            every {formatDuration(ico.vestingInterval)}.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
