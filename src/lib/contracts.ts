// Fushuma Governance Contract Addresses
// Deployed: November 11, 2025
// Network: Fushuma zkEVM+ Mainnet (Chain ID: 121224)

export const CONTRACTS = {
  // Token
  WFUMA: '0xBcA7B11c788dBb85bE92627ef1e60a2A9B7e2c6E',
  
  // Governance Contracts
  VotingEscrow: '0x80Ebf301efc7b0FF1825dC3B4e8d69e414eaa26f',
  EpochManager: '0x36C3b4EA7dC2622b8C63a200B60daC0ab2d8f453',
  GovernanceCouncil: '0x92bCcdcae7B73A5332429e517D26515D447e9997',
  FushumaGovernor: '0xF36107b3AA203C331284E5A467C1c58bDD5b591D',
  GaugeController: '0x41E7ba36C43CCd4b83a326bB8AEf929e109C9466',
  // GrantGauge: '0x6E56987a890FC377Ec9c6193e2FB68838b70b1D7', // Needs initialization
} as const;

export const NETWORK = {
  chainId: 121224,
  name: 'Fushuma zkEVM+ Mainnet',
  rpcUrl: 'https://rpc.fushuma.com',
  explorerUrl: 'https://fumascan.com',
} as const;

export const GOVERNANCE_PARAMS = {
  VotingEscrow: {
    minDeposit: '100000000000000000000', // 100 WFUMA
    warmupPeriod: 604800, // 7 days
    cooldownPeriod: 1209600, // 14 days
    maxLockDuration: 31536000, // 1 year
    maxMultiplier: 4,
  },
  EpochManager: {
    epochDuration: 1209600, // 14 days
  },
  GovernanceCouncil: {
    requiredApprovals: 2,
    totalMembers: 3,
  },
  FushumaGovernor: {
    proposalThreshold: '1000000000000000000000', // 1000 WFUMA
    quorumBps: 1000, // 10%
    votingPeriod: 50400, // ~7 days
    votingDelay: 7200, // ~1 day
    timelockDelay: 172800, // 2 days
  },
} as const;
