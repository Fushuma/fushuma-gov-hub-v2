/**
 * React Hooks for Fushuma Governance Contracts
 */

import { useReadContract, useWriteContract, useWatchContractEvent } from 'wagmi';
import { Address, formatUnits, parseUnits } from 'viem';
import {
  GOVERNANCE_CONTRACTS,
  WFUMA_ADDRESS,
  VOTING_ESCROW_ADDRESS,
  EPOCH_MANAGER_ADDRESS,
  GOVERNANCE_COUNCIL_ADDRESS,
  FUSHUMA_GOVERNOR_ADDRESS,
  GAUGE_CONTROLLER_ADDRESS,
} from './contracts';
import {
  VotingEscrowAbi,
  EpochManagerAbi,
  GovernanceCouncilAbi,
  FushumaGovernorAbi,
  GaugeControllerAbi,
  GrantGaugeAbi,
  WFUMAAbi,
} from './abis';
import { ProposalState, VoteType } from './types';

// ============================================================================
// WFUMA Token Hooks
// ============================================================================

/**
 * Get WFUMA balance for an address
 */
export function useWFUMABalance(address?: Address) {
  return useReadContract({
    address: WFUMA_ADDRESS as Address,
    abi: WFUMAAbi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });
}

/**
 * Get WFUMA allowance for VotingEscrow
 */
export function useWFUMAAllowance(owner?: Address) {
  return useReadContract({
    address: WFUMA_ADDRESS as Address,
    abi: WFUMAAbi,
    functionName: 'allowance',
    args: owner ? [owner, VOTING_ESCROW_ADDRESS as Address] : undefined,
    query: {
      enabled: !!owner,
    },
  });
}

/**
 * Approve WFUMA for VotingEscrow
 */
export function useApproveWFUMA() {
  return useWriteContract();
}

// ============================================================================
// VotingEscrow (veNFT) Hooks
// ============================================================================

/**
 * Get user's veNFT balance
 */
export function useVeNFTBalance(address?: Address) {
  return useReadContract({
    address: VOTING_ESCROW_ADDRESS as Address,
    abi: VotingEscrowAbi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });
}

/**
 * Get veNFT details by token ID
 */
export function useVeNFTDetails(tokenId?: bigint) {
  return useReadContract({
    address: VOTING_ESCROW_ADDRESS as Address,
    abi: VotingEscrowAbi,
    functionName: 'locked',
    args: tokenId !== undefined ? [tokenId] : undefined,
    query: {
      enabled: tokenId !== undefined,
    },
  });
}

/**
 * Get voting power for a veNFT
 */
export function useVotingPower(tokenId?: bigint) {
  return useReadContract({
    address: VOTING_ESCROW_ADDRESS as Address,
    abi: VotingEscrowAbi,
    functionName: 'votingPower',
    args: tokenId !== undefined ? [tokenId] : undefined,
    query: {
      enabled: tokenId !== undefined,
    },
  });
}

/**
 * Get total voting power for an address
 */
export function useTotalVotingPower(address?: Address) {
  return useReadContract({
    address: VOTING_ESCROW_ADDRESS as Address,
    abi: VotingEscrowAbi,
    functionName: 'getTotalVotingPower',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });
}

/**
 * Create a new veNFT lock
 */
export function useCreateLock() {
  return useWriteContract();
}

/**
 * Increase lock amount for a veNFT
 */
export function useIncreaseAmount() {
  return useWriteContract();
}

/**
 * Start exit queue (initiate cooldown for withdrawal)
 */
export function useStartExit() {
  return useWriteContract();
}

/**
 * Complete exit and withdraw tokens after cooldown
 */
export function useCompleteExit() {
  return useWriteContract();
}

/**
 * Check if a token is in exit queue
 */
export function useInExitQueue(tokenId?: bigint) {
  return useReadContract({
    address: VOTING_ESCROW_ADDRESS as Address,
    abi: VotingEscrowAbi,
    functionName: 'inExitQueue',
    args: tokenId !== undefined ? [tokenId] : undefined,
    query: {
      enabled: tokenId !== undefined,
    },
  });
}

/**
 * Get exit queue time for a token
 */
export function useExitQueueTime(tokenId?: bigint) {
  return useReadContract({
    address: VOTING_ESCROW_ADDRESS as Address,
    abi: VotingEscrowAbi,
    functionName: 'exitQueueTime',
    args: tokenId !== undefined ? [tokenId] : undefined,
    query: {
      enabled: tokenId !== undefined,
    },
  });
}

/**
 * Get all token IDs owned by an address
 */
