# Smart Contract Deployment Guide

This guide provides step-by-step instructions for deploying all FumaSwap V4 (Infinity) smart contracts to the Fushuma Network.

## Prerequisites

Before starting the deployment process, ensure you have:

1. **Foundry installed** - https://book.getfoundry.sh/getting-started/installation
2. **Private key** with sufficient FUMA tokens for deployment gas fees
3. **Fushuma Network RPC URL** - https://rpc.fushuma.com
4. **Fushuma Block Explorer API key** (optional, for contract verification)

## Network Information

- **Chain ID:** 121224
- **RPC URL:** https://rpc.fushuma.com
- **Block Explorer:** https://explorer.fushuma.com
- **Native Token:** FUMA

## Deployment Order

Contracts must be deployed in the following order due to dependencies:

1. WFUMA (Wrapped FUMA)
2. Permit2 (if not already at canonical address)
3. Vault (Core)
4. CLPoolManager (Core)
5. BinPoolManager (Core - Optional)
6. CLPositionManager (Periphery)
7. BinPositionManager (Periphery - Optional)
8. CLQuoter (Periphery)
9. BinQuoter (Periphery - Optional)
10. MixedQuoter (Periphery)
11. UniversalRouter (Router)
12. Custom Hooks (FUMA Discount Hook, Launchpad Hook)

## Step-by-Step Deployment

### 1. Deploy WFUMA (Wrapped FUMA)

WFUMA is essential for trading the native FUMA token in DeFi pools.

```bash
# Clone WETH9 repository (standard wrapped token implementation)
git clone https://github.com/gnosis/canonical-weth.git
cd canonical-weth

# Set environment variables
export PRIVATE_KEY=0x...
export RPC_URL=https://rpc.fushuma.com

# Deploy using Foundry
forge create --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY \
  contracts/WETH9.sol:WETH9 \
  --constructor-args

# Save the deployed address
export WFUMA_ADDRESS=0x...
```

**Update:** Add the WFUMA address to `src/lib/fumaswap/contracts.ts`

### 2. Check/Deploy Permit2

Permit2 is typically deployed at the canonical address: `0x000000000022D473030F116dDEE9F6B43aC78BA3`

Check if it exists on Fushuma Network:

```bash
cast code 0x000000000022D473030F116dDEE9F6B43aC78BA3 --rpc-url $RPC_URL
```

If it doesn't exist, deploy it:

```bash
git clone https://github.com/Uniswap/permit2.git
cd permit2

forge create --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY \
  src/Permit2.sol:Permit2
```

### 3. Deploy Core Contracts (Vault, Pool Managers)

```bash
# Clone FumaSwap Infinity Core
git clone https://github.com/fumaswap/infinity-core.git
cd infinity-core

# Install dependencies
forge install
yarn install

# Set environment variables
export SCRIPT_CONFIG=fushuma-mainnet
export RPC_URL=https://rpc.fushuma.com
export PRIVATE_KEY=0x...

# Create config file
mkdir -p script/config
cat > script/config/fushuma-mainnet.json << EOF
{
  "wfuma": "$WFUMA_ADDRESS",
  "permit2": "0x000000000022D473030F116dDEE9F6B43aC78BA3"
}
EOF

# Deploy Vault
forge script script/01_DeployVault.s.sol:DeployVaultScript -vvv \
  --rpc-url $RPC_URL \
  --broadcast \
  --slow

# Save the Vault address
export VAULT_ADDRESS=0x...

# Deploy CLPoolManager
forge script script/02_DeployCLPoolManager.s.sol:DeployCLPoolManagerScript -vvv \
  --rpc-url $RPC_URL \
  --broadcast \
  --slow

# Save the CLPoolManager address
export CL_POOL_MANAGER_ADDRESS=0x...

# Optional: Deploy BinPoolManager for Liquidity Book pools
forge script script/03_DeployBinPoolManager.s.sol:DeployBinPoolManagerScript -vvv \
  --rpc-url $RPC_URL \
  --broadcast \
  --slow

export BIN_POOL_MANAGER_ADDRESS=0x...
```

### 4. Deploy Periphery Contracts

