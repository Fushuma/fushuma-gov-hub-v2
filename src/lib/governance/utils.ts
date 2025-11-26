/**
 * Governance Utility Functions
 */

import { Address, keccak256, encodeAbiParameters, parseAbiParameters } from 'viem';
import { GOVERNANCE_PARAMS } from './contracts';
import { ProposalState, VoteType } from './types';

/**
 * Calculate voting power multiplier based on lock duration
 * @param lockDuration Duration in seconds
 * @returns Multiplier (1x to 4x)
 */
export function calculateVotingMultiplier(lockDuration: number): number {
  const maxDuration = GOVERNANCE_PARAMS.VotingEscrow.maxLockDuration;
  const maxMultiplier = GOVERNANCE_PARAMS.VotingEscrow.maxMultiplier;
  
  if (lockDuration >= maxDuration) {
    return maxMultiplier;
  }
  
  // Linear scaling: 1x at 0 duration, 4x at max duration
  return 1 + ((maxMultiplier - 1) * lockDuration) / maxDuration;
}

/**
 * Calculate expected voting power for a lock
 * @param amount Amount of WFUMA to lock (in wei)
 * @param lockDuration Duration in seconds
 * @returns Expected voting power (in wei)
 */
export function calculateExpectedVotingPower(
  amount: bigint,
  lockDuration: number
): bigint {
  const multiplier = calculateVotingMultiplier(lockDuration);
  return (amount * BigInt(Math.floor(multiplier * 100))) / 100n;
}

/**
 * Check if a lock duration is valid
 * @param duration Duration in seconds
 * @returns True if valid
 */
export function isValidLockDuration(duration: number): boolean {
  const warmup = GOVERNANCE_PARAMS.VotingEscrow.warmupPeriod;
  const maxDuration = GOVERNANCE_PARAMS.VotingEscrow.maxLockDuration;
  return duration >= warmup && duration <= maxDuration;
}

/**
 * Check if an amount meets the minimum deposit requirement
 * @param amount Amount in wei
 * @returns True if valid
 */
export function meetsMinimumDeposit(amount: bigint): boolean {
  const minDeposit = BigInt(GOVERNANCE_PARAMS.VotingEscrow.minDeposit);
  return amount >= minDeposit;
}

/**
 * Calculate time until lock expiry
 * @param lockEnd Lock end timestamp
 * @returns Seconds until expiry (0 if already expired)
 */
export function getTimeUntilExpiry(lockEnd: bigint): number {
  const now = Math.floor(Date.now() / 1000);
  const expiry = Number(lockEnd);
  return Math.max(0, expiry - now);
}

/**
 * Check if a lock has expired
 * @param lockEnd Lock end timestamp
 * @returns True if expired
 */
export function isLockExpired(lockEnd: bigint): boolean {
  return getTimeUntilExpiry(lockEnd) === 0;
}

/**
 * Format lock duration for display
 * @param seconds Duration in seconds
 * @returns Formatted string (e.g., "7 days", "3 months")
 */
export function formatLockDuration(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  
  if (days === 0) {
    const hours = Math.floor(seconds / 3600);
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  }
  
  if (days < 30) {
    return `${days} day${days !== 1 ? 's' : ''}`;
  }
  
  const months = Math.floor(days / 30);
  if (months < 12) {
    return `${months} month${months !== 1 ? 's' : ''}`;
  }
  
  const years = Math.floor(months / 12);
  return `${years} year${years !== 1 ? 's' : ''}`;
}

/**
 * Format timestamp for display
 * @param timestamp Unix timestamp
 * @returns Formatted date string
 */
