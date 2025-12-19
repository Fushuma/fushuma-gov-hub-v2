'use client';

import { useState, useEffect, useMemo } from 'react';
import { Navigation } from '@/components/layout/Navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, Calendar, Wallet, Vote, Info, Loader2 } from 'lucide-react';
import { useAccount, useReadContracts } from 'wagmi';
import { toast } from 'sonner';
import {
  useTotalVotingPower,
  useCurrentEpoch,
  useEpochPhase,
  useTotalGaugeWeight,
  useVoteForGaugeWeights,
  useGaugeCount,
  useActiveGauges,
  getEpochPhaseLabel,
  calculateEpochProgress,
  GAUGE_CONTROLLER_ADDRESS,
  GaugeControllerAbi,
  GOVERNANCE_PARAMS,
} from '@/lib/governance';
import type { Address } from 'viem';

// Gauge type definitions
interface Gauge {
  id: bigint;
  name: string;
  description: string;
  address: string;
  type: string;
  weight: bigint;
  isActive: boolean;
}

// Gauge type mappings
const GAUGE_TYPE_NAMES: Record<number, string> = {
  0: 'Grant',
  1: 'DeFi',
  2: 'Development',
  3: 'Community',
};

const GAUGE_DESCRIPTIONS: Record<string, string> = {
  '0x0D6833778cf1fa803D21075b800483F68f57A153': 'Distributes WFUMA to approved grant projects',
};

export default function GaugesPage() {
  const { address, isConnected } = useAccount();

  // Contract hooks
  const { data: votingPower } = useTotalVotingPower(address);
  const { data: currentEpoch } = useCurrentEpoch();
  const { data: epochPhase } = useEpochPhase();
  const { data: totalWeight, isLoading: isLoadingWeight } = useTotalGaugeWeight();
  const { writeContract: voteForGauges, isPending: isVoting } = useVoteForGaugeWeights();
  const { data: gaugeCount, isLoading: isLoadingCount } = useGaugeCount();
  const { data: activeGaugeIds, isLoading: isLoadingActive } = useActiveGauges();

  // Local state
  const [voteAllocations, setVoteAllocations] = useState<Record<string, string>>({});

  // Build contracts array to fetch all gauge info
  const gaugeContracts = useMemo(() => {
    if (!gaugeCount || gaugeCount === 0n) return [];

    const contracts = [];
    for (let i = 0n; i < (typeof gaugeCount === 'bigint' ? gaugeCount : 0n); i++) {
      contracts.push({
        address: GAUGE_CONTROLLER_ADDRESS as Address,
        abi: GaugeControllerAbi,
        functionName: 'gauges',
        args: [i],
      });
      contracts.push({
        address: GAUGE_CONTROLLER_ADDRESS as Address,
        abi: GaugeControllerAbi,
        functionName: 'getGaugeWeight',
        args: [i],
      });
    }
    return contracts;
  }, [gaugeCount]);

  // Fetch all gauge data in one call
  const { data: gaugeData, isLoading: isLoadingGauges } = useReadContracts({
    contracts: gaugeContracts as any,
    query: {
      enabled: gaugeContracts.length > 0,
    },
  });

  // Process gauge data into usable format
  const gauges: Gauge[] = useMemo(() => {
    if (!gaugeData || !gaugeCount) return [];

    const processedGauges: Gauge[] = [];
    const count = Number(gaugeCount);

    for (let i = 0; i < count; i++) {
      const gaugeIndex = i * 2;
      const weightIndex = i * 2 + 1;

      const gaugeResult = gaugeData[gaugeIndex];
      const weightResult = gaugeData[weightIndex];

      if (gaugeResult?.status === 'success' && weightResult?.status === 'success') {
        const gauge = gaugeResult.result as any;
        const weight = weightResult.result as bigint;

        processedGauges.push({
          id: BigInt(i),
          name: gauge.name || `Gauge ${i}`,
          description: GAUGE_DESCRIPTIONS[gauge.gaugeAddress] || `Gauge for ${GAUGE_TYPE_NAMES[gauge.gaugeType] || 'General'} allocation`,
          address: gauge.gaugeAddress,
          type: GAUGE_TYPE_NAMES[gauge.gaugeType] || 'General',
          weight: weight,
          isActive: gauge.isActive,
        });
      }
    }

    return processedGauges;
  }, [gaugeData, gaugeCount]);

  const isLoadingData = isLoadingCount || isLoadingActive || isLoadingGauges || isLoadingWeight;

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
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to submit votes';
      toast.error(errorMessage);
    }
  };

  // Check if we're in voting phase (phase 0)
  const isVotingPhase = epochPhase !== undefined && Number(epochPhase) === 0;
  const canVote = isConnected && votingPower && votingPower > 0n && isVotingPhase;

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
              {isLoadingData ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">Loading gauges...</span>
                </div>
              ) : gauges.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="py-12 text-center">
                    <Vote className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">No Gauges Available</h3>
                    <p className="text-muted-foreground">
                      No gauges have been added to the controller yet.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                gauges.filter(g => g.isActive).map((gauge) => {
                  const gaugeWeight = Number(gauge.weight) / 1e18;
                  const totalWeightNum = totalWeight ? Number(totalWeight) / 1e18 : 1;
                  const weightPercentage = totalWeightNum > 0 ? (gaugeWeight / totalWeightNum) * 100 : 0;
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
                              disabled={!canVote}
                            />
                            <Button
                              variant="outline"
                              onClick={() => handleVoteAllocationChange(gauge.id.toString(), remainingAllocation.toFixed(1))}
                              disabled={!canVote || remainingAllocation <= 0}
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
                })
              )}
            </div>

            {/* Voting Phase Warning */}
            {isConnected && votingPower && votingPower > 0n && !isVotingPhase && (
              <div className="bg-yellow-50 dark:bg-yellow-950 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <div className="flex gap-2 items-center">
                  <Info className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    Voting is only available during the voting phase. Current phase: {epochPhase !== undefined ? getEpochPhaseLabel(Number(epochPhase)) : 'Unknown'}
                  </p>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-4">
              <Button
                onClick={handleSubmitVotes}
                disabled={!canVote || totalAllocated === 0 || totalAllocated > 100 || isVoting}
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