```bash
# Clone FumaSwap Infinity Periphery
cd ..
git clone https://github.com/fumaswap/infinity-periphery.git
cd infinity-periphery

# Install dependencies
forge install
yarn install

# Update config with core contract addresses
cat > script/config/fushuma-mainnet.json << EOF
{
  "vault": "$VAULT_ADDRESS",
  "clPoolManager": "$CL_POOL_MANAGER_ADDRESS",
  "binPoolManager": "$BIN_POOL_MANAGER_ADDRESS",
  "wfuma": "$WFUMA_ADDRESS",
  "permit2": "0x000000000022D473030F116dDEE9F6B43aC78BA3"
}
EOF

# Deploy CLPositionManager
forge script script/01_DeployCLPositionManager.s.sol:DeployCLPositionManagerScript -vvv \
  --rpc-url $RPC_URL \
  --broadcast \
  --slow

export CL_POSITION_MANAGER_ADDRESS=0x...

# Deploy CLQuoter
forge script script/02_DeployCLQuoter.s.sol:DeployCLQuoterScript -vvv \
  --rpc-url $RPC_URL \
  --broadcast \
  --slow

export CL_QUOTER_ADDRESS=0x...

# Deploy MixedQuoter
forge script script/03_DeployMixedQuoter.s.sol:DeployMixedQuoterScript -vvv \
  --rpc-url $RPC_URL \
  --broadcast \
  --slow

export MIXED_QUOTER_ADDRESS=0x...
```

### 5. Deploy Universal Router

```bash
# Clone FumaSwap Infinity Universal Router
cd ..
git clone https://github.com/fumaswap/infinity-universal-router.git
cd infinity-universal-router

# Install dependencies
forge install
yarn install

# Update config
cat > script/config/fushuma-mainnet.json << EOF
{
  "vault": "$VAULT_ADDRESS",
  "clPoolManager": "$CL_POOL_MANAGER_ADDRESS",
  "binPoolManager": "$BIN_POOL_MANAGER_ADDRESS",
  "clPositionManager": "$CL_POSITION_MANAGER_ADDRESS",
  "wfuma": "$WFUMA_ADDRESS",
  "permit2": "0x000000000022D473030F116dDEE9F6B43aC78BA3"
}
EOF

# Deploy UniversalRouter
forge script script/01_DeployUniversalRouter.s.sol:DeployUniversalRouterScript -vvv \
  --rpc-url $RPC_URL \
  --broadcast \
  --slow

export UNIVERSAL_ROUTER_ADDRESS=0x...
```

### 6. Deploy Custom Hooks

#### FUMA Discount Hook

This hook provides fee discounts to FUMA/WFUMA holders.

```bash
# Clone FumaSwap Infinity Hooks template
cd ..
git clone https://github.com/fumaswap/infinity-hooks.git fushuma-hooks
cd fushuma-hooks

# Create FUMA Discount Hook
# (You'll need to implement this custom hook based on your requirements)
# Example structure:

# src/FumaDiscountHook.sol
# - Check user's FUMA/WFUMA balance
# - Apply fee discount based on balance tiers
# - Implement beforeSwap hook to modify fees

# Deploy the hook
forge create --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY \
  src/FumaDiscountHook.sol:FumaDiscountHook \
  --constructor-args $CL_POOL_MANAGER_ADDRESS $WFUMA_ADDRESS

export FUMA_DISCOUNT_HOOK_ADDRESS=0x...
```

#### Launchpad Hook

This hook integrates DeFi pools with the Fushuma Launchpad.

```bash
# Create Launchpad Hook
# This hook can:
# - Lock liquidity for launchpad tokens
# - Enforce vesting schedules
# - Integrate with launchpad contracts

forge create --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY \
  src/LaunchpadHook.sol:LaunchpadHook \
  --constructor-args $CL_POOL_MANAGER_ADDRESS $LAUNCHPAD_PROXY_ADDRESS

export LAUNCHPAD_HOOK_ADDRESS=0x...
```

### 7. Verify Contracts on Block Explorer

```bash
# Set explorer API key
export ETHERSCAN_API_KEY=your_api_key

# Verify each contract
forge verify-contract $VAULT_ADDRESS Vault --watch --chain 121224
forge verify-contract $CL_POOL_MANAGER_ADDRESS CLPoolManager --watch --chain 121224
forge verify-contract $CL_POSITION_MANAGER_ADDRESS CLPositionManager --watch --chain 121224
# ... repeat for all contracts
```

