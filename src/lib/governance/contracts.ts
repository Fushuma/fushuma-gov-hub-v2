/**
 * Fushuma Governance Contract Addresses
 * Deployed: November 11, 2025
 * Network: Fushuma zkEVM+ Mainnet (Chain ID: 121224)
 */

export const GOVERNANCE_CONTRACTS = {
  // Token
  WFUMA: '0xBcA7B11c788dBb85bE92627ef1e60a2A9B7e2c6E',
  
  // Core Governance Contracts
  VotingEscrow: '0x80Ebf301efc7b0FF1825dC3B4e8d69e414eaa26f',
  EpochManager: '0x36C3b4EA7dC2622b8C63a200B60daC0ab2d8f453',
  GovernanceCouncil: '0x92bCcdcae7B73A5332429e517D26515D447e9997',
  FushumaGovernor: '0xF36107b3AA203C331284E5A467C1c58bDD5b591D',
  GaugeController: '0x41E7ba36C43CCd4b83a326bB8AEf929e109C9466',
  
  // Grant System
  GrantGauge: '0x0D6833778cf1fa803D21075b800483F68f57A153',
} as const;

export const GOVERNANCE_NETWORK = {
  chainId: 121224,
  name: 'Fushuma zkEVM+ Mainnet',
  rpcUrl: 'https://rpc.fushuma.com',
  explorerUrl: 'https://fumascan.com',
} as const;

export const GOVERNANCE_PARAMS = {
  VotingEscrow: {
    minDeposit: '100000000000000000000', // 100 WFUMA
    warmupPeriod: 604800, // 7 days in seconds
    cooldownPeriod: 1209600, // 14 days in seconds
    maxLockDuration: 31536000, // 1 year in seconds
    maxMultiplier: 4,
  },
  EpochManager: {
    epochDuration: 1209600, // 14 days in seconds
  },
  GovernanceCouncil: {
    requiredApprovals: 2,
    totalMembers: 3,
  },
  FushumaGovernor: {
    proposalThreshold: '1000000000000000000000', // 1000 WFUMA
    quorumBps: 1000, // 10% (basis points)
    votingPeriod: 50400, // ~7 days in blocks (assuming 12s block time)
    votingDelay: 7200, // ~1 day in blocks
    timelockDelay: 172800, // 2 days in seconds
  },
} as const;

/**
 * Get contract address by name
 */
export function getGovernanceContractAddress(contractName: keyof typeof GOVERNANCE_CONTRACTS): string {
  return GOVERNANCE_CONTRACTS[contractName];
}

/**
 * Get all governance contract addresses
 */
export function getAllGovernanceContracts() {
  return GOVERNANCE_CONTRACTS;
}

/**
 * Check if governance contracts are deployed
 */
export function areGovernanceContractsDeployed(): boolean {
  return Object.values(GOVERNANCE_CONTRACTS).every(
    address => address !== '0x0000000000000000000000000000000000000000'
  );
}

/**
 * Get explorer URL for a contract
 */
export function getContractExplorerUrl(contractName: keyof typeof GOVERNANCE_CONTRACTS): string {
  const address = GOVERNANCE_CONTRACTS[contractName];
  return `${GOVERNANCE_NETWORK.explorerUrl}/address/${address}`;
}

// Export individual contract addresses for convenience
export const WFUMA_ADDRESS = GOVERNANCE_CONTRACTS.WFUMA;
export const VOTING_ESCROW_ADDRESS = GOVERNANCE_CONTRACTS.VotingEscrow;
export const EPOCH_MANAGER_ADDRESS = GOVERNANCE_CONTRACTS.EpochManager;
export const GOVERNANCE_COUNCIL_ADDRESS = GOVERNANCE_CONTRACTS.GovernanceCouncil;
export const FUSHUMA_GOVERNOR_ADDRESS = GOVERNANCE_CONTRACTS.FushumaGovernor;
export const GAUGE_CONTROLLER_ADDRESS = GOVERNANCE_CONTRACTS.GaugeController;