export function formatTimestamp(timestamp: bigint): string {
  const date = new Date(Number(timestamp) * 1000);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Check if proposal can be voted on
 * @param state Proposal state
 * @returns True if voting is allowed
 */
export function canVoteOnProposal(state: ProposalState): boolean {
  return state === ProposalState.Active;
}

/**
 * Check if proposal can be executed
 * @param state Proposal state
 * @returns True if execution is allowed
 */
export function canExecuteProposal(state: ProposalState): boolean {
  return state === ProposalState.Queued;
}

/**
 * Check if proposal can be queued
 * @param state Proposal state
 * @returns True if queueing is allowed
 */
export function canQueueProposal(state: ProposalState): boolean {
  return state === ProposalState.Succeeded;
}

/**
 * Check if proposal can be canceled
 * @param state Proposal state
 * @returns True if cancellation is allowed
 */
export function canCancelProposal(state: ProposalState): boolean {
  return (
    state === ProposalState.Pending ||
    state === ProposalState.Active ||
    state === ProposalState.Succeeded ||
    state === ProposalState.Queued
  );
}

/**
 * Get proposal state color for UI
 * @param state Proposal state
 * @returns Tailwind color class
 */
export function getProposalStateColor(state: ProposalState): string {
  const colors: Record<ProposalState, string> = {
    [ProposalState.Pending]: 'text-gray-500',
    [ProposalState.Active]: 'text-blue-500',
    [ProposalState.Canceled]: 'text-red-500',
    [ProposalState.Defeated]: 'text-red-500',
    [ProposalState.Succeeded]: 'text-green-500',
    [ProposalState.Queued]: 'text-yellow-500',
    [ProposalState.Expired]: 'text-gray-500',
    [ProposalState.Executed]: 'text-green-600',
  };
  return colors[state] || 'text-gray-500';
}

/**
 * Calculate proposal progress percentage
 * @param forVotes Votes in favor
 * @param againstVotes Votes against
 * @param abstainVotes Abstain votes
 * @returns Object with percentages for each vote type
 */
export function calculateProposalProgress(
  forVotes: bigint,
  againstVotes: bigint,
  abstainVotes: bigint
): { for: number; against: number; abstain: number } {
  const total = forVotes + againstVotes + abstainVotes;
  
  if (total === 0n) {
    return { for: 0, against: 0, abstain: 0 };
  }
  
  return {
    for: Number((forVotes * 10000n) / total) / 100,
    against: Number((againstVotes * 10000n) / total) / 100,
    abstain: Number((abstainVotes * 10000n) / total) / 100,
  };
}

/**
 * Check if quorum is reached
 * @param totalVotes Total votes cast
 * @param quorum Required quorum
 * @returns True if quorum is reached
 */
export function isQuorumReached(totalVotes: bigint, quorum: bigint): boolean {
  return totalVotes >= quorum;
}

/**
 * Calculate blocks until proposal ends
 * @param endBlock Proposal end block
 * @param currentBlock Current block number
 * @returns Blocks remaining (0 if ended)
 */
export function getBlocksUntilEnd(
  endBlock: bigint,
  currentBlock: bigint
): bigint {
  return endBlock > currentBlock ? endBlock - currentBlock : 0n;
}

/**
 * Estimate time until proposal ends
 * @param endBlock Proposal end block
 * @param currentBlock Current block number
 * @param blockTime Average block time in seconds (default: 12)
 * @returns Estimated seconds until end
 */
export function estimateTimeUntilEnd(
  endBlock: bigint,
  currentBlock: bigint,
  blockTime: number = 12
): number {
  const blocksRemaining = getBlocksUntilEnd(endBlock, currentBlock);
  return Number(blocksRemaining) * blockTime;
}

/**
 * Get current epoch phase label
 * @param phase Phase number (0: Voting, 1: Distribution, 2: Preparation)
 * @returns Phase label
 */
export function getEpochPhaseLabel(phase: number): string {
  const labels = ['Voting', 'Distribution', 'Preparation'];
  return labels[phase] || 'Unknown';
}

/**
 * Calculate epoch progress
 * @param startTime Epoch start timestamp
 * @param duration Epoch duration in seconds
 * @returns Progress percentage (0-100)
 */
export function calculateEpochProgress(
  startTime: bigint,
  duration: number
): number {
  const now = Math.floor(Date.now() / 1000);
  const start = Number(startTime);
  const elapsed = now - start;
  
  if (elapsed <= 0) return 0;
  if (elapsed >= duration) return 100;
  
  return (elapsed / duration) * 100;
}

/**
 * Shorten address for display
 * @param address Ethereum address
 * @param chars Number of characters to show on each side (default: 4)
 * @returns Shortened address (e.g., "0x1234...5678")
 */
export function shortenAddress(address: Address, chars: number = 4): string {
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

/**
 * Format large numbers with suffixes (K, M, B)
 * @param value Number to format
 * @returns Formatted string
 */
export function formatLargeNumber(value: number): string {
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(2)}B`;
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(2)}K`;
  }
  return value.toFixed(2);
}

/**
 * Validate Ethereum address
 * @param address Address to validate
 * @returns True if valid
 */
export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Parse proposal description to extract title and body
 * @param description Full proposal description
 * @returns Object with title and body
 */
export function parseProposalDescription(description: string): {
  title: string;
  body: string;
} {
  const lines = description.split('\n');
  const title = lines[0] || 'Untitled Proposal';
  const body = lines.slice(1).join('\n').trim();
  
  return { title, body };
}

/**
 * Generate proposal ID from parameters
 * This matches the OpenZeppelin Governor proposalId calculation:
 * uint256(keccak256(abi.encode(targets, values, calldatas, keccak256(bytes(description)))))
 *
 * @param targets Target addresses
 * @param values Values to send
 * @param calldatas Calldata for each call
 * @param description Proposal description
 * @returns Proposal ID (keccak256 hash as hex string)
 */
export function generateProposalId(
  targets: Address[],
  values: bigint[],
  calldatas: `0x${string}`[],
  description: string
): `0x${string}` {
  // Hash the description first (keccak256(bytes(description)))
  const descriptionHash = keccak256(new TextEncoder().encode(description) as unknown as `0x${string}`);

  // Encode the parameters: (address[], uint256[], bytes[], bytes32)
  const encoded = encodeAbiParameters(
    parseAbiParameters('address[], uint256[], bytes[], bytes32'),
    [targets, values, calldatas, descriptionHash]
  );

  // Return the keccak256 hash of the encoded data
  return keccak256(encoded);
}

/**
 * Generate description hash for proposal
 * Used when queueing or executing a proposal
 * @param description Proposal description
 * @returns Description hash
 */
export function hashProposalDescription(description: string): `0x${string}` {
  return keccak256(new TextEncoder().encode(description) as unknown as `0x${string}`);
}