export function useTokensOfOwner(owner?: Address) {
  return useReadContract({
    address: VOTING_ESCROW_ADDRESS as Address,
    abi: VotingEscrowAbi,
    functionName: 'tokensOfOwner',
    args: owner ? [owner] : undefined,
    query: {
      enabled: !!owner,
    },
  });
}

/**
 * Get locked balance for a token
 */
export function useLockedBalance(tokenId?: bigint) {
  return useReadContract({
    address: VOTING_ESCROW_ADDRESS as Address,
    abi: VotingEscrowAbi,
    functionName: 'getLockedBalance',
    args: tokenId !== undefined ? [tokenId] : undefined,
    query: {
      enabled: tokenId !== undefined,
    },
  });
}

// ============================================================================
// EpochManager Hooks
// ============================================================================

/**
 * Get current epoch
 */
export function useCurrentEpoch() {
  return useReadContract({
    address: EPOCH_MANAGER_ADDRESS as Address,
    abi: EpochManagerAbi,
    functionName: 'currentEpoch',
  });
}

/**
 * Get epoch details
 */
export function useEpochDetails(epochId?: bigint) {
  return useReadContract({
    address: EPOCH_MANAGER_ADDRESS as Address,
    abi: EpochManagerAbi,
    functionName: 'getEpoch',
    args: epochId !== undefined ? [epochId] : undefined,
    query: {
      enabled: epochId !== undefined,
    },
  });
}

/**
 * Get current epoch phase
 */
export function useEpochPhase() {
  return useReadContract({
    address: EPOCH_MANAGER_ADDRESS as Address,
    abi: EpochManagerAbi,
    functionName: 'getCurrentPhase',
  });
}

// ============================================================================
// FushumaGovernor Hooks
// ============================================================================

/**
 * Get proposal details
 */
export function useProposal(proposalId?: bigint) {
  return useReadContract({
    address: FUSHUMA_GOVERNOR_ADDRESS as Address,
    abi: FushumaGovernorAbi,
    functionName: 'getProposal',
    args: proposalId !== undefined ? [proposalId] : undefined,
    query: {
      enabled: proposalId !== undefined,
    },
  });
}

/**
 * Get proposal state
 */
export function useProposalState(proposalId?: bigint) {
  return useReadContract({
    address: FUSHUMA_GOVERNOR_ADDRESS as Address,
    abi: FushumaGovernorAbi,
    functionName: 'state',
    args: proposalId !== undefined ? [proposalId] : undefined,
    query: {
      enabled: proposalId !== undefined,
    },
  });
}

/**
 * Get proposal votes
 */
export function useProposalVotes(proposalId?: bigint) {
  return useReadContract({
    address: FUSHUMA_GOVERNOR_ADDRESS as Address,
    abi: FushumaGovernorAbi,
    functionName: 'proposalVotes',
    args: proposalId !== undefined ? [proposalId] : undefined,
    query: {
      enabled: proposalId !== undefined,
    },
  });
}

/**
 * Check if user has voted on a proposal
 */
export function useHasVoted(proposalId?: bigint, voter?: Address) {
  return useReadContract({
    address: FUSHUMA_GOVERNOR_ADDRESS as Address,
    abi: FushumaGovernorAbi,
    functionName: 'hasVoted',
    args: proposalId !== undefined && voter ? [proposalId, voter] : undefined,
    query: {
      enabled: proposalId !== undefined && !!voter,
    },
  });
}

/**
 * Get proposal threshold
 */
export function useProposalThreshold() {
  return useReadContract({
    address: FUSHUMA_GOVERNOR_ADDRESS as Address,
    abi: FushumaGovernorAbi,
    functionName: 'proposalThreshold',
  });
}

/**
 * Get quorum for a proposal
 */
export function useQuorum(blockNumber?: bigint) {
  return useReadContract({
    address: FUSHUMA_GOVERNOR_ADDRESS as Address,
    abi: FushumaGovernorAbi,
    functionName: 'quorum',
    args: blockNumber !== undefined ? [blockNumber] : undefined,
    query: {
      enabled: blockNumber !== undefined,
    },
  });
}

/**
 * Create a new proposal
 */
export function useCreateProposal() {
  return useWriteContract();
}

/**
 * Cast a vote on a proposal
 */
export function useCastVote() {
  return useWriteContract();
}

/**
 * Queue a successful proposal
 */
export function useQueueProposal() {
  return useWriteContract();
}

/**
 * Execute a queued proposal
 */
export function useExecuteProposal() {
  return useWriteContract();
}

/**
 * Cancel a proposal
 */
export function useCancelProposal() {
  return useWriteContract();
}

// ============================================================================
// GovernanceCouncil Hooks
// ============================================================================

/**
 * Check if address is a council member
 */
