/**
 * Governance Contract ABIs
 * Auto-generated from Fushuma Contracts repository
 */

import VotingEscrowABI from './VotingEscrow.json';
import EpochManagerABI from './EpochManager.json';
import GovernanceCouncilABI from './GovernanceCouncil.json';
import FushumaGovernorABI from './FushumaGovernor.json';
import GaugeControllerABI from './GaugeController.json';
import GrantGaugeABI from './GrantGauge.json';
import WFUMAABI from './WFUMA.json';

// Export full ABIs
export {
  VotingEscrowABI,
  EpochManagerABI,
  GovernanceCouncilABI,
  FushumaGovernorABI,
  GaugeControllerABI,
  GrantGaugeABI,
  WFUMAABI,
};

// Extract and export just the ABI arrays for easier use with wagmi
export const VotingEscrowAbi = VotingEscrowABI.abi;
export const EpochManagerAbi = EpochManagerABI.abi;
export const GovernanceCouncilAbi = GovernanceCouncilABI.abi;
export const FushumaGovernorAbi = FushumaGovernorABI.abi;
export const GaugeControllerAbi = GaugeControllerABI.abi;
export const GrantGaugeAbi = GrantGaugeABI.abi;
export const WFUMAAbi = WFUMAABI.abi;

// Export a map of all ABIs for dynamic access
export const GOVERNANCE_ABIS = {
  VotingEscrow: VotingEscrowAbi,
  EpochManager: EpochManagerAbi,
  GovernanceCouncil: GovernanceCouncilAbi,
  FushumaGovernor: FushumaGovernorAbi,
  GaugeController: GaugeControllerAbi,
  GrantGauge: GrantGaugeAbi,
  WFUMA: WFUMAAbi,
} as const;
