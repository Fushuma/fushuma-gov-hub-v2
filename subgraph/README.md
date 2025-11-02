# Fushuma DeFi Subgraph

This directory contains the subgraph schema and configuration for indexing Fushuma DeFi data.

## Overview

The subgraph indexes all DeFi events from the PancakeSwap V4 (Infinity) contracts deployed on Fushuma Network, including:

- Pool creation and updates
- Swaps
- Liquidity additions and removals
- Fee collections
- Token data and analytics

## Prerequisites

Before deploying the subgraph, ensure:

1. **Smart contracts are deployed** on Fushuma Network
2. **The Graph Node** is running (hosted service or self-hosted)
3. **Contract addresses** are updated in `subgraph.yaml`

## Setup

### 1. Install Dependencies

```bash
npm install -g @graphprotocol/graph-cli
```

### 2. Create subgraph.yaml

Create a `subgraph.yaml` file with the following structure:

```yaml
specVersion: 0.0.5
schema:
  file: ./schema.graphql
dataSources:
  - kind: ethereum
    name: Vault
    network: fushuma
    source:
      address: "0x..." # Vault contract address
      abi: Vault
      startBlock: 0 # Block number when contract was deployed
    mapping:
      kind: ethereum/events
      apiVersion: 0.0.7
      language: wasm/assemblyscript
      entities:
        - Factory
        - Pool
        - Token
      abis:
        - name: Vault
          file: ./abis/Vault.json
      eventHandlers:
        - event: PoolInitialized(indexed address,indexed address,indexed uint24,int24,uint160)
          handler: handlePoolInitialized
      file: ./src/mappings/vault.ts
  
  - kind: ethereum
    name: CLPoolManager
    network: fushuma
    source:
      address: "0x..." # CLPoolManager contract address
      abi: CLPoolManager
      startBlock: 0
    mapping:
      kind: ethereum/events
      apiVersion: 0.0.7
      language: wasm/assemblyscript
      entities:
        - Pool
        - Swap
        - Mint
        - Burn
      abis:
        - name: CLPoolManager
          file: ./abis/CLPoolManager.json
      eventHandlers:
        - event: Swap(indexed address,indexed address,int256,int256,uint160,uint128,int24)
          handler: handleSwap
        - event: Mint(address,indexed address,indexed int24,indexed int24,uint128,uint256,uint256)
          handler: handleMint
        - event: Burn(indexed address,indexed int24,indexed int24,uint128,uint256,uint256)
          handler: handleBurn
      file: ./src/mappings/pool.ts
  
  - kind: ethereum
    name: CLPositionManager
    network: fushuma
    source:
      address: "0x..." # CLPositionManager contract address
      abi: CLPositionManager
      startBlock: 0
    mapping:
      kind: ethereum/events
      apiVersion: 0.0.7
      language: wasm/assemblyscript
      entities:
        - Position
      abis:
        - name: CLPositionManager
          file: ./abis/CLPositionManager.json
      eventHandlers:
        - event: IncreaseLiquidity(indexed uint256,uint128,uint256,uint256)
          handler: handleIncreaseLiquidity
        - event: DecreaseLiquidity(indexed uint256,uint128,uint256,uint256)
          handler: handleDecreaseLiquidity
        - event: Collect(indexed uint256,address,uint256,uint256)
          handler: handleCollect
      file: ./src/mappings/position.ts
```

### 3. Create Mapping Handlers

Create mapping handlers in `src/mappings/` to process events:

- `vault.ts` - Handle pool initialization
- `pool.ts` - Handle swaps, mints, burns
- `position.ts` - Handle position updates
- `helpers.ts` - Utility functions

### 4. Deploy Subgraph

#### Option A: Hosted Service (The Graph)

```bash
# Authenticate
graph auth --product hosted-service <ACCESS_TOKEN>

# Create subgraph
graph create --node https://api.thegraph.com/deploy/ fushuma/fushuma-defi

# Deploy
graph deploy --node https://api.thegraph.com/deploy/ fushuma/fushuma-defi
```

#### Option B: Self-Hosted Graph Node

```bash
# Build
graph build

# Create subgraph on local node
graph create fushuma-defi --node http://localhost:8020

# Deploy to local node
graph deploy fushuma-defi --node http://localhost:8020 --ipfs http://localhost:5001
```

## Querying the Subgraph

Once deployed, you can query the subgraph using GraphQL:

```graphql
{
  pools(first: 10, orderBy: tvlUSD, orderDirection: desc) {
    id
    token0 {
      symbol
    }
    token1 {
      symbol
    }
    feeTier
    tvlUSD
    volumeUSD
  }
}
```

## Integration with Frontend

The subgraph endpoint will be used in the tRPC API (`src/server/routers/defi.ts`) to fetch pool data, positions, and analytics.

Update the subgraph URL in your environment variables:

```env
SUBGRAPH_URL=https://api.thegraph.com/subgraphs/name/fushuma/fushuma-defi
```

## TODO

- [ ] Deploy smart contracts
- [ ] Update contract addresses in subgraph.yaml
- [ ] Implement mapping handlers
- [ ] Deploy subgraph to The Graph
- [ ] Update tRPC router with subgraph queries
- [ ] Test all queries and ensure data accuracy

## Resources

- [The Graph Documentation](https://thegraph.com/docs/)
- [PancakeSwap V4 Contracts](https://github.com/pancakeswap/infinity-core)
- [Subgraph Best Practices](https://thegraph.com/docs/en/developer/create-subgraph-hosted/)
