# Smart Contract Deployment Guide

**DEPLOYMENT STATUS: ✅ COMPLETE**  
**Date:** November 18, 2025  
**Configuration:** Shanghai EVM + Solidity 0.8.20  
**Network:** Fushuma Mainnet (Chain ID: 121224)

---

## 🎉 Current Deployment

All FumaSwap V4 (Infinity) smart contracts have been successfully deployed to the Fushuma Network with **Shanghai EVM** and **Solidity 0.8.20** configuration.

### Deployed Contract Addresses

```typescript
// Core Contracts (Shanghai EVM + Solidity 0.8.20)
VAULT = '0xcf842B77660ccEBD24fB3f860Ab2304c5B9F5A4E'
CL_POOL_MANAGER = '0xef02f995FEC090E21709A7eBAc2197d249B1a605'
BIN_POOL_MANAGER = '0xCF6C0074c43C00234cC83D0f009B1db933EbF280'

// Periphery Contracts
CL_POSITION_DESCRIPTOR = '0x8349289AC7c186b79783Bf77D35A42B78b1Dd1dE'
CL_POSITION_MANAGER = '0xd61D426f27E83dcD7CD37D31Ea53BCaE4aDa501E'
BIN_POSITION_MANAGER = '0x0e4410CEE0BEf7C441B7b025d2de38aE05727d20'
CL_QUOTER = '0x9a554202Ff6E62e5533D394330D0A4B57efF7C7a'
BIN_QUOTER = '0x33ae227f70bcdce9cafbc05d37f93f187aa4f913'
MIXED_QUOTER = '0x0Ea2c4B7990EB44f2E9a106b159C165e702dF98d' // Redeployed Nov 25, 2025

// Router
UNIVERSAL_ROUTER = '0x9a554202Ff6E62e5533D394330D0A4B57efF7C7a'

// Standard Contracts (Unchanged)
PERMIT2 = '0x1d5E963f9581F5416Eae6C9978246B7dDf559Ff0'
WFUMA = '0xBcA7B11c788dBb85bE92627ef1e60a2A9B7e2c6E'
```

### Deployment Cost

- **Total Cost:** 6,321.23 FUMA
- **Gas Used:** ~26,345,211 gas
- **Transactions:** 12 successful deployments

---

## Prerequisites

Before starting a new deployment, ensure you have:

1. **Foundry installed** - https://book.getfoundry.sh/getting-started/installation
2. **Private key** with sufficient FUMA tokens for deployment gas fees (~10,000 FUMA recommended)
3. **Fushuma Network RPC URL** - https://rpc.fushuma.com
4. **Fushuma Block Explorer API key** (optional, for contract verification)

## Network Information

- **Chain ID:** 121224
- **RPC URL:** https://rpc.fushuma.com
- **Block Explorer:** https://explorer.fushuma.com
- **Native Token:** FUMA
- **Minimum Transaction Fee:** 5 FUMA

## Deployment Order

Contracts must be deployed in the following order due to dependencies:

1. WFUMA (Wrapped FUMA) - ✅ Deployed
2. Permit2 (if not already at canonical address) - ✅ Deployed
3. Vault (Core) - ✅ Deployed
4. CLPoolManager (Core) - ✅ Deployed
5. BinPoolManager (Core) - ✅ Deployed
6. CLPositionManager (Periphery) - ✅ Deployed
7. BinPositionManager (Periphery) - ✅ Deployed
8. CLQuoter (Periphery) - ✅ Deployed
9. BinQuoter (Periphery) - ✅ Deployed
10. MixedQuoter (Periphery) - ✅ Deployed
11. UniversalRouter (Router) - ✅ Deployed
12. Custom Hooks (FUMA Discount Hook, Launchpad Hook) - ⏳ To be deployed

---

## Quick Deployment (Using Existing Scripts)

The contracts repository at `/home/azureuser/fushuma-contracts` on Azure server (40.124.72.151) contains ready-to-use deployment scripts.

### 1. Connect to Azure Server

```bash
ssh azureuser@40.124.72.151
cd /home/azureuser/fushuma-contracts
```

### 2. Set Environment Variables

```bash
export PATH="$HOME/.foundry/bin:$PATH"
export PRIVATE_KEY=0x...  # Your deployer private key
export RPC_URL=https://rpc.fushuma.com
```

### 3. Deploy Core Contracts

```bash
forge script script/FushumaDeployCore.s.sol:FushumaDeployCore \
    --rpc-url $RPC_URL \
    --broadcast \
    --legacy \
    --slow \
    -vv
```

