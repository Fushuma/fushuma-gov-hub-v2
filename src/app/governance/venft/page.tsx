'use client';

import { useState } from 'react';
import { Navigation } from '@/components/layout/Navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Lock, TrendingUp, Calendar, Wallet, Plus, ArrowRight } from 'lucide-react';
import { useAccount } from 'wagmi';
import { toast } from 'sonner';
import {
  useWFUMABalance,
  useWFUMAAllowance,
  useApproveWFUMA,
  useVeNFTBalance,
  useTotalVotingPower,
  useCreateLock,
  calculateVotingMultiplier,
  calculateExpectedVotingPower,
  formatLockDuration,
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
  const { writeContract: approve, isPending: isApproving } = useApproveWFUMA();
  const { writeContract: createLock, isPending: isCreating } = useCreateLock();

  // Form state
  const [lockAmount, setLockAmount] = useState('');
  const [lockDuration, setLockDuration] = useState('31536000'); // 1 year in seconds

  const minDeposit = Number(GOVERNANCE_PARAMS.VotingEscrow.minDeposit) / 1e18;
  const maxDuration = GOVERNANCE_PARAMS.VotingEscrow.maxLockDuration;
  const maxMultiplier = GOVERNANCE_PARAMS.VotingEscrow.maxMultiplier;

  // Calculate expected voting power
  const amount = lockAmount ? parseFloat(lockAmount) : 0;
  const duration = parseInt(lockDuration);
  const multiplier = calculateVotingMultiplier(duration);
  const expectedPower = amount * multiplier;

  const handleApprove = async () => {
    if (!isConnected) {
      toast.error('Please connect your wallet');
      return;
    }

    try {
      const amountWei = parseWFUMAAmount(lockAmount);
      await approve({
        address: WFUMA_ADDRESS as `0x${string}`,
        abi: WFUMAAbi,
        functionName: 'approve',
        args: [VOTING_ESCROW_ADDRESS as `0x${string}`, amountWei],
      });
      toast.success('WFUMA approved successfully!');
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
      await createLock({
        address: VOTING_ESCROW_ADDRESS as `0x${string}`,
        abi: VotingEscrowAbi,
        functionName: 'createLock',
        args: [amountWei, BigInt(duration)],
      });
      toast.success('Lock created successfully!');
      setLockAmount('');
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
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">WFUMA Balance</p>
                    <p className="text-2xl font-bold">
                      {wfumaBalance ? (Number(wfumaBalance) / 1e18).toLocaleString(undefined, { maximumFractionDigits: 2 }) : '0'}
                    </p>
                  </div>
                  <Wallet className="h-8 w-8 text-muted-foreground" />
                </div>
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
            <Card>
              <CardHeader>
                <CardTitle>Create New Lock</CardTitle>
                <CardDescription>
                  Lock WFUMA tokens to receive veNFT and voting power. Longer lock periods provide higher voting power multipliers.
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

                {/* Duration Selector */}
                <div className="space-y-2">
                  <Label>Lock Duration</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {[
                      { label: '1 Month', value: 2592000 },
                      { label: '3 Months', value: 7776000 },
                      { label: '6 Months', value: 15552000 },
                      { label: '1 Year', value: 31536000 },
                    ].map((option) => (
                      <Button
                        key={option.value}
                        variant={lockDuration === option.value.toString() ? 'default' : 'outline'}
                        onClick={() => setLockDuration(option.value.toString())}
                        disabled={!isConnected}
                        className="w-full"
                      >
                        {option.label}
                      </Button>
                    ))}
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      Duration: {formatLockDuration(duration)}
                    </span>
                    <span className="font-medium">
                      Multiplier: {multiplier.toFixed(2)}x
                    </span>
                  </div>
                </div>

                {/* Expected Voting Power */}
                {amount > 0 && (
                  <Card className="bg-muted">
                    <CardContent className="pt-6">
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Lock Amount:</span>
                          <span className="font-medium">{amount.toLocaleString()} WFUMA</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Lock Duration:</span>
                          <span className="font-medium">{formatLockDuration(duration)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Voting Multiplier:</span>
                          <span className="font-medium">{multiplier.toFixed(2)}x</span>
                        </div>
                        <div className="flex justify-between pt-2 border-t">
                          <span className="font-semibold">Expected Voting Power:</span>
                          <span className="font-bold text-lg text-primary">
                            {expectedPower.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                          </span>
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
                      disabled={!isConnected || !lockAmount || amount < minDeposit || isApproving}
                      className="w-full"
                      size="lg"
                    >
                      {isApproving ? 'Approving...' : `Approve WFUMA`}
                    </Button>
                  ) : (
                    <Button
                      onClick={handleCreateLock}
                      disabled={!isConnected || !lockAmount || amount < minDeposit || isCreating}
                      className="w-full"
                      size="lg"
                    >
                      <Lock className="mr-2 h-4 w-4" />
                      {isCreating ? 'Creating Lock...' : 'Create Lock'}
                    </Button>
                  )}
                </div>

                {/* Info Box */}
                <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
                  <h4 className="font-medium mb-2 text-blue-900 dark:text-blue-100">Important Information:</h4>
                  <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
                    <li>Minimum lock amount: {minDeposit} WFUMA</li>
                    <li>Maximum lock duration: {formatLockDuration(maxDuration)}</li>
                    <li>Voting power increases linearly with lock duration (up to {maxMultiplier}x)</li>
                    <li>Tokens are locked until the expiration date</li>
                    <li>You can extend your lock or increase the amount at any time</li>
                    <li>After expiration, you can withdraw your tokens</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Manage Locks Tab */}
          <TabsContent value="manage" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>My veNFT Locks</CardTitle>
                <CardDescription>
                  View and manage your existing veNFT positions
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!isConnected ? (
                  <div className="text-center py-12 text-muted-foreground">
                    Connect your wallet to view your locks
                  </div>
                ) : veNFTBalance === 0n ? (
                  <div className="text-center py-12">
                    <Lock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">No Locks Found</h3>
                    <p className="text-muted-foreground mb-4">
                      You don't have any veNFT locks yet. Create your first lock to start participating in governance.
                    </p>
                    <Button onClick={() => document.querySelector<HTMLButtonElement>('[value="create"]')?.click()}>
                      <Plus className="mr-2 h-4 w-4" />
                      Create First Lock
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="text-center py-8 text-muted-foreground">
                      <p className="mb-2">You have {veNFTBalance.toString()} veNFT(s)</p>
                      <p className="text-sm">
                        Detailed lock management interface coming soon. You can view your locks on{' '}
                        <a
                          href={`https://fumascan.com/address/${VOTING_ESCROW_ADDRESS}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          Fumascan
                        </a>
                      </p>
                    </div>
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
