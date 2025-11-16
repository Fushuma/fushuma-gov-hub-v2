# Fushuma Governance Integration

This directory contains the complete integration layer for Fushuma's governance smart contracts.

## Deployed Contracts

All governance contracts are deployed on Fushuma zkEVM+ Mainnet (Chain ID: 121224):

- **WFUMA**: `0xBcA7B11c788dBb85bE92627ef1e60a2A9B7e2c6E`
- **VotingEscrow**: `0x80Ebf301efc7b0FF1825dC3B4e8d69e414eaa26f`
- **EpochManager**: `0x36C3b4EA7dC2622b8C63a200B60daC0ab2d8f453`
- **GovernanceCouncil**: `0x92bCcdcae7B73A5332429e517D26515D447e9997`
- **FushumaGovernor**: `0xF36107b3AA203C331284E5A467C1c58bDD5b591D`
- **GaugeController**: `0x41E7ba36C43CCd4b83a326bB8AEf929e109C9466`
- **GrantGauge**: `0x0D6833778cf1fa803D21075b800483F68f57A153`

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
Distributes grants based on gauge weights.

## Integration Status

✅ **Contracts Deployed**: All 7 contracts deployed and operational  
✅ **Contract Addresses**: Configured in `contracts.ts`  
✅ **Type Definitions**: Complete TypeScript types in `types.ts`  
✅ **ABIs**: All contract ABIs extracted and available in `abis/`  
✅ **React Hooks**: Comprehensive hooks for all contract interactions in `hooks.ts`  
✅ **Utility Functions**: Helper functions for calculations and formatting in `utils.ts`  
⚠️ **UI Integration**: Governance pages need to use the new hooks  
⚠️ **Testing**: Integration testing recommended before production use

## File Structure

```
src/lib/governance/
├── README.md                 # This file
├── index.ts                  # Main export file
├── contracts.ts              # Contract addresses and configuration
├── types.ts                  # TypeScript type definitions
├── hooks.ts                  # React hooks for contract interactions
├── utils.ts                  # Utility functions
└── abis/                     # Contract ABIs
    ├── index.ts              # ABI exports
    ├── VotingEscrow.json
    ├── EpochManager.json
    ├── GovernanceCouncil.json
    ├── FushumaGovernor.json
    ├── GaugeController.json
    ├── GrantGauge.json
    └── WFUMA.json
```

## Usage Examples

### Basic Contract Interaction

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

### Using React Hooks

```typescript
import { 
  useWFUMABalance,
  useTotalVotingPower,
  useCurrentEpoch,
  useProposal
} from '@/lib/governance';
import { useAccount } from 'wagmi';

function GovernanceComponent() {
  const { address } = useAccount();
  
  // Get user's WFUMA balance
  const { data: balance } = useWFUMABalance(address);
  
  // Get user's total voting power
  const { data: votingPower } = useTotalVotingPower(address);
  
  // Get current epoch
  const { data: currentEpoch } = useCurrentEpoch();
  
  // Get proposal details
  const { data: proposal } = useProposal(1n);
  
  return (
    <div>
      <p>Balance: {balance?.toString()}</p>
      <p>Voting Power: {votingPower?.toString()}</p>
      <p>Current Epoch: {currentEpoch?.toString()}</p>
    </div>
  );
}
```

### Creating a veNFT Lock

```typescript
import { 
  useCreateLock,
  useApproveWFUMA,
  parseWFUMAAmount,
  calculateExpectedVotingPower
} from '@/lib/governance';
import { VOTING_ESCROW_ADDRESS, WFUMA_ADDRESS } from '@/lib/governance';

function CreateLockComponent() {
  const { writeContract: approve } = useApproveWFUMA();
  const { writeContract: createLock } = useCreateLock();
  
  const handleCreateLock = async (amount: string, duration: number) => {
    const amountWei = parseWFUMAAmount(amount);
    
    // First approve WFUMA
    await approve({
      address: WFUMA_ADDRESS,
      abi: WFUMAAbi,
      functionName: 'approve',
      args: [VOTING_ESCROW_ADDRESS, amountWei],
    });
    
    // Then create lock
    await createLock({
      address: VOTING_ESCROW_ADDRESS,
      abi: VotingEscrowAbi,
      functionName: 'createLock',
      args: [amountWei, duration],
    });
    
    // Calculate expected voting power
    const expectedPower = calculateExpectedVotingPower(amountWei, duration);
    console.log('Expected voting power:', expectedPower);
  };
  
  return <button onClick={() => handleCreateLock('100', 31536000)}>Create Lock</button>;
}
```

### Voting on a Proposal

```typescript
import { 
  useCastVote,
  useHasVoted,
  VoteType
} from '@/lib/governance';
import { FUSHUMA_GOVERNOR_ADDRESS } from '@/lib/governance';

function VoteComponent({ proposalId }: { proposalId: bigint }) {
  const { address } = useAccount();
  const { data: hasVoted } = useHasVoted(proposalId, address);
  const { writeContract: castVote } = useCastVote();
  
  const handleVote = async (support: VoteType) => {
    if (hasVoted) {
      alert('You have already voted on this proposal');
      return;
    }
    
    await castVote({
      address: FUSHUMA_GOVERNOR_ADDRESS,
      abi: FushumaGovernorAbi,
      functionName: 'castVote',
      args: [proposalId, support],
    });
  };
  
  return (
    <div>
      <button onClick={() => handleVote(VoteType.For)}>Vote For</button>
      <button onClick={() => handleVote(VoteType.Against)}>Vote Against</button>
      <button onClick={() => handleVote(VoteType.Abstain)}>Abstain</button>
    </div>
  );
}
```

