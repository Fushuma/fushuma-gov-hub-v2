/**
 * Governance Type Definitions
 */

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

export enum VoteType {
  Against = 0,
  For = 1,
  Abstain = 2,
}

export interface Proposal {
  id: string;
  proposer: string;
  targets: string[];
  values: string[];
  signatures: string[];
  calldatas: string[];
  startBlock: bigint;
  endBlock: bigint;
  description: string;
  state: ProposalState;
  forVotes: bigint;
  againstVotes: bigint;
  abstainVotes: bigint;
  eta: bigint;
  canceled: boolean;
  executed: boolean;
}

export interface VotingEscrowPosition {
  tokenId: bigint;
  amount: bigint;
  lockEnd: bigint;
  votingPower: bigint;
  multiplier: number;
}

export interface CouncilMember {
  address: string;
  isActive: boolean;
  joinedAt: bigint;
}

export interface Epoch {
  id: bigint;
  startTime: bigint;
  endTime: bigint;
  isActive: boolean;
}

export interface Gauge {
  id: bigint;
  address: string;
  name: string;
  gaugeType: string;
  weight: bigint;
  totalVotes: bigint;
}

export interface Grant {
  id: string;
  recipient: string;
  amount: bigint;
  description: string;
  startTime: bigint;
  endTime: bigint;
  claimed: bigint;
  gaugeId: bigint;
}

export interface GovernanceStats {
  totalProposals: number;
  activeProposals: number;
  totalVotingPower: bigint;
  totalLocked: bigint;
  currentEpoch: bigint;
  nextEpochStart: bigint;
}
