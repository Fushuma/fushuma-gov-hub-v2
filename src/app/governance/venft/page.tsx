'use client';

import { useState, useEffect } from 'react';
import { Navigation } from '@/components/layout/Navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Lock, TrendingUp, Calendar, Wallet, Plus, ArrowRight, ArrowDownUp, Info } from 'lucide-react';
import Link from 'next/link';
import { useAccount, useWaitForTransactionReceipt } from 'wagmi';
import { toast } from 'sonner';
import {
  useWFUMABalance,
  useWFUMAAllowance,
  useApproveWFUMA,
  useVeNFTBalance,
  useTotalVotingPower,
  useCreateLock,
  parseWFUMAAmount,
  WFUMA_ADDRESS,
  VOTING_ESCROW_ADDRESS,
  WFUMAAbi,
  VotingEscrowAbi,
  GOVERNANCE_PARAMS,
} from '@/lib/governance';

export default function VeNFTPage() {
  const { address, isConnected } = useAccount();
  
  // Contract hooks
  const { data: wfumaBalance } = useWFUMABalance(address);
  const { data: allowance } = useWFUMAAllowance(address);
  const { data: veNFTBalance } = useVeNFTBalance(address);
  const { data: totalVotingPower } = useTotalVotingPower(address);
  const { writeContract: approve, isPending: isApproving, data: approveHash } = useApproveWFUMA();
  const { writeContract: createLock, isPending: isCreating, data: createLockHash } = useCreateLock();
  
  // Wait for transactions
  const { isLoading: isApproveConfirming, isSuccess: isApproveSuccess } = useWaitForTransactionReceipt({
    hash: approveHash,
  });
  
  const { isLoading: isCreateLockConfirming, isSuccess: isCreateLockSuccess } = useWaitForTransactionReceipt({
    hash: createLockHash,
  });
  
  // Handle approve success
  useEffect(() => {
    if (isApproveSuccess && approveHash) {
      toast.success('WFUMA approved successfully!');
    }
  }, [isApproveSuccess, approveHash]);
  
  // Handle create lock success
  useEffect(() => {
    if (isCreateLockSuccess && createLockHash) {
      toast.success('Lock created successfully!');
      setLockAmount('');
    }
  }, [isCreateLockSuccess, createLockHash]);

  // Form state
  const [lockAmount, setLockAmount] = useState('');

  const minDeposit = Number(GOVERNANCE_PARAMS.VotingEscrow.minDeposit) / 1e18;
  const maxMultiplier = GOVERNANCE_PARAMS.VotingEscrow.maxMultiplier;
  const maxLockDuration = GOVERNANCE_PARAMS.VotingEscrow.maxLockDuration;

  // Calculate expected voting power at different time points
  const amount = lockAmount ? parseFloat(lockAmount) : 0;

  const handleApprove = async () => {
    if (!isConnected) {
      toast.error('Please connect your wallet');
      return;
    }

    try {
      const amountWei = parseWFUMAAmount(lockAmount);
      approve({
        address: WFUMA_ADDRESS as `0x${string}`,
        abi: WFUMAAbi,
        functionName: 'approve',
        args: [VOTING_ESCROW_ADDRESS as `0x${string}`, amountWei],
      });
    } catch (error: any) {
      console.error('Approve error:', error);
      toast.error(error.message || 'Failed to approve WFUMA');
    }
  };

  const handleCreateLock = async () => {
    if (!isConnected) {
      toast.error('Please connect your wallet');
      return;
    }

    if (amount < minDeposit) {
      toast.error(`Minimum deposit is ${minDeposit} WFUMA`);
      return;
    }

    try {
      const amountWei = parseWFUMAAmount(lockAmount);
      createLock({
        address: VOTING_ESCROW_ADDRESS as `0x${string}`,
        abi: VotingEscrowAbi,
        functionName: 'createLock',
        args: [amountWei],
      });
    } catch (error: any) {
      console.error('Create lock error:', error);
      toast.error(error.message || 'Failed to create lock');
    }
  };

  const needsApproval = () => {
    if (!lockAmount || !allowance || typeof allowance !== 'bigint') return true;
    const amountWei = parseWFUMAAmount(lockAmount);
    return BigInt(allowance) < amountWei;
  };

  // Calculate voting power at different time milestones
  const calculateVotingPowerAtTime = (months: number) => {
    const secondsInMonth = 2592000; // 30 days
    const timeElapsed = months * secondsInMonth;
    const maxDuration = maxLockDuration;
    
    if (timeElapsed >= maxDuration) {
      return amount * maxMultiplier;
    }
    
    const progressBps = (timeElapsed * 10000) / maxDuration;
    const multiplierIncrease = ((maxMultiplier - 1) * progressBps) / 10000;
    const currentMultiplier = 1 + multiplierIncrease;
    
    return amount * currentMultiplier;
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 py-16 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">veNFT Management</h1>
          <p className="text-muted-foreground">
            Lock WFUMA to receive voting power and participate in governance
          </p>
        </div>

        {/* Stats Overview */}
        {isConnected && (
          <div className="grid gap-4 md:grid-cols-4 mb-8">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm text-muted-foreground">WFUMA Balance</p>
                    <p className="text-2xl font-bold">
                      {wfumaBalance ? (Number(wfumaBalance) / 1e18).toLocaleString(undefined, { maximumFractionDigits: 2 }) : '0'}
                    </p>
                  </div>
                  <Wallet className="h-8 w-8 text-muted-foreground" />
                </div>
                <Link href="/governance/wrap">
                  <Button variant="outline" size="sm" className="w-full">
                    <ArrowDownUp className="h-4 w-4 mr-2" />
                    Wrap FUMA
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">veNFTs Owned</p>
                    <p className="text-2xl font-bold">
                      {veNFTBalance ? veNFTBalance.toString() : '0'}
                    </p>
                  </div>
                  <Lock className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Voting Power</p>
                    <p className="text-2xl font-bold">
                      {totalVotingPower ? (Number(totalVotingPower) / 1e18).toLocaleString(undefined, { maximumFractionDigits: 2 }) : '0'}
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Max Multiplier</p>
                    <p className="text-2xl font-bold">{maxMultiplier}x</p>
                  </div>
                  <Calendar className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {!isConnected && (
          <Card className="mb-8 border-blue-500">
            <CardContent className="py-8 text-center">
              <Wallet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">Connect Your Wallet</h3>
              <p className="text-muted-foreground">
                Connect your wallet to lock WFUMA and participate in governance
              </p>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="create" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="create">Create Lock</TabsTrigger>
            <TabsTrigger value="manage">My Locks</TabsTrigger>
          </TabsList>

          {/* Create Lock Tab */}
          <TabsContent value="create" className="space-y-6">
            {/* How It Works Info Box */}
            <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
              <CardContent className="pt-6">
                <div className="flex gap-3">
                  <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-900 dark:text-blue-100">
                    <p className="font-semibold mb-2">🚀 Automatic Voting Power Growth</p>
                    <p className="mb-2">
                      Your voting power grows automatically over time! Lock WFUMA once and watch your influence increase linearly from <strong>1x to {maxMultiplier}x</strong> over {maxLockDuration / 31536000} year.
                    </p>
                    <p>
                      No need to choose a lock duration - your tokens work harder for you the longer you hold them. Exit anytime via the exit queue.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Create New Lock</CardTitle>
                <CardDescription>
                  Lock WFUMA tokens to receive veNFT and voting power that grows automatically over time.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Amount Input */}
                <div className="space-y-2">
                  <Label htmlFor="amount">
                    Amount to Lock <span className="text-red-500">*</span>
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="amount"
                      type="number"
                      placeholder={`Minimum ${minDeposit} WFUMA`}
                      value={lockAmount}
                      onChange={(e) => setLockAmount(e.target.value)}
                      min={minDeposit}
                      step="0.01"
                      disabled={!isConnected}
                    />
                    <Button
                      variant="outline"
                      onClick={() => {
                        if (wfumaBalance) {
                          setLockAmount((Number(wfumaBalance) / 1e18).toString());
                        }
                      }}
                      disabled={!isConnected || !wfumaBalance}
                    >
                      Max
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Available: {wfumaBalance ? (Number(wfumaBalance) / 1e18).toLocaleString(undefined, { maximumFractionDigits: 2 }) : '0'} WFUMA
                  </p>
                </div>

                {/* Voting Power Growth Timeline */}
                {amount > 0 && (
                  <Card className="bg-muted">
                    <CardContent className="pt-6">
                      <div className="space-y-3">
                        <h4 className="font-semibold text-sm mb-3">📈 Your Voting Power Growth Timeline</h4>
                        
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">At Lock Creation:</span>
                            <span className="font-medium">
                              {amount.toLocaleString(undefined, { maximumFractionDigits: 2 })} 
                              <span className="text-muted-foreground text-xs ml-1">(1.00x)</span>
                            </span>
                          </div>
                          
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">After 3 Months:</span>
                            <span className="font-medium">
                              {calculateVotingPowerAtTime(3).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                              <span className="text-muted-foreground text-xs ml-1">(1.75x)</span>
                            </span>
                          </div>
                          
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">After 6 Months:</span>
                            <span className="font-medium">
                              {calculateVotingPowerAtTime(6).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                              <span className="text-muted-foreground text-xs ml-1">(2.50x)</span>
                            </span>
                          </div>
                          
                          <div className="flex justify-between items-center pt-2 border-t">
                            <span className="text-sm font-semibold">After 1 Year (Max):</span>
                            <span className="font-bold text-lg text-primary">
                              {calculateVotingPowerAtTime(12).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                              <span className="text-muted-foreground text-xs ml-1">({maxMultiplier}.00x)</span>
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Action Buttons */}
                <div className="space-y-3">
                  {needsApproval() ? (
                    <Button
                      onClick={handleApprove}
                      disabled={!isConnected || !lockAmount || amount < minDeposit || isApproving || isApproveConfirming}
                      className="w-full"
                      size="lg"
                    >
                      {isApproving || isApproveConfirming ? 'Approving...' : `Approve WFUMA`}
                    </Button>
                  ) : (
                    <Button
                      onClick={handleCreateLock}
                      disabled={!isConnected || !lockAmount || amount < minDeposit || isCreating || isCreateLockConfirming}
                      className="w-full"
                      size="lg"
                    >
                      <Lock className="mr-2 h-4 w-4" />
                      {isCreating || isCreateLockConfirming ? 'Creating Lock...' : 'Create Lock'}
                    </Button>
                  )}
                  
                  <p className="text-xs text-center text-muted-foreground">
                    By creating a lock, you agree to the exit queue mechanism. You can withdraw your tokens anytime after completing the cooldown period.
                  </p>
                </div>

                {/* Important Information */}
                <Card className="bg-muted border-0">
                  <CardContent className="pt-6">
                    <h4 className="font-semibold text-sm mb-3">Important Information:</h4>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-0.5">•</span>
                        <span>Minimum lock amount: {minDeposit} WFUMA</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-0.5">•</span>
                        <span>Voting power grows automatically from 1x to {maxMultiplier}x over {maxLockDuration / 31536000} year</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-0.5">•</span>
                        <span>Warmup period: {GOVERNANCE_PARAMS.VotingEscrow.warmupPeriod / 86400} days before voting power becomes active</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-0.5">•</span>
                        <span>You can increase your lock amount at any time</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-0.5">•</span>
                        <span>To withdraw, enter the exit queue and wait {GOVERNANCE_PARAMS.VotingEscrow.cooldownPeriod / 86400} days cooldown</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-0.5">•</span>
                        <span>Voting power is zero while in exit queue</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          </TabsContent>

          {/* My Locks Tab */}
          <TabsContent value="manage" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>My veNFT Locks</CardTitle>
                <CardDescription>
                  Manage your existing locks, increase amounts, or initiate withdrawals
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isConnected ? (
                  veNFTBalance && Number(veNFTBalance) > 0 ? (
                    <div className="text-center py-8">
                      <Lock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground">
                        You have {veNFTBalance.toString()} veNFT{Number(veNFTBalance) > 1 ? 's' : ''}
                      </p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Lock management interface coming soon
                      </p>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Lock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground mb-4">
                        You don't have any veNFTs yet
                      </p>
                      <Button variant="outline" onClick={() => {
                        const createTab = document.querySelector('[value="create"]') as HTMLElement;
                        createTab?.click();
                      }}>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Your First Lock
                      </Button>
                    </div>
                  )
                ) : (
                  <div className="text-center py-8">
                    <Wallet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">
                      Connect your wallet to view your locks
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
