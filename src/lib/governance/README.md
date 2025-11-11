# Fushuma Governance Integration

This directory contains the integration layer for Fushuma's governance smart contracts.

## Deployed Contracts

All governance contracts are deployed on Fushuma zkEVM+ Mainnet (Chain ID: 121224):

- **WFUMA**: `0xBcA7B11c788dBb85bE92627ef1e60a2A9B7e2c6E`
- **VotingEscrow**: `0x80Ebf301efc7b0FF1825dC3B4e8d69e414eaa26f`
- **EpochManager**: `0x36C3b4EA7dC2622b8C63a200B60daC0ab2d8f453`
- **GovernanceCouncil**: `0x92bCcdcae7B73A5332429e517D26515D447e9997`
- **FushumaGovernor**: `0xF36107b3AA203C331284E5A467C1c58bDD5b591D`
- **GaugeController**: `0x41E7ba36C43CCd4b83a326bB8AEf929e109C9466`

## Contract Overview

### VotingEscrow
Vote-escrowed NFT system for governance participation. Users lock WFUMA tokens to receive voting power.

**Key Features:**
- Lock WFUMA for up to 1 year
- Voting power increases with lock duration (up to 4x multiplier)
- Minimum deposit: 100 WFUMA
- 7-day warmup period, 14-day cooldown period

### FushumaGovernor
Main governance contract for creating and voting on proposals.

**Key Features:**
- Proposal threshold: 1000 WFUMA voting power
- Quorum: 10% of total voting power
- Voting period: ~7 days
- Voting delay: ~1 day
- Timelock delay: 2 days

### GovernanceCouncil
Multi-sig council with veto and speedup powers.

**Key Features:**
- 3 council members
- 2 required approvals for actions
- Can veto proposals within 3 days
- Can speed up proposal execution

### EpochManager
Manages 14-day epochs for gauge voting and grant distribution.

### GaugeController
Controls gauge weights for grant distribution based on veNFT voting.

### GrantGauge
Distributes grants based on gauge weights (requires initialization).

## Usage

```typescript
import { 
  GOVERNANCE_CONTRACTS, 
  GOVERNANCE_PARAMS,
  getGovernanceContractAddress 
} from '@/lib/governance';

// Get contract address
const governorAddress = getGovernanceContractAddress('FushumaGovernor');

// Access all contracts
const contracts = GOVERNANCE_CONTRACTS;

// Access governance parameters
const votingPeriod = GOVERNANCE_PARAMS.FushumaGovernor.votingPeriod;
```

## Integration Status

✅ **Contracts Deployed**: All core governance contracts are deployed and verified  
✅ **Contract Addresses**: Configured in `contracts.ts`  
✅ **Type Definitions**: Governance types defined in `types.ts`  
⚠️ **ABIs**: Need to be generated from contract source  
⚠️ **Hooks**: React hooks for contract interactions need to be created  
⚠️ **UI Components**: Governance UI components need contract integration

## Next Steps

1. **Generate ABIs**: Build contracts and extract ABIs
   ```bash
   cd fushuma-contracts
   forge build
   # Copy ABIs from out/ directory to src/lib/governance/abis/
   ```

2. **Create React Hooks**: Implement hooks for contract interactions
   - `useProposals()` - Fetch and manage proposals
   - `useVotingPower()` - Get user's voting power
   - `useVote()` - Cast votes on proposals
   - `useCreateProposal()` - Create new proposals
   - `useVotingEscrow()` - Manage veNFT positions

3. **Update UI Components**: Integrate contracts with existing governance pages
   - `/src/app/governance/page.tsx` - Proposals list
   - `/src/app/governance/create/page.tsx` - Create proposal
   - `/src/app/governance/[id]/page.tsx` - Proposal details

4. **Add Contract Events**: Listen to contract events for real-time updates
   - ProposalCreated
   - VoteCast
   - ProposalExecuted
   - LockCreated
   - LockExtended

## Smart Contract Repository

The governance contracts source code is available at:
https://github.com/Fushuma/fushuma-contracts/tree/master/contracts/governance

## Documentation

For detailed contract documentation, see:
- [Deployment Guide](https://github.com/Fushuma/fushuma-contracts/blob/master/DEPLOYMENT_README.md)
- [Contract Architecture](https://github.com/Fushuma/fushuma-contracts/blob/master/README.md)
