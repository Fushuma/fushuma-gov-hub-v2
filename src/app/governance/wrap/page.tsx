'use client';

import { useState } from 'react';
import { useAccount, useBalance, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { Navigation } from '@/components/layout/Navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowDownUp, Coins, Info, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { GOVERNANCE_CONTRACTS } from '@/lib/governance';
import WFUMA_ABI from '@/lib/governance/abis/WFUMA.json';

const WFUMA_ADDRESS = GOVERNANCE_CONTRACTS.WFUMA as `0x${string}`;

export default function WrapPage() {
  const { address, isConnected } = useAccount();
  const [wrapAmount, setWrapAmount] = useState('');
  const [unwrapAmount, setUnwrapAmount] = useState('');

  // Get FUMA balance (native token)
  const { data: fumaBalance } = useBalance({
    address: address,
  });

  // Get WFUMA balance
  const { data: wfumaBalance } = useBalance({
    address: address,
    token: WFUMA_ADDRESS,
  });

  // Wrap (deposit) transaction
  const { 
    writeContract: wrapFuma, 
    data: wrapHash,
    isPending: isWrapping 
  } = useWriteContract();

  // Unwrap (withdraw) transaction
  const { 
    writeContract: unwrapFuma, 
    data: unwrapHash,
    isPending: isUnwrapping 
  } = useWriteContract();

  // Wait for wrap transaction
  const { isLoading: isWrapConfirming, isSuccess: isWrapSuccess } = useWaitForTransactionReceipt({
    hash: wrapHash,
  });

  // Wait for unwrap transaction
  const { isLoading: isUnwrapConfirming, isSuccess: isUnwrapSuccess } = useWaitForTransactionReceipt({
    hash: unwrapHash,
  });

  // Handle wrap success
  if (isWrapSuccess) {
    toast.success('Successfully wrapped FUMA to WFUMA!');
    setWrapAmount('');
  }

  // Handle unwrap success
  if (isUnwrapSuccess) {
    toast.success('Successfully unwrapped WFUMA to FUMA!');
    setUnwrapAmount('');
  }

  const handleWrap = async () => {
    if (!wrapAmount || parseFloat(wrapAmount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    try {
      const amountWei = parseEther(wrapAmount);
      
      wrapFuma({
        address: WFUMA_ADDRESS,
        abi: WFUMA_ABI.abi,
        functionName: 'deposit',
        value: amountWei,
      });
    } catch (error: any) {
      toast.error(error.message || 'Failed to wrap FUMA');
    }
  };

  const handleUnwrap = async () => {
    if (!unwrapAmount || parseFloat(unwrapAmount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    try {
      const amountWei = parseEther(unwrapAmount);
      
      unwrapFuma({
        address: WFUMA_ADDRESS,
        abi: WFUMA_ABI.abi,
        functionName: 'withdraw',
        args: [amountWei],
      });
    } catch (error: any) {
      toast.error(error.message || 'Failed to unwrap WFUMA');
    }
  };

  const setMaxWrap = () => {
    if (fumaBalance) {
      // Leave a small amount for gas
      const maxAmount = Number(formatEther(fumaBalance.value)) - 0.01;
      setWrapAmount(maxAmount > 0 ? maxAmount.toFixed(6) : '0');
    }
  };

  const setMaxUnwrap = () => {
    if (wfumaBalance) {
      setUnwrapAmount(formatEther(wfumaBalance.value));
    }
  };

  const addTokenToMetaMask = async () => {
    try {
      const wasAdded = await window.ethereum.request({
        method: 'wallet_watchAsset',
        params: {
          type: 'ERC20',
          options: {
            address: WFUMA_ADDRESS,
            symbol: 'WFUMA',
            decimals: 18,
            image: 'https://governance2.fushuma.com/fushuma-icon-2024.png',
          },
        },
      });

      if (wasAdded) {
        toast.success('WFUMA added to MetaMask!');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to add token to MetaMask');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Wrap FUMA</h1>
          <p className="text-muted-foreground">
            Convert between FUMA and WFUMA for governance participation
          </p>
        </div>

        {/* Balance Cards */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">FUMA Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {isConnected && fumaBalance ? formatEther(fumaBalance.value) : '0.00'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Native Token</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">WFUMA Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {isConnected && wfumaBalance ? formatEther(wfumaBalance.value) : '0.00'}
              </p>
              <p className="text-xs text-muted-foreground mt-1 mb-3">Wrapped Token</p>
              {isConnected && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={addTokenToMetaMask}
                >
                  <Wallet className="h-4 w-4 mr-2" />
                  Add to MetaMask
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Info Box */}
        <Card className="mb-6 border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900 dark:text-blue-100">
                <p className="font-semibold mb-2">What is WFUMA?</p>
                <p className="mb-2">
                  WFUMA (Wrapped FUMA) is an ERC-20 version of FUMA that can be used in smart contracts. 
                  You need WFUMA to participate in governance by locking it to create veNFTs.
                </p>
                <p>
                  Wrapping is 1:1 - you can always unwrap your WFUMA back to FUMA at any time.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Wrap/Unwrap Interface */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowDownUp className="h-5 w-5" />
              Wrap / Unwrap
            </CardTitle>
            <CardDescription>
              Convert between FUMA and WFUMA
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!isConnected ? (
              <div className="text-center py-8">
                <Coins className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-4">
                  Connect your wallet to wrap or unwrap tokens
                </p>
              </div>
            ) : (
              <Tabs defaultValue="wrap" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="wrap">Wrap FUMA</TabsTrigger>
                  <TabsTrigger value="unwrap">Unwrap WFUMA</TabsTrigger>
                </TabsList>

                {/* Wrap Tab */}
                <TabsContent value="wrap" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="wrap-amount">Amount to Wrap</Label>
                    <div className="flex gap-2">
                      <Input
                        id="wrap-amount"
                        type="number"
                        placeholder="0.0"
                        value={wrapAmount}
                        onChange={(e) => setWrapAmount(e.target.value)}
                        step="0.000001"
                        min="0"
                      />
                      <Button variant="outline" onClick={setMaxWrap}>
                        Max
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Available: {fumaBalance ? formatEther(fumaBalance.value) : '0'} FUMA
                    </p>
                  </div>

                  <div className="bg-muted p-4 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-muted-foreground">You will receive</span>
                      <span className="text-lg font-semibold">
                        {wrapAmount || '0'} WFUMA
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Exchange rate: 1 FUMA = 1 WFUMA
                    </p>
                  </div>

                  <Button 
                    className="w-full" 
                    size="lg"
                    onClick={handleWrap}
                    disabled={isWrapping || isWrapConfirming || !wrapAmount || parseFloat(wrapAmount) <= 0}
                  >
                    {isWrapping || isWrapConfirming ? 'Wrapping...' : 'Wrap FUMA'}
                  </Button>
                </TabsContent>

                {/* Unwrap Tab */}
                <TabsContent value="unwrap" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="unwrap-amount">Amount to Unwrap</Label>
                    <div className="flex gap-2">
                      <Input
                        id="unwrap-amount"
                        type="number"
                        placeholder="0.0"
                        value={unwrapAmount}
                        onChange={(e) => setUnwrapAmount(e.target.value)}
                        step="0.000001"
                        min="0"
                      />
                      <Button variant="outline" onClick={setMaxUnwrap}>
                        Max
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Available: {wfumaBalance ? formatEther(wfumaBalance.value) : '0'} WFUMA
                    </p>
                  </div>

                  <div className="bg-muted p-4 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-muted-foreground">You will receive</span>
                      <span className="text-lg font-semibold">
                        {unwrapAmount || '0'} FUMA
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Exchange rate: 1 WFUMA = 1 FUMA
                    </p>
                  </div>

                  <Button 
                    className="w-full" 
                    size="lg"
                    onClick={handleUnwrap}
                    disabled={isUnwrapping || isUnwrapConfirming || !unwrapAmount || parseFloat(unwrapAmount) <= 0}
                  >
                    {isUnwrapping || isUnwrapConfirming ? 'Unwrapping...' : 'Unwrap WFUMA'}
                  </Button>
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>

        {/* Next Steps */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">Next Steps</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Wrap your FUMA to get WFUMA tokens</li>
              <li>
                <a href="/governance/venft" className="text-primary hover:underline">
                  Lock WFUMA to create a veNFT
                </a> and gain voting power
              </li>
              <li>
                <a href="/governance" className="text-primary hover:underline">
                  Vote on governance proposals
                </a> to shape the ecosystem
              </li>
              <li>
                <a href="/governance/gauges" className="text-primary hover:underline">
                  Allocate resources via gauge voting
                </a>
              </li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
