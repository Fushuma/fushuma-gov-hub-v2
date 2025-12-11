/**
 * React hook for fetching governance proposals from the blockchain
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePublicClient } from 'wagmi';
import { parseAbiItem, type Address } from 'viem';
import { FUSHUMA_GOVERNOR_ADDRESS } from './contracts';
import { ProposalState } from './types';

export interface GovernanceProposal {
  id: bigint;
  title: string;
  description: string;
  proposer: string;
  state: ProposalState;
  forVotes: bigint;
  againstVotes: bigint;
  abstainVotes: bigint;
  startBlock: bigint;
  endBlock: bigint;
  createdAt: Date;
  transactionHash: string;
}

// Governor contract ABI for reading proposals
const GovernorABI = [
  {
    type: 'function',
    name: 'state',
    inputs: [{ name: 'proposalId', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'proposalVotes',
    inputs: [{ name: 'proposalId', type: 'uint256' }],
    outputs: [
      { name: 'againstVotes', type: 'uint256' },
      { name: 'forVotes', type: 'uint256' },
      { name: 'abstainVotes', type: 'uint256' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'proposalSnapshot',
    inputs: [{ name: 'proposalId', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'proposalDeadline',
    inputs: [{ name: 'proposalId', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'proposalProposer',
    inputs: [{ name: 'proposalId', type: 'uint256' }],
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
  },
] as const;

/**
 * Parse proposal description to extract title and body
 */
function parseProposalDescription(description: string): { title: string; body: string } {
  const lines = description.split('\n');

  // Check for markdown heading
  if (lines[0]?.startsWith('#')) {
    return {
      title: lines[0].replace(/^#+\s*/, '').trim(),
      body: lines.slice(1).join('\n').trim(),
    };
  }

  // Check for "Title: Body" format
  const colonIndex = description.indexOf(':');
  if (colonIndex > 0 && colonIndex < 100) {
    return {
      title: description.slice(0, colonIndex).trim(),
      body: description.slice(colonIndex + 1).trim(),
    };
  }

  // Just use first 100 chars as title
  return {
    title: description.slice(0, 100) + (description.length > 100 ? '...' : ''),
    body: description,
  };
}

/**
 * Hook to fetch all governance proposals
 */
export function useGovernanceProposals() {
  const publicClient = usePublicClient();
  const [proposals, setProposals] = useState<GovernanceProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchProposals = useCallback(async () => {
    if (!publicClient) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Get the current block
      const currentBlock = await publicClient.getBlockNumber();

      // Start from a reasonable block (e.g., ~90 days ago assuming 12s blocks)
      // For initial deployment, we start from block 1
      const blocksPerDay = (24 * 60 * 60) / 12;
      const startBlock = currentBlock > BigInt(blocksPerDay * 90)
        ? currentBlock - BigInt(blocksPerDay * 90) // Last 90 days
        : BigInt(1);

      console.log(`Fetching proposals from block ${startBlock} to ${currentBlock}`);

      // Fetch ProposalCreated events in batches of 1000 blocks (RPC limit)
      const MAX_BLOCK_RANGE = 1000n;
      const event = parseAbiItem('event ProposalCreated(uint256 proposalId, address proposer, address[] targets, uint256[] values, string[] signatures, bytes[] calldatas, uint256 voteStart, uint256 voteEnd, string description)');

      const logs: Awaited<ReturnType<typeof publicClient.getLogs>>  = [];
      let fromBlock = startBlock;

      while (fromBlock <= currentBlock) {
        const toBlock = fromBlock + MAX_BLOCK_RANGE - 1n > currentBlock
          ? currentBlock
          : fromBlock + MAX_BLOCK_RANGE - 1n;

        const batchLogs = await publicClient.getLogs({
          address: FUSHUMA_GOVERNOR_ADDRESS as Address,
          event,
          fromBlock,
          toBlock,
        });

        logs.push(...batchLogs);
        fromBlock = toBlock + 1n;
      }

      console.log(`Found ${logs.length} proposals`);

      const fetchedProposals: GovernanceProposal[] = [];

      for (const log of logs) {
        try {
          const { proposalId, proposer, voteStart, voteEnd, description } = log.args as {
            proposalId: bigint;
            proposer: Address;
            voteStart: bigint;
            voteEnd: bigint;
            description: string;
          };

          // Get proposal state
          const state = await publicClient.readContract({
            address: FUSHUMA_GOVERNOR_ADDRESS as Address,
            abi: GovernorABI,
            functionName: 'state',
            args: [proposalId],
          }) as number;

          // Get proposal votes
          const votes = await publicClient.readContract({
            address: FUSHUMA_GOVERNOR_ADDRESS as Address,
            abi: GovernorABI,
            functionName: 'proposalVotes',
            args: [proposalId],
          }) as [bigint, bigint, bigint];

          // Get block timestamp for createdAt
          const block = await publicClient.getBlock({ blockNumber: log.blockNumber });
          const createdAt = new Date(Number(block.timestamp) * 1000);

          const { title, body } = parseProposalDescription(description);

          fetchedProposals.push({
            id: proposalId,
            title,
            description: body,
            proposer,
            state: state as ProposalState,
            againstVotes: votes[0],
            forVotes: votes[1],
            abstainVotes: votes[2],
            startBlock: voteStart,
            endBlock: voteEnd,
            createdAt,
            transactionHash: log.transactionHash,
          });
        } catch (eventError) {
          console.error('Error processing proposal:', eventError);
        }
      }

      // Sort by creation date (newest first)
      fetchedProposals.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      setProposals(fetchedProposals);
    } catch (err) {
      console.error('Error fetching proposals:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch proposals'));
    } finally {
      setLoading(false);
    }
  }, [publicClient]);

  useEffect(() => {
    fetchProposals();
  }, [fetchProposals]);

  return {
    proposals,
    loading,
    error,
    refetch: fetchProposals,
  };
}

