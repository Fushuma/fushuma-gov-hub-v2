'use client';

import { useState } from 'react';
import { Navigation } from '@/components/layout/Navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, Calendar, Wallet, Vote, Info } from 'lucide-react';
import { useAccount } from 'wagmi';
import { toast } from 'sonner';
import {
  useTotalVotingPower,
  useCurrentEpoch,
  useEpochPhase,
  useTotalGaugeWeight,
  useVoteForGaugeWeights,
  getEpochPhaseLabel,
  calculateEpochProgress,
  GAUGE_CONTROLLER_ADDRESS,
  GaugeControllerAbi,
  GOVERNANCE_PARAMS,
} from '@/lib/governance';

// Mock gauges - in production, these would come from contract events
const MOCK_GAUGES = [
  {
    id: 0n,
    name: 'Fushuma Grant Gauge',
    description: 'Distributes WFUMA to approved grant projects',
    address: '0x0D6833778cf1fa803D21075b800483F68f57A153',
    type: 'Grant',
    weight: 5000000000000000000000n,
    userVote: 0n,
  },
  {
    id: 1n,
    name: 'FumaSwap LP Rewards',
    description: 'Rewards for liquidity providers on FumaSwap',
    address: '0x0000000000000000000000000000000000000001',
    type: 'DeFi',
    weight: 3000000000000000000000n,
    userVote: 0n,
  },
  {
    id: 2n,
    name: 'Developer Incentives',
    description: 'Rewards for ecosystem developers and builders',
    address: '0x0000000000000000000000000000000000000002',
    type: 'Development',
    weight: 2000000000000000000000n,
    userVote: 0n,
  },
];

