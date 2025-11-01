// Owner Controls Component for ICO Management

'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useICOManagement } from '@/hooks/launchpad';
import { toast } from 'sonner';
import { Shield, XCircle, Download, AlertTriangle, Loader2 } from 'lucide-react';
import type { IIcoInfo } from '@/lib/launchpad/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface OwnerControlsProps {
  ico: IIcoInfo;
  onActionSuccess?: () => void;
}

export function OwnerControls({ ico, onActionSuccess }: OwnerControlsProps) {
  const { closeICO, withdrawFunds, isPending } = useICOManagement();
  const [actionType, setActionType] = useState<'close' | 'withdraw' | null>(null);

  const handleCloseICO = async () => {
    setActionType('close');
    try {
      await closeICO(ico.seed);
      toast.success('ICO closed successfully');
      onActionSuccess?.();
    } catch (error: any) {
      console.error('Failed to close ICO:', error);
      toast.error(error.message || 'Failed to close ICO');
    } finally {
      setActionType(null);
    }
  };

  const handleWithdrawFunds = async () => {
    setActionType('withdraw');
    try {
      await withdrawFunds(ico.seed);
      toast.success('Funds withdrawn successfully');
      onActionSuccess?.();
    } catch (error: any) {
      console.error('Failed to withdraw funds:', error);
      toast.error(error.message || 'Failed to withdraw funds');
    } finally {
      setActionType(null);
    }
  };

  const isClosing = actionType === 'close' && isPending;
  const isWithdrawing = actionType === 'withdraw' && isPending;
  const isClosed = ico.isClosed === 1;

  return (
    <Card className="border-orange-200 dark:border-orange-800">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Shield className="h-4 w-4 text-orange-600" />
          Owner Controls
        </CardTitle>
        <CardDescription>
          Manage your ICO (only visible to ICO owner)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            These actions are irreversible. Please proceed with caution.
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          {/* Withdraw Funds */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start"
                disabled={isPending || !isClosed}
              >
                {isWithdrawing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Withdrawing...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Withdraw Funds
                  </>
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Withdraw Raised Funds</AlertDialogTitle>
                <AlertDialogDescription>
                  This will transfer all raised funds from the ICO to your wallet. 
                  The ICO must be closed before you can withdraw funds.
                  {!isClosed && (
                    <span className="block mt-2 text-orange-600 font-semibold">
                      ⚠️ ICO must be closed first
                    </span>
                  )}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleWithdrawFunds} disabled={!isClosed}>
                  Confirm Withdrawal
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Close ICO */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                className="w-full justify-start"
                disabled={isPending || isClosed}
              >
                {isClosing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Closing...
                  </>
                ) : (
                  <>
                    <XCircle className="mr-2 h-4 w-4" />
                    {isClosed ? 'ICO Closed' : 'Close ICO'}
                  </>
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Close ICO</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently close the ICO and prevent any further purchases. 
                  Unsold tokens will be returned to your wallet. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleCloseICO} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Confirm Close ICO
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {/* Status Info */}
        <div className="pt-4 border-t space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">ICO Status:</span>
            <span className="font-semibold">
              {isClosed ? 'Closed' : 'Active'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total Raised:</span>
            <span className="font-semibold">
              {(ico.totalReceived / ico.icoDecimals).toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Tokens Sold:</span>
            <span className="font-semibold">
              {(ico.totalSold / ico.icoDecimals).toLocaleString()}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
