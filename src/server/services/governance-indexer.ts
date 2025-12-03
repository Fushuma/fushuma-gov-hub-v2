/**
 * Governance Indexer Service
 *
 * Indexes governance proposals from the FushumaGovernor contract
 * and syncs them to the database for faster queries.
 */

import { createPublicClient, http, parseAbiItem, type Address, type Log } from 'viem';
import { defineChain } from 'viem';
import { db } from '@/db';
import { proposals, blockchainEvents, indexerState } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { FushumaGovernorAbi } from '@/lib/governance/abis';
import { FUSHUMA_GOVERNOR_ADDRESS } from '@/lib/governance/contracts';

// Define Fushuma chain
const fushuma = defineChain({
  id: 121224,
  name: 'Fushuma',
  network: 'fushuma',
  nativeCurrency: {
    decimals: 18,
    name: 'FUMA',
    symbol: 'FUMA',
  },
  rpcUrls: {
    default: {
      http: [process.env.NEXT_PUBLIC_FUSHUMA_RPC_URL || 'https://rpc.fushuma.com'],
    },
    public: {
      http: ['https://rpc.fushuma.com'],
    },
  },
});

// Create public client for reading blockchain data
const publicClient = createPublicClient({
  chain: fushuma,
  transport: http(),
});

// Proposal states from the Governor contract
export enum ProposalState {
  Pending = 0,
  Active = 1,
  Canceled = 2,
  Defeated = 3,
  Succeeded = 4,
  Queued = 5,
  Expired = 6,
  Executed = 7,
}

// Map contract state to database status
function mapStateToStatus(state: ProposalState): 'pending' | 'active' | 'passed' | 'rejected' | 'executed' | 'cancelled' {
  switch (state) {
    case ProposalState.Pending:
      return 'pending';
    case ProposalState.Active:
      return 'active';
    case ProposalState.Succeeded:
    case ProposalState.Queued:
      return 'passed';
    case ProposalState.Defeated:
    case ProposalState.Expired:
      return 'rejected';
    case ProposalState.Executed:
      return 'executed';
    case ProposalState.Canceled:
      return 'cancelled';
    default:
      return 'pending';
  }
}