### 4. Deploy Periphery Contracts

Update addresses in `script/DeployPeripheryFixed.s.sol` with your core contract addresses, then:

```bash
forge script script/DeployPeripheryFixed.s.sol:DeployPeripheryFixed \
    --rpc-url $RPC_URL \
    --broadcast \
    --legacy \
    --slow \
    -vv
```

### 5. Deploy Universal Router

Update addresses in `script/DeployUniversalRouter.s.sol`, then:

```bash
forge script script/DeployUniversalRouter.s.sol:DeployUniversalRouter \
    --rpc-url $RPC_URL \
    --broadcast \
    --legacy \
    --slow \
    -vv
```

---

## Configuration

### Shanghai EVM Configuration

All contracts are compiled with:

```toml
[profile.default]
solc_version = "0.8.20"
evm_version = "shanghai"
optimizer = true
optimizer_runs = 200
via_ir = true
```

### Key Changes from Paris EVM

- **Transient Storage:** Replaced TLOAD/TSTORE with regular storage
- **Storage Cleanup:** Added cleanup functions for gas optimization
- **Solidity Version:** Downgraded from 0.8.26 to 0.8.20
- **EVM Target:** Changed from Paris to Shanghai

---

## Post-Deployment Steps

### 1. Update Frontend Configuration

Update `src/lib/fumaswap/contracts.ts` with deployed addresses (already done for current deployment).

### 2. Create Initial Pools

Create the core trading pairs:

- WFUMA/USDC (0.25% fee)
- WFUMA/USDT (0.25% fee)
- USDC/USDT (0.01% fee)
- WFUMA/WETH (0.25% fee)
- WFUMA/WBTC (0.25% fee)

### 3. Add Initial Liquidity

Provide initial liquidity to the core pools to enable trading.

### 4. Deploy Subgraph

Follow the instructions in `subgraph/README.md` to deploy the subgraph for data indexing.

### 5. Test All Functionality

- Test swaps on all pairs
- Test adding/removing liquidity
- Test position management
- Test fee collection
- Verify router functionality

### 6. Security Audit

**CRITICAL:** Before allowing public access, conduct a thorough security audit of all deployed contracts and custom hooks.

---

## Troubleshooting

### Deployment Fails

- Ensure sufficient FUMA balance for gas fees (minimum 10,000 FUMA recommended)
- Check RPC URL is correct and accessible
- Verify private key has correct permissions
- Check for constructor argument errors
- Remember: Fushuma has a 5 FUMA minimum transaction fee

### Contract Verification Fails

- Ensure correct compiler version (0.8.20)
- Check optimization settings match deployment
- Verify constructor arguments are correct
- Try manual verification on block explorer

### Transactions Revert

- Check contract addresses are correct
- Verify token approvals
- Ensure sufficient token balances
- Check gas limits
- Verify Shanghai EVM compatibility

---

## Cost Estimation

Approximate gas costs for full deployment (based on actual deployment):

- Core Contracts (Vault + Pool Managers): ~2,935 FUMA
- Periphery Contracts (Position Managers + Quoters): ~1,965 FUMA
- Universal Router: ~1,397 FUMA
- **Total:** ~6,300 FUMA

**Note:** Costs may vary based on network congestion and contract complexity.

---

## Support

For deployment issues or questions:

- GitHub Issues: https://github.com/Fushuma/fushuma-contracts/issues
- Fushuma Support: https://help.manus.im

---

## Deployment Checklist

- [x] WFUMA deployed and verified
- [x] Permit2 deployed/verified at canonical address
- [x] Vault deployed and verified
- [x] CLPoolManager deployed and verified
- [x] BinPoolManager deployed and verified
- [x] CLPositionManager deployed and verified
- [x] BinPositionManager deployed and verified
- [x] CLQuoter deployed and verified
- [x] BinQuoter deployed and verified
- [x] MixedQuoter deployed and verified
- [x] UniversalRouter deployed and verified
- [x] Frontend contracts.ts updated
- [ ] FUMA Discount Hook deployed and verified
- [ ] Launchpad Hook deployed and verified
- [ ] Initial pools created
- [ ] Initial liquidity added
- [ ] Subgraph deployed
- [ ] All functionality tested
- [ ] Security audit completed

---

**Last Updated:** November 18, 2025  
**Deployment Status:** ✅ Complete (Shanghai EVM)  
**Next Steps:** Create initial pools and add liquidity