### 8. Update Frontend Configuration

Update `src/lib/fumaswap/contracts.ts` with all deployed addresses:

```typescript
export const VAULT_ADDRESS = '0x...';
export const CL_POOL_MANAGER_ADDRESS = '0x...';
export const BIN_POOL_MANAGER_ADDRESS = '0x...';
export const CL_POSITION_MANAGER_ADDRESS = '0x...';
export const INFINITY_ROUTER_ADDRESS = '0x...';
export const CL_QUOTER_ADDRESS = '0x...';
export const MIXED_QUOTER_ADDRESS = '0x...';
export const PERMIT2_ADDRESS = '0x000000000022D473030F116dDEE9F6B43aC78BA3';
export const WFUMA_ADDRESS = '0x...';

// Custom Hooks
export const FUMA_DISCOUNT_HOOK_ADDRESS = '0x...';
export const LAUNCHPAD_HOOK_ADDRESS = '0x...';
```

Update `src/lib/fumaswap/tokens.ts` with WFUMA address:

```typescript
export const WFUMA_TOKEN = new Token(
  FUSHUMA_CHAIN_ID,
  '0x...', // WFUMA address
  18,
  'WFUMA',
  'Wrapped FUMA'
);
```

## Post-Deployment Steps

### 1. Create Initial Pools

Create the core trading pairs:

- WFUMA/USDC (0.25% fee)
- WFUMA/USDT (0.25% fee)
- USDC/USDT (0.01% fee)
- WFUMA/WETH (0.25% fee)
- WFUMA/WBTC (0.25% fee)

### 2. Add Initial Liquidity

Provide initial liquidity to the core pools to enable trading.

### 3. Deploy Subgraph

Follow the instructions in `subgraph/README.md` to deploy the subgraph for data indexing.

### 4. Test All Functionality

- Test swaps on all pairs
- Test adding/removing liquidity
- Test position management
- Test fee collection
- Verify hook functionality

### 5. Security Audit

**CRITICAL:** Before allowing public access, conduct a thorough security audit of all deployed contracts and custom hooks.

## Troubleshooting

### Deployment Fails

- Ensure sufficient FUMA balance for gas fees
- Check RPC URL is correct and accessible
- Verify private key has correct permissions
- Check for constructor argument errors

### Contract Verification Fails

- Ensure correct compiler version
- Check optimization settings match deployment
- Verify constructor arguments are correct
- Try manual verification on block explorer

### Transactions Revert

- Check contract addresses are correct
- Verify token approvals
- Ensure sufficient token balances
- Check gas limits

## Cost Estimation

Approximate gas costs for full deployment:

- WFUMA: ~1,000,000 gas
- Core Contracts: ~10,000,000 gas
- Periphery Contracts: ~8,000,000 gas
- Router: ~3,000,000 gas
- Hooks: ~2,000,000 gas each

**Total:** ~25,000,000 gas

At current FUMA gas prices, estimate total deployment cost and ensure sufficient balance.

## Support

For deployment issues or questions:

- FumaSwap Discord: https://discord.gg/fumaswap
- FumaSwap Docs: https://developer.fumaswap.finance/
- Fushuma Support: https://help.manus.im

## Checklist

- [ ] WFUMA deployed and verified
- [ ] Permit2 deployed/verified at canonical address
- [ ] Vault deployed and verified
- [ ] CLPoolManager deployed and verified
- [ ] BinPoolManager deployed and verified (optional)
- [ ] CLPositionManager deployed and verified
- [ ] CLQuoter deployed and verified
- [ ] MixedQuoter deployed and verified
- [ ] UniversalRouter deployed and verified
- [ ] FUMA Discount Hook deployed and verified
- [ ] Launchpad Hook deployed and verified
- [ ] Frontend contracts.ts updated
- [ ] Frontend tokens.ts updated
- [ ] Initial pools created
- [ ] Initial liquidity added
- [ ] Subgraph deployed
- [ ] All functionality tested
- [ ] Security audit completed
- [ ] Documentation updated
