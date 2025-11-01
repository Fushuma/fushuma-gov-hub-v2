// Purchase History Table Component

'use client';

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { IUserPurchaseWithKey, IIcoInfo } from '@/lib/launchpad/types';
import { useClaimTokens } from '@/hooks/launchpad';
import { toast } from 'sonner';
import { Loader2, Download, History } from 'lucide-react';
import { format } from 'date-fns';

interface PurchaseHistoryTableProps {
  purchases: IUserPurchaseWithKey[];
  ico: IIcoInfo;
  onClaimSuccess?: () => void;
}

export function PurchaseHistoryTable({ purchases, ico, onClaimSuccess }: PurchaseHistoryTableProps) {
  const { claimTokens, isPending } = useClaimTokens();
  const [claimingKey, setClaimingKey] = useState<string | null>(null);

  const isCliffActive = (buyDate: number): boolean => {
    if (!ico.cliffPeriod || ico.cliffPeriod === 0) return false;
    const cliffEndTime = buyDate + ico.cliffPeriod * 1000;
    return cliffEndTime > Date.now();
  };

  const handleClaim = async (purchase: IUserPurchaseWithKey) => {
    if (!ico.vestingContracts) {
      toast.error('Vesting contract not found');
      return;
    }

    setClaimingKey(purchase.key);
    try {
      await claimTokens(ico.vestingContracts);
      toast.success('Tokens claimed successfully');
      onClaimSuccess?.();
    } catch (error: any) {
      console.error('Claim failed:', error);
      toast.error(error.message || 'Claim failed');
    } finally {
      setClaimingKey(null);
    }
  };

  const canClaim = (purchase: IUserPurchaseWithKey): boolean => {
    const cliffActive = isCliffActive(purchase.data.buyDate);
    const allClaimed = purchase.data.totalClaimed >= Number(purchase.data.lockedAmount);
    return !cliffActive && !allClaimed;
  };

  if (purchases.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <History className="h-4 w-4" />
            Your Purchases
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8 text-muted-foreground">
          You haven't made any purchases yet
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <History className="h-4 w-4" />
          Your Purchases
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Purchased</TableHead>
                <TableHead className="text-right">Locked</TableHead>
                <TableHead className="text-right">Claimed</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-center">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {purchases.map((purchase) => {
                const cliffActive = isCliffActive(purchase.data.buyDate);
                const allClaimed = purchase.data.totalClaimed >= Number(purchase.data.lockedAmount);
                const isClaiming = claimingKey === purchase.key && isPending;

                return (
                  <TableRow key={purchase.key}>
                    <TableCell>
                      {format(new Date(purchase.data.buyDate), 'MMM dd, yyyy HH:mm')}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {(purchase.data.buyAmount / ico.icoDecimals).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {(Number(purchase.data.lockedAmount) / ico.icoDecimals).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {(purchase.data.totalClaimed / ico.icoDecimals).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-center">
                      {cliffActive ? (
                        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                          Cliff Active
                        </Badge>
                      ) : allClaimed ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          Fully Claimed
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          Vesting
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        size="sm"
                        onClick={() => handleClaim(purchase)}
                        disabled={!canClaim(purchase) || isClaiming}
                        variant={canClaim(purchase) ? 'default' : 'outline'}
                      >
                        {isClaiming ? (
                          <>
                            <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                            Claiming...
                          </>
                        ) : (
                          <>
                            <Download className="mr-2 h-3 w-3" />
                            Claim
                          </>
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
