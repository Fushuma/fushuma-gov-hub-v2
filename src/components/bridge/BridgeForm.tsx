'use client';

/**
 * Bridge Form Component
 * Main form for bridging tokens between chains
 */

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle } from 'lucide-react';
import { NetworkSelector, NetworkSwapButton } from './NetworkSelector';
import { TokenSelector } from './TokenSelector';
import { useBridgeStore } from '@/lib/bridge/stores/bridgeStore';
import { useBridgeSwap } from '@/lib/bridge/hooks/useBridgeSwap';
import { useBridgeAllowance } from '@/lib/bridge/hooks/useBridgeAllowance';
import { useBridgeBalance } from '@/lib/bridge/hooks/useBridgeBalance';
import { validateBridgeAmount, getDecimalAmount } from '@/lib/bridge/utils/bridgeHelpers';
import { getMinGasAmount } from '@/lib/bridge/constants/bridgeConfig';

export function BridgeForm() {
  const { address: account, chainId } = useAccount();
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);

  const {
    fromNetwork,
    toNetwork,
    selectedToken,
    isPending,
    destinationAddress,
    setDestinationAddress
  } = useBridgeStore();

  const { simpleSwap } = useBridgeSwap();

  // Get token details
  const tokenAddress = fromNetwork && selectedToken
    ? selectedToken.address[fromNetwork.chainId]
    : undefined;
  const tokenDecimals = fromNetwork && selectedToken
    ? selectedToken.decimals[fromNetwork.chainId]
    : 18;

  // Get balance
  const { balance, refetchBalance } = useBridgeBalance(
    tokenAddress && tokenAddress ? (tokenAddress as `0x${string}`) : undefined,
    tokenDecimals
  );

  // Get allowance
  const { isApproved, approve, needsApproval } = useBridgeAllowance(
    tokenAddress && tokenAddress ? (tokenAddress as `0x${string}`) : undefined,
    amount,
    tokenDecimals
  );

  // Validate form
  const canSubmit = Boolean(
    account &&
    fromNetwork &&
    toNetwork &&
    selectedToken &&
    amount &&
    !error &&
    !isPending
  );

  // Validate amount on change
  useEffect(() => {
    if (!amount) {
      setError(null);
      return;
    }

    // Check if token is available on selected network
    if (selectedToken && fromNetwork && !tokenAddress) {
      setError(`${selectedToken.symbol} is not available on ${fromNetwork.name}`);
      return;
    }

    const minGas = getMinGasAmount(fromNetwork?.chainId);
    const validation = validateBridgeAmount(amount, balance, minGas.toString());
    
    if (!validation.valid) {
      setError(validation.error || null);
    } else {
      setError(null);
    }
  }, [amount, balance, fromNetwork, selectedToken, tokenAddress]);

  // Handle max button
  const handleMax = () => {
    if (balance) {
      // Leave some for gas
      const maxAmount = Math.max(0, parseFloat(balance) - 0.01);
      setAmount(maxAmount.toString());
    }
  };

  // Handle bridge
  const handleBridge = async () => {
    if (!canSubmit || !fromNetwork || !toNetwork || !selectedToken || !account) return;

    const tokenAddr = selectedToken.address[fromNetwork.chainId];
    if (!tokenAddr) return;

    const receiver = destinationAddress || account;
    const isNativeToken = !tokenAddr || (tokenAddr as string) === '';
    const value = isNativeToken ? getDecimalAmount(amount, tokenDecimals) : 0n;

    const result = await simpleSwap(
      receiver,
      (tokenAddr as string) === '' ? '0x0000000000000000000000000000000000000000' : (tokenAddr as `0x${string}`),
      amount,
      tokenDecimals,
      toNetwork.chainId,
      value
    );

    if (result) {
      setAmount('');
      setDestinationAddress('');
      refetchBalance();
    }
  };

  // Handle approve
  const handleApprove = async () => {
    if (!amount) {
      setError('Please enter an amount');
      return;
    }
    const success = await approve(amount);
    if (success) {
      // Approval successful, can now bridge
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bridge Tokens</CardTitle>
        <CardDescription>
          Transfer tokens between different blockchain networks
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* From Network */}
        <div className="space-y-2">
          <Label>From Network</Label>
          <NetworkSelector type="from" disabled={isPending} />
        </div>

        {/* Swap Networks Button */}
        <div className="flex justify-center">
          <NetworkSwapButton />
        </div>

        {/* To Network */}
        <div className="space-y-2">
          <Label>To Network</Label>
          <NetworkSelector type="to" disabled={isPending} />
        </div>

        {/* Token Selection */}
        <div className="space-y-2">
          <Label>Token</Label>
          <TokenSelector disabled={isPending || !fromNetwork} />
        </div>

        {/* Amount Input */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Amount</Label>
            {balance && (
              <span className="text-sm text-muted-foreground">
                Balance: {parseFloat(balance).toFixed(4)} {selectedToken?.symbol}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="0.0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={isPending || !selectedToken}
              className="flex-1"
            />
            <Button
              variant="outline"
              onClick={handleMax}
              disabled={isPending || !balance}
            >
              Max
            </Button>
          </div>
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>

        {/* Destination Address (Optional) */}
        <div className="space-y-2">
          <Label>Destination Address (Optional)</Label>
          <Input
            type="text"
            placeholder={account || '0x...'}
            value={destinationAddress}
            onChange={(e) => setDestinationAddress(e.target.value)}
            disabled={isPending}
          />
          <p className="text-xs text-muted-foreground">
            Leave empty to use your connected wallet address
          </p>
        </div>

        {/* Warnings */}
        {fromNetwork && toNetwork && fromNetwork.chainId !== chainId && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please switch to {fromNetwork.name} network to continue
            </AlertDescription>
          </Alert>
        )}

        {/* Action Buttons */}
        <div className="space-y-2">
          {!account ? (
            <Button className="w-full" disabled>
              Connect Wallet
            </Button>
          ) : needsApproval(amount) && !isApproved ? (
            <Button
              className="w-full"
              onClick={handleApprove}
              disabled={!canSubmit}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Approving...
                </>
              ) : (
                'Approve Token'
              )}
            </Button>
          ) : (
            <Button
              className="w-full"
              onClick={handleBridge}
              disabled={!canSubmit}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Bridging...
                </>
              ) : (
                'Bridge Tokens'
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