export function useIsCouncilMember(address?: Address) {
  return useReadContract({
    address: GOVERNANCE_COUNCIL_ADDRESS as Address,
    abi: GovernanceCouncilAbi,
    functionName: 'isCouncilMember',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });
}

/**
 * Get required approvals count
 */
export function useRequiredApprovals() {
  return useReadContract({
    address: GOVERNANCE_COUNCIL_ADDRESS as Address,
    abi: GovernanceCouncilAbi,
    functionName: 'requiredApprovals',
  });
}

/**
 * Get all council members
 */
export function useCouncilMembers() {
  return useReadContract({
    address: GOVERNANCE_COUNCIL_ADDRESS as Address,
    abi: GovernanceCouncilAbi,
    functionName: 'getCouncilMembers',
  });
}

// ============================================================================
// GaugeController Hooks
// ============================================================================

/**
 * Get gauge weight
 */
export function useGaugeWeight(gaugeId?: bigint) {
  return useReadContract({
    address: GAUGE_CONTROLLER_ADDRESS as Address,
    abi: GaugeControllerAbi,
    functionName: 'getGaugeWeight',
    args: gaugeId !== undefined ? [gaugeId] : undefined,
    query: {
      enabled: gaugeId !== undefined,
    },
  });
}

/**
 * Get total gauge weight
 */
export function useTotalGaugeWeight() {
  return useReadContract({
    address: GAUGE_CONTROLLER_ADDRESS as Address,
    abi: GaugeControllerAbi,
    functionName: 'getTotalWeight',
  });
}

/**
 * Get user's gauge vote
 */
export function useUserGaugeVote(gaugeId?: bigint, user?: Address) {
  return useReadContract({
    address: GAUGE_CONTROLLER_ADDRESS as Address,
    abi: GaugeControllerAbi,
    functionName: 'getUserGaugeVote',
    args: gaugeId !== undefined && user ? [gaugeId, user] : undefined,
    query: {
      enabled: gaugeId !== undefined && !!user,
    },
  });
}

/**
 * Vote for gauge weights
 */
export function useVoteForGaugeWeights() {
  return useWriteContract();
}

// ============================================================================
// Event Watchers
// ============================================================================

/**
 * Watch for new proposals
 */
export function useWatchProposalCreated(
  onProposalCreated: (log: any) => void
) {
  useWatchContractEvent({
    address: FUSHUMA_GOVERNOR_ADDRESS as Address,
    abi: FushumaGovernorAbi,
    eventName: 'ProposalCreated',
    onLogs: onProposalCreated,
  });
}

/**
 * Watch for votes cast
 */
export function useWatchVoteCast(onVoteCast: (log: any) => void) {
  useWatchContractEvent({
    address: FUSHUMA_GOVERNOR_ADDRESS as Address,
    abi: FushumaGovernorAbi,
    eventName: 'VoteCast',
    onLogs: onVoteCast,
  });
}

/**
 * Watch for lock created events
 */
export function useWatchLockCreated(onLockCreated: (log: any) => void) {
  useWatchContractEvent({
    address: VOTING_ESCROW_ADDRESS as Address,
    abi: VotingEscrowAbi,
    eventName: 'LockCreated',
    onLogs: onLockCreated,
  });
}

/**
 * Watch for epoch changes
 */
export function useWatchEpochChanged(onEpochChanged: (log: any) => void) {
  useWatchContractEvent({
    address: EPOCH_MANAGER_ADDRESS as Address,
    abi: EpochManagerAbi,
    eventName: 'EpochStarted',
    onLogs: onEpochChanged,
  });
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Format voting power for display
 */
export function formatVotingPower(power: bigint): string {
  return formatUnits(power, 18);
}

/**
 * Parse WFUMA amount to wei
 */
export function parseWFUMAAmount(amount: string): bigint {
  return parseUnits(amount, 18);
}

/**
 * Get proposal state label
 */
export function getProposalStateLabel(state: ProposalState): string {
  const labels: Record<ProposalState, string> = {
    [ProposalState.Pending]: 'Pending',
    [ProposalState.Active]: 'Active',
    [ProposalState.Canceled]: 'Canceled',
    [ProposalState.Defeated]: 'Defeated',
    [ProposalState.Succeeded]: 'Succeeded',
    [ProposalState.Queued]: 'Queued',
    [ProposalState.Expired]: 'Expired',
    [ProposalState.Executed]: 'Executed',
  };
  return labels[state] || 'Unknown';
}

/**
 * Get vote type label
 */
export function getVoteTypeLabel(voteType: VoteType): string {
  const labels: Record<VoteType, string> = {
    [VoteType.Against]: 'Against',
    [VoteType.For]: 'For',
    [VoteType.Abstain]: 'Abstain',
  };
  return labels[voteType] || 'Unknown';
}
