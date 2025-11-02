'use client';

/**
 * Claim Form Component
 * Allows users to claim bridged tokens on destination chain
 */

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useBridgeClaim } from '@/lib/bridge/hooks/useBridgeClaim';
import { useBridgeStore } from '@/lib/bridge/stores/bridgeStore';
import { isValidAddress } from '@/lib/bridge/utils/bridgeHelpers';

export function ClaimForm() {
  const { address: account } = useAccount();
  const [txHash, setTxHash] = useState('');
  const [fromChainId, setFromChainId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const { simpleClaim } = useBridgeClaim();
  const { isPending } = useBridgeStore();

  // Validate inputs
  const canClaim = Boolean(
    account &&
    txHash &&
    fromChainId &&
    txHash.startsWith('0x') &&
    txHash.length === 66 &&
    !isPending
  );

  const handleClaim = async () => {
    if (!canClaim) return;

    setError(null);
    setSuccess(false);

    const chainId = parseInt(fromChainId);
    if (isNaN(chainId)) {
      setError('Invalid chain ID');
      return;
    }

    const result = await simpleClaim(txHash, chainId);

    if (result) {
      setSuccess(true);
      setTxHash('');
      setFromChainId('');
    } else {
      setError('Claim failed. Please check the transaction hash and try again.');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Claim Bridged Tokens</CardTitle>
        <CardDescription>
          Enter your bridge transaction hash to claim tokens on the destination chain
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Transaction Hash */}
        <div className="space-y-2">
          <Label>Transaction Hash</Label>
          <Input
            type="text"
            placeholder="0x..."
            value={txHash}
            onChange={(e) => setTxHash(e.target.value)}
            disabled={isPending}
          />
          <p className="text-xs text-muted-foreground">
            The transaction hash from your bridge transaction
          </p>
        </div>

        {/* From Chain ID */}
        <div className="space-y-2">
          <Label>From Chain ID</Label>
          <Input
            type="number"
            placeholder="e.g., 1 for Ethereum, 56 for BSC"
            value={fromChainId}
            onChange={(e) => setFromChainId(e.target.value)}
            disabled={isPending}
          />
          <p className="text-xs text-muted-foreground">
            The chain ID where you initiated the bridge transaction
          </p>
        </div>

        {/* Common Chain IDs Reference */}
        <div className="rounded-lg border bg-muted/50 p-4">
          <p className="mb-2 text-sm font-medium">Common Chain IDs:</p>
          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            <div>Ethereum: 1</div>
            <div>BSC: 56</div>
            <div>Polygon: 137</div>
            <div>Arbitrum: 42161</div>
            <div>Base: 8453</div>
            <div>Fushuma: 121224</div>
          </div>
        </div>

        {/* Success Message */}
        {success && (
          <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800 dark:text-green-200">
              Tokens claimed successfully! Check your wallet.
            </AlertDescription>
          </Alert>
        )}

        {/* Error Message */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Claim Button */}
        {!account ? (
          <Button className="w-full" disabled>
            Connect Wallet
          </Button>
        ) : (
          <Button
            className="w-full"
            onClick={handleClaim}
            disabled={!canClaim}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Claiming...
              </>
            ) : (
              'Claim Tokens'
            )}
          </Button>
        )}

        {/* Info */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Make sure you are connected to the destination network before claiming.
            The claim process requires signatures from bridge validators.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
