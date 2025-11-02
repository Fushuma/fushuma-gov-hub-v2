'use client';

/**
 * Transaction History Component
 * Displays bridge transaction history
 */

import { useMemo } from 'react';
import { useAccount } from 'wagmi';
import { ExternalLink, Clock, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useBridgeStore } from '@/lib/bridge/stores/bridgeStore';
import { getNetworkByChainId } from '@/lib/bridge/constants/bridgeNetworks';
import { getExplorerUrl, shortenAddress, formatTimeAgo } from '@/lib/bridge/utils/bridgeHelpers';

export function TransactionHistory() {
  const { address: account } = useAccount();
  const { transactionHistory } = useBridgeStore();

  // Filter transactions for current user
  const userTransactions = useMemo(() => {
    if (!account) return [];
    return transactionHistory.slice(0, 10); // Show last 10
  }, [transactionHistory, account]);

  if (!account) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>Connect your wallet to view transaction history</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (userTransactions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>Your bridge transactions will appear here</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center text-sm text-muted-foreground">
            No transactions yet
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transaction History</CardTitle>
        <CardDescription>Your recent bridge transactions</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>From</TableHead>
              <TableHead>To</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Time</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {userTransactions.map((tx) => {
              const fromNetwork = getNetworkByChainId(tx.fromChainId);
              const toNetwork = getNetworkByChainId(tx.toChainId);
              const explorerUrl = getExplorerUrl(tx.fromChainId, tx.txHash);

              return (
                <TableRow key={tx.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{fromNetwork?.name || 'Unknown'}</span>
                      <span className="text-xs text-muted-foreground">
                        {shortenAddress(tx.txHash)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{toNetwork?.name || 'Unknown'}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{tx.amount}</span>
                      <span className="text-xs text-muted-foreground">{tx.fromToken}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <TransactionStatus status={tx.status} confirmedBlocks={tx.confirmedBlocks} />
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {formatTimeAgo(tx.timestamp)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      asChild
                    >
                      <a
                        href={explorerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

interface TransactionStatusProps {
  status: 'pending' | 'confirmed' | 'claimed' | 'failed';
  confirmedBlocks?: number;
}

function TransactionStatus({ status, confirmedBlocks }: TransactionStatusProps) {
  const statusConfig = {
    pending: {
      icon: Loader2,
      label: `Pending ${confirmedBlocks ? `(${confirmedBlocks} blocks)` : ''}`,
      variant: 'secondary' as const,
      className: 'animate-spin'
    },
    confirmed: {
      icon: Clock,
      label: 'Confirmed',
      variant: 'default' as const,
      className: ''
    },
    claimed: {
      icon: CheckCircle2,
      label: 'Claimed',
      variant: 'default' as const,
      className: 'text-green-500'
    },
    failed: {
      icon: XCircle,
      label: 'Failed',
      variant: 'destructive' as const,
      className: 'text-destructive'
    }
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className="gap-1">
      <Icon className={`h-3 w-3 ${config.className}`} />
      {config.label}
    </Badge>
  );
}