// ABI for governor events and functions
const GovernorABI = [
  {
    type: 'event',
    name: 'ProposalCreated',
    inputs: [
      { indexed: false, name: 'proposalId', type: 'uint256' },
      { indexed: false, name: 'proposer', type: 'address' },
      { indexed: false, name: 'targets', type: 'address[]' },
      { indexed: false, name: 'values', type: 'uint256[]' },
      { indexed: false, name: 'signatures', type: 'string[]' },
      { indexed: false, name: 'calldatas', type: 'bytes[]' },
      { indexed: false, name: 'voteStart', type: 'uint256' },
      { indexed: false, name: 'voteEnd', type: 'uint256' },
      { indexed: false, name: 'description', type: 'string' },
    ],
  },
  {
    type: 'event',
    name: 'VoteCast',
    inputs: [
      { indexed: true, name: 'voter', type: 'address' },
      { indexed: false, name: 'proposalId', type: 'uint256' },
      { indexed: false, name: 'support', type: 'uint8' },
      { indexed: false, name: 'weight', type: 'uint256' },
      { indexed: false, name: 'reason', type: 'string' },
    ],
  },
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
    name: 'quorum',
    inputs: [{ name: 'timepoint', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
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

export interface OnChainProposal {
  id: bigint;
  proposer: string;
  title: string;
  description: string;
  state: ProposalState;
  forVotes: bigint;
  againstVotes: bigint;
  abstainVotes: bigint;
  startBlock: bigint;
  endBlock: bigint;
  quorum: bigint;
  createdAt: Date;
  transactionHash: string;
}

/**
 * Get the last processed block for the governor contract
 */
async function getLastProcessedBlock(): Promise<number> {
  try {
    const [state] = await db
      .select()
      .from(indexerState)
      .where(eq(indexerState.contractAddress, FUSHUMA_GOVERNOR_ADDRESS.toLowerCase()))
      .limit(1);

    return state?.lastProcessedBlock || 0;
  } catch (error) {
    console.error('Error getting last processed block:', error);
    return 0;
  }
}

/**
 * Update the last processed block
 */
async function updateLastProcessedBlock(blockNumber: number): Promise<void> {
  try {
    await db
      .insert(indexerState)
      .values({
        contractAddress: FUSHUMA_GOVERNOR_ADDRESS.toLowerCase(),
        lastProcessedBlock: blockNumber,
      })
      .onDuplicateKeyUpdate({
        set: { lastProcessedBlock: blockNumber },
      });
  } catch (error) {
    console.error('Error updating last processed block:', error);
  }
}

/**
 * Parse proposal description to extract title
 */
function parseProposalDescription(description: string): { title: string; body: string } {
  // Common formats: "# Title\n\nBody" or "Title: Body" or just "Body"
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
 * Fetch proposal details from the contract
 */
export async function getProposalFromContract(proposalId: bigint): Promise<OnChainProposal | null> {
  try {
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

    // Get quorum at snapshot
    const quorum = await publicClient.readContract({
      address: FUSHUMA_GOVERNOR_ADDRESS as Address,
      abi: GovernorABI,
      functionName: 'quorum',
      args: [startBlock],
    }) as bigint;

    return {
      id: proposalId,
      proposer,
      title: `Proposal #${proposalId.toString()}`,
      description: '',
      state: state as ProposalState,
      againstVotes: votes[0],
      forVotes: votes[1],
      abstainVotes: votes[2],
      startBlock,
      endBlock,
      quorum,
      createdAt: new Date(),
      transactionHash: '',
    };
  } catch (error) {
    console.error(`Error fetching proposal ${proposalId}:`, error);
    return null;
  }
}

/**
 * Index new proposals from ProposalCreated events
 */
export async function indexProposals(fromBlock?: number): Promise<OnChainProposal[]> {
  try {
    const startBlock = fromBlock ?? await getLastProcessedBlock();
    const currentBlock = await publicClient.getBlockNumber();

    console.log(`Indexing proposals from block ${startBlock} to ${currentBlock}`);

    // If start block is 0, start from a reasonable point (e.g., contract deployment)
    const fromBlockNumber = startBlock === 0 ? BigInt(1) : BigInt(startBlock);

    // Fetch ProposalCreated events
    const logs = await publicClient.getLogs({
      address: FUSHUMA_GOVERNOR_ADDRESS as Address,
      event: parseAbiItem('event ProposalCreated(uint256 proposalId, address proposer, address[] targets, uint256[] values, string[] signatures, bytes[] calldatas, uint256 voteStart, uint256 voteEnd, string description)'),
      fromBlock: fromBlockNumber,
      toBlock: currentBlock,
    });

    console.log(`Found ${logs.length} ProposalCreated events`);

    const indexedProposals: OnChainProposal[] = [];

    for (const log of logs) {
      try {
        const { proposalId, proposer, voteStart, voteEnd, description } = log.args as {
          proposalId: bigint;
          proposer: Address;
          voteStart: bigint;
          voteEnd: bigint;
          description: string;
        };

        // Get current proposal state and votes
        const proposalDetails = await getProposalFromContract(proposalId);
        if (!proposalDetails) continue;

        const { title, body } = parseProposalDescription(description);

        const proposal: OnChainProposal = {
          ...proposalDetails,
          title,
          description: body,
          proposer,
          startBlock: voteStart,
          endBlock: voteEnd,
          transactionHash: log.transactionHash,
          createdAt: new Date(), // Would need to get block timestamp for accuracy
        };

        indexedProposals.push(proposal);

        // Store in database
        await syncProposalToDatabase(proposal);

        // Store raw event
        await db.insert(blockchainEvents).values({
          eventType: 'ProposalCreated',
          contractAddress: FUSHUMA_GOVERNOR_ADDRESS.toLowerCase(),
          blockNumber: Number(log.blockNumber),
          transactionHash: log.transactionHash,
          eventData: {
            proposalId: proposalId.toString(),
            proposer,
            description,
            voteStart: voteStart.toString(),
            voteEnd: voteEnd.toString(),
          },
        });
      } catch (eventError) {
        console.error('Error processing proposal event:', eventError);
      }
    }

    // Update last processed block
    await updateLastProcessedBlock(Number(currentBlock));

    return indexedProposals;
  } catch (error) {
    console.error('Error indexing proposals:', error);
    return [];
  }
}

/**
 * Sync a proposal to the database
 */
async function syncProposalToDatabase(proposal: OnChainProposal): Promise<void> {
  try {
    // Calculate dates from blocks (assuming ~12s per block)
    const currentBlock = await publicClient.getBlockNumber();
    const blocksUntilStart = Number(proposal.startBlock) - Number(currentBlock);
    const blocksUntilEnd = Number(proposal.endBlock) - Number(currentBlock);

    const startDate = new Date(Date.now() + blocksUntilStart * 12000);
    const endDate = new Date(Date.now() + blocksUntilEnd * 12000);

    // Check if proposal already exists
    const [existing] = await db
      .select()
      .from(proposals)
      .where(eq(proposals.proposalId, Number(proposal.id)))
      .limit(1);

    if (existing) {
      // Update existing proposal
      await db
        .update(proposals)
        .set({
          status: mapStateToStatus(proposal.state),
          votesFor: Number(proposal.forVotes / BigInt(10 ** 18)),
          votesAgainst: Number(proposal.againstVotes / BigInt(10 ** 18)),
          votesAbstain: Number(proposal.abstainVotes / BigInt(10 ** 18)),
          totalVotes: Number((proposal.forVotes + proposal.againstVotes + proposal.abstainVotes) / BigInt(10 ** 18)),
        })
        .where(eq(proposals.id, existing.id));
    } else {
      // Insert new proposal
      await db.insert(proposals).values({
        title: proposal.title,
        description: proposal.description,
        proposer: proposal.proposer,
        status: mapStateToStatus(proposal.state),
        votesFor: Number(proposal.forVotes / BigInt(10 ** 18)),
        votesAgainst: Number(proposal.againstVotes / BigInt(10 ** 18)),
        votesAbstain: Number(proposal.abstainVotes / BigInt(10 ** 18)),
        totalVotes: Number((proposal.forVotes + proposal.againstVotes + proposal.abstainVotes) / BigInt(10 ** 18)),
        quorum: Number(proposal.quorum / BigInt(10 ** 18)),
        startDate,
        endDate,
        transactionHash: proposal.transactionHash,
        contractAddress: FUSHUMA_GOVERNOR_ADDRESS,
        proposalId: Number(proposal.id),
      });
    }
  } catch (error) {
    console.error('Error syncing proposal to database:', error);
  }
}

/**
 * Update all proposal states (for active proposals)
 */
export async function updateProposalStates(): Promise<void> {
  try {
    // Get all non-finalized proposals from database
    const activeProposals = await db
      .select()
      .from(proposals)
      .where(
        sql`${proposals.status} IN ('pending', 'active')`
      );

    for (const dbProposal of activeProposals) {
      if (!dbProposal.proposalId) continue;

      const onChainProposal = await getProposalFromContract(BigInt(dbProposal.proposalId));
      if (!onChainProposal) continue;

      await db
        .update(proposals)
        .set({
          status: mapStateToStatus(onChainProposal.state),
          votesFor: Number(onChainProposal.forVotes / BigInt(10 ** 18)),
          votesAgainst: Number(onChainProposal.againstVotes / BigInt(10 ** 18)),
          votesAbstain: Number(onChainProposal.abstainVotes / BigInt(10 ** 18)),
          totalVotes: Number((onChainProposal.forVotes + onChainProposal.againstVotes + onChainProposal.abstainVotes) / BigInt(10 ** 18)),
        })
        .where(eq(proposals.id, dbProposal.id));
    }
  } catch (error) {
    console.error('Error updating proposal states:', error);
  }
}

/**
 * Get all proposals from both blockchain and database
 */
export async function getAllProposals(): Promise<OnChainProposal[]> {
  // First try to index any new proposals
  await indexProposals();

  // Then fetch all from database
  const dbProposals = await db
    .select()
    .from(proposals)
    .orderBy(sql`${proposals.createdAt} DESC`);

  return dbProposals.map(p => ({
    id: BigInt(p.proposalId || 0),
    proposer: p.proposer,
    title: p.title,
    description: p.description,
    state: dbStatusToState(p.status),
    forVotes: BigInt(p.votesFor || 0) * BigInt(10 ** 18),
    againstVotes: BigInt(p.votesAgainst || 0) * BigInt(10 ** 18),
    abstainVotes: BigInt(p.votesAbstain || 0) * BigInt(10 ** 18),
    startBlock: BigInt(0),
    endBlock: BigInt(0),
    quorum: BigInt(p.quorum || 0) * BigInt(10 ** 18),
    createdAt: p.createdAt,
    transactionHash: p.transactionHash || '',
  }));
}

function dbStatusToState(status: string): ProposalState {
  switch (status) {
    case 'pending': return ProposalState.Pending;
    case 'active': return ProposalState.Active;
    case 'passed': return ProposalState.Succeeded;
    case 'rejected': return ProposalState.Defeated;
    case 'executed': return ProposalState.Executed;
    case 'cancelled': return ProposalState.Canceled;
    default: return ProposalState.Pending;
  }
}