export default function GaugesPage() {
  const { address, isConnected } = useAccount();
  
  // Contract hooks
  const { data: votingPower } = useTotalVotingPower(address);
  const { data: currentEpoch } = useCurrentEpoch();
  const { data: epochPhase } = useEpochPhase();
  const { data: totalWeight } = useTotalGaugeWeight();
  const { writeContract: voteForGauges, isPending: isVoting } = useVoteForGaugeWeights();

  // Local state
  const [gauges, setGauges] = useState(MOCK_GAUGES);
  const [voteAllocations, setVoteAllocations] = useState<Record<string, string>>({});

  const epochDuration = GOVERNANCE_PARAMS.EpochManager.epochDuration;
  const currentEpochNum = currentEpoch ? Number(currentEpoch) : 0;
  const epochStartTime = currentEpochNum > 0 ? BigInt(Date.now() / 1000) - BigInt(currentEpochNum) * BigInt(epochDuration) : 0n;
  const epochProgress = calculateEpochProgress(epochStartTime, epochDuration);

  const handleVoteAllocationChange = (gaugeId: string, value: string) => {
    setVoteAllocations(prev => ({ ...prev, [gaugeId]: value }));
  };

  const getTotalAllocated = () => {
    return Object.values(voteAllocations).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
  };

  const handleSubmitVotes = async () => {
    if (!isConnected) {
      toast.error('Please connect your wallet');
      return;
    }

    if (!votingPower || votingPower === 0n) {
      toast.error('You need voting power to vote on gauges');
      return;
    }

    const totalAllocated = getTotalAllocated();
    if (totalAllocated === 0) {
      toast.error('Please allocate voting power to at least one gauge');
      return;
    }

    if (totalAllocated > 100) {
      toast.error('Total allocation cannot exceed 100%');
      return;
    }

    try {
      // Prepare gauge IDs and weights
      const gaugeIds: bigint[] = [];
      const weights: bigint[] = [];

      Object.entries(voteAllocations).forEach(([gaugeId, allocation]) => {
        const allocationPercent = parseFloat(allocation);
        if (allocationPercent > 0) {
          gaugeIds.push(BigInt(gaugeId));
          // Convert percentage to basis points (1% = 100 bps)
          weights.push(BigInt(Math.floor(allocationPercent * 100)));
        }
      });

      await voteForGauges({
        address: GAUGE_CONTROLLER_ADDRESS as `0x${string}`,
        abi: GaugeControllerAbi,
        functionName: 'voteForGaugeWeights',
        args: [gaugeIds, weights],
      });

      toast.success('Votes submitted successfully!');
      setVoteAllocations({});
    } catch (error: any) {
      console.error('Vote error:', error);
      toast.error(error.message || 'Failed to submit votes');
    }
  };

  const totalAllocated = getTotalAllocated();
  const remainingAllocation = 100 - totalAllocated;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 py-16 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Gauge Voting</h1>
          <p className="text-muted-foreground">
            Vote on resource allocation across different gauges using your voting power
          </p>
        </div>

        {/* Epoch Info */}
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Current Epoch</p>
                  <p className="text-2xl font-bold">
                    {currentEpoch !== undefined && currentEpoch !== null ? currentEpoch.toString() : '-'}
                  </p>
                </div>
                <Calendar className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Epoch Phase</p>
                  <p className="text-2xl font-bold">
                    {epochPhase !== undefined ? getEpochPhaseLabel(Number(epochPhase)) : '-'}
                  </p>
                </div>
                <Vote className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Your Voting Power</p>
                  <p className="text-2xl font-bold">
                    {votingPower ? (Number(votingPower) / 1e18).toLocaleString(undefined, { maximumFractionDigits: 2 }) : '0'}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Epoch Progress */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Epoch Progress</span>
                <span className="font-medium">{epochProgress.toFixed(1)}%</span>
              </div>
              <Progress value={epochProgress} className="h-2" />
              <p className="text-xs text-muted-foreground">
                Voting is active during the first phase of each epoch (~7 days)
              </p>
            </div>
          </CardContent>
        </Card>

        {!isConnected && (
          <Card className="mb-8 border-blue-500">
            <CardContent className="py-8 text-center">
              <Wallet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">Connect Your Wallet</h3>
              <p className="text-muted-foreground">
                Connect your wallet to vote on gauge weights
              </p>
            </CardContent>
          </Card>
        )}

        {/* Voting Interface */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Allocate Your Votes</CardTitle>
            <CardDescription>
              Distribute your voting power across gauges. Your allocation determines how resources are distributed.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Allocation Summary */}
            <div className="bg-muted p-4 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Total Allocated:</span>
                <span className={`text-lg font-bold ${totalAllocated > 100 ? 'text-red-500' : 'text-primary'}`}>
                  {totalAllocated.toFixed(1)}%
                </span>
              </div>
              <Progress 
                value={Math.min(totalAllocated, 100)} 
                className={`h-2 ${totalAllocated > 100 ? 'bg-red-200' : ''}`}
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>Remaining: {remainingAllocation.toFixed(1)}%</span>
                <span>Max: 100%</span>
              </div>
            </div>

            {/* Gauge List */}
            <div className="space-y-4">
              {gauges.map((gauge) => {
                const gaugeWeight = Number(gauge.weight) / 1e18;
                const totalWeightNum = totalWeight ? Number(totalWeight) / 1e18 : 1;
                const weightPercentage = (gaugeWeight / totalWeightNum) * 100;
                const userAllocation = voteAllocations[gauge.id.toString()] || '';

                return (
                  <Card key={gauge.id.toString()} className="border-2">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{gauge.name}</CardTitle>
                          <CardDescription className="mt-1">{gauge.description}</CardDescription>
                        </div>
                        <Badge variant="outline">{gauge.type}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Current Weight */}
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-muted-foreground">Current Weight:</span>
                          <span className="font-medium">
                            {gaugeWeight.toLocaleString(undefined, { maximumFractionDigits: 0 })} ({weightPercentage.toFixed(1)}%)
                          </span>
                        </div>
                        <Progress value={weightPercentage} className="h-1" />
                      </div>

                      {/* Vote Allocation Input */}
                      <div className="space-y-2">
                        <Label htmlFor={`gauge-${gauge.id}`}>Your Allocation (%)</Label>
                        <div className="flex gap-2">
                          <Input
                            id={`gauge-${gauge.id}`}
                            type="number"
                            placeholder="0"
                            value={userAllocation}
                            onChange={(e) => handleVoteAllocationChange(gauge.id.toString(), e.target.value)}
                            min="0"
                            max="100"
                            step="0.1"
                            disabled={!isConnected || !votingPower || votingPower === 0n}
                          />
                          <Button
                            variant="outline"
                            onClick={() => handleVoteAllocationChange(gauge.id.toString(), remainingAllocation.toFixed(1))}
                            disabled={!isConnected || !votingPower || votingPower === 0n || remainingAllocation <= 0}
                          >
                            Max
                          </Button>
                        </div>
                      </div>

                      {/* Gauge Address */}
                      <div className="text-xs text-muted-foreground">
                        Address: {gauge.address.slice(0, 10)}...{gauge.address.slice(-8)}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <Button
                onClick={handleSubmitVotes}
                disabled={!isConnected || !votingPower || votingPower === 0n || totalAllocated === 0 || totalAllocated > 100 || isVoting}
                className="w-full"
                size="lg"
              >
                <Vote className="mr-2 h-4 w-4" />
                {isVoting ? 'Submitting Votes...' : 'Submit Votes'}
              </Button>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
              <div className="flex gap-2">
                <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium mb-2 text-blue-900 dark:text-blue-100">How Gauge Voting Works:</h4>
                  <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
                    <li>Allocate your voting power across different gauges as percentages</li>
                    <li>Your allocation determines how resources are distributed in the next epoch</li>
                    <li>You can change your votes at any time during the voting phase</li>
                    <li>Voting power is based on your veNFT locks</li>
                    <li>Total allocation must not exceed 100%</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Need Voting Power CTA */}
        {isConnected && (!votingPower || votingPower === 0n) && (
          <Card className="border-yellow-500">
            <CardContent className="py-6 text-center">
              <TrendingUp className="h-12 w-12 mx-auto mb-4 text-yellow-500" />
              <h3 className="text-xl font-semibold mb-2">You Need Voting Power</h3>
              <p className="text-muted-foreground mb-4">
                Lock WFUMA tokens to receive voting power and participate in gauge voting
              </p>
              <Button onClick={() => window.location.href = '/governance/venft'}>
                Get Voting Power
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