/**
 * Hook to fetch a single proposal by ID
 */
export function useGovernanceProposal(proposalId: bigint | undefined) {
  const publicClient = usePublicClient();
  const [proposal, setProposal] = useState<GovernanceProposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchProposal = useCallback(async () => {
    if (!publicClient || proposalId === undefined) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Get proposal state
      const state = await publicClient.readContract({
        address: FUSHUMA_GOVERNOR_ADDRESS as Address,
        abi: GovernorABI,
        functionName: 'state',
        args: [proposalId],
      }) as number;

      // Get proposal votes
      const votes = await publicClient.readContract({
        address: FUSHUMA_GOVERNOR_ADDRESS as Address,
        abi: GovernorABI,
        functionName: 'proposalVotes',
        args: [proposalId],
      }) as [bigint, bigint, bigint];

      // Get proposal snapshot (start block)
      const startBlock = await publicClient.readContract({
        address: FUSHUMA_GOVERNOR_ADDRESS as Address,
        abi: GovernorABI,
        functionName: 'proposalSnapshot',
        args: [proposalId],
      }) as bigint;

      // Get proposal deadline (end block)
      const endBlock = await publicClient.readContract({
        address: FUSHUMA_GOVERNOR_ADDRESS as Address,
        abi: GovernorABI,
        functionName: 'proposalDeadline',
        args: [proposalId],
      }) as bigint;

      // Get proposer
      const proposer = await publicClient.readContract({
        address: FUSHUMA_GOVERNOR_ADDRESS as Address,
        abi: GovernorABI,
        functionName: 'proposalProposer',
        args: [proposalId],
      }) as Address;

      setProposal({
        id: proposalId,
        title: `Proposal #${proposalId.toString()}`,
        description: '',
        proposer,
        state: state as ProposalState,
        againstVotes: votes[0],
        forVotes: votes[1],
        abstainVotes: votes[2],
        startBlock,
        endBlock,
        createdAt: new Date(),
        transactionHash: '',
      });
    } catch (err) {
      console.error('Error fetching proposal:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch proposal'));
    } finally {
      setLoading(false);
    }
  }, [publicClient, proposalId]);

  useEffect(() => {
    fetchProposal();
  }, [fetchProposal]);

  return {
    proposal,
    loading,
    error,
    refetch: fetchProposal,
  };
}