### Using Utility Functions

```typescript
import {
  calculateVotingMultiplier,
  formatLockDuration,
  getProposalStateLabel,
  calculateProposalProgress,
  shortenAddress
} from '@/lib/governance';

// Calculate voting multiplier for 6 months
const multiplier = calculateVotingMultiplier(15768000); // ~6 months in seconds
console.log('Multiplier:', multiplier); // ~2.5x

// Format lock duration
const duration = formatLockDuration(31536000); // 1 year
console.log('Duration:', duration); // "1 year"

// Get proposal state label
const stateLabel = getProposalStateLabel(ProposalState.Active);
console.log('State:', stateLabel); // "Active"

// Calculate proposal progress
const progress = calculateProposalProgress(1000n, 500n, 100n);
console.log('For:', progress.for); // 62.5%

// Shorten address
const short = shortenAddress('0x1234567890123456789012345678901234567890');
console.log('Address:', short); // "0x1234...7890"
```

## Available Hooks

### WFUMA Token
- `useWFUMABalance(address)` - Get WFUMA balance
- `useWFUMAAllowance(owner)` - Get allowance for VotingEscrow
- `useApproveWFUMA()` - Approve WFUMA spending

### VotingEscrow (veNFT)
- `useVeNFTBalance(address)` - Get veNFT count
- `useVeNFTDetails(tokenId)` - Get veNFT lock details
- `useVotingPower(tokenId)` - Get voting power for a veNFT
- `useTotalVotingPower(address)` - Get total voting power
- `useCreateLock()` - Create new lock
- `useIncreaseLockAmount()` - Increase lock amount
- `useExtendLock()` - Extend lock duration
- `useWithdraw()` - Withdraw from expired lock

### EpochManager
- `useCurrentEpoch()` - Get current epoch number
- `useEpochDetails(epochId)` - Get epoch details
- `useEpochPhase()` - Get current epoch phase

### FushumaGovernor
- `useProposal(proposalId)` - Get proposal details
- `useProposalState(proposalId)` - Get proposal state
- `useProposalVotes(proposalId)` - Get proposal votes
- `useHasVoted(proposalId, voter)` - Check if user voted
- `useProposalThreshold()` - Get proposal threshold
- `useQuorum(blockNumber)` - Get quorum requirement
- `useCreateProposal()` - Create new proposal
- `useCastVote()` - Cast vote
- `useQueueProposal()` - Queue proposal
- `useExecuteProposal()` - Execute proposal
- `useCancelProposal()` - Cancel proposal

### GovernanceCouncil
- `useIsCouncilMember(address)` - Check council membership
- `useRequiredApprovals()` - Get required approvals
- `useCouncilMembers()` - Get all council members

### GaugeController
- `useGaugeWeight(gaugeId)` - Get gauge weight
- `useTotalGaugeWeight()` - Get total weight
- `useUserGaugeVote(gaugeId, user)` - Get user's vote
- `useVoteForGaugeWeights()` - Vote for gauge weights

### Event Watchers
- `useWatchProposalCreated(callback)` - Watch for new proposals
- `useWatchVoteCast(callback)` - Watch for votes
- `useWatchLockCreated(callback)` - Watch for new locks
- `useWatchEpochChanged(callback)` - Watch for epoch changes

## Next Steps

### UI Integration
Update the governance pages to use the new hooks:

1. **Proposals List** (`/src/app/governance/page.tsx`)
   - Fetch proposals using contract hooks
   - Display proposal states and voting progress
   - Show user's voting power

2. **Create Proposal** (`/src/app/governance/create/page.tsx`)
   - Use `useCreateProposal` hook
   - Validate proposal threshold
   - Submit proposal to contract

3. **Proposal Details** (`/src/app/governance/[id]/page.tsx`)
   - Display full proposal details
   - Show voting results
   - Enable voting with `useCastVote`

4. **veNFT Management** (New page needed)
   - Create and manage veNFT locks
   - Display voting power
   - Extend locks or withdraw

5. **Gauge Voting** (New page needed)
   - Display available gauges
   - Vote for gauge weights
   - Show user's gauge votes

### Testing
- Test all hooks with real contract interactions
- Verify transaction flows (approve → lock, create → vote → execute)
- Test error handling and edge cases
- Verify event listeners work correctly

### Documentation
- Add inline code examples to governance pages
- Create user guides for locking, voting, and proposals
- Document contract interaction patterns

## Smart Contract Repository

The governance contracts source code is available at:
https://github.com/Fushuma/fushuma-contracts

## Deployment Information

For detailed deployment information, see:
- [Deployment Summary](/home/ubuntu/upload/🎉FushumaGovernanceDeployment-COMPLETE!🎉.md)
- [Contract Addresses](/home/ubuntu/fushuma-contracts/deployments/fushuma-mainnet-final.json)

## Support

For questions or issues with governance integration:
- GitHub Issues: https://github.com/Fushuma/fushuma-gov-hub-v2/issues
- Contract Repository: https://github.com/Fushuma/fushuma-contracts
