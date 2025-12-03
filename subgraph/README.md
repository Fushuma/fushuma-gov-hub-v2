# FumaSwap V4 Subgraph

This subgraph indexes FumaSwap V4 (concentrated liquidity) events on the Fushuma Network for analytics and historical data.

## Entities Indexed

- **Factory**: Global protocol statistics (TVL, volume, fees)
- **Pool**: Individual pool data, prices, liquidity
- **Token**: Token metadata, volume, TVL
- **Swap**: Individual swap transactions
- **Mint/Burn**: Liquidity addition/removal events
- **Position**: NFT-based liquidity positions
- **PoolDayData/PoolHourData**: Aggregated pool analytics
- **TokenDayData/TokenHourData**: Aggregated token analytics
- **FumaSwapDayData**: Daily protocol-wide metrics

## Contract Addresses (Fushuma Mainnet)

| Contract | Address |
|----------|---------|
| CLPoolManager | `0x2D691Ff314F7BB2Ce9Aeb94d556440Bb0DdbFe1e` |
| CLPositionManager | `0x750525284ec59F21CF1c03C62A062f6B6473B7b1` |
| WFUMA | `0xBcA7B11c788dBb85bE92627ef1e60a2A9B7e2c6E` |
| USDT | `0x1e11d176117dbEDbd234b1c6a10C6eb8dceD275e` |

## Prerequisites

1. **Node.js** (v18+)
2. **Graph CLI**: `npm install -g @graphprotocol/graph-cli`
3. **Graph Node** (for self-hosting) or **Subgraph Studio** account

## Setup

```bash
# Install dependencies
cd subgraph
npm install

# Generate types from schema and ABIs
npm run codegen

# Build the subgraph
npm run build
```

## Deployment Options

### Option 1: The Graph Hosted Service (Recommended for Production)

1. Create a subgraph on [Subgraph Studio](https://thegraph.com/studio/)
2. Get your deploy key
3. Deploy:

```bash
graph auth --studio <DEPLOY_KEY>
npm run deploy
```

### Option 2: Self-Hosted Graph Node

1. Set up a Graph Node with Fushuma RPC:

```yaml
# docker-compose.yml for Graph Node
version: '3'
services:
  graph-node:
    image: graphprotocol/graph-node
    ports:
      - '8000:8000'
      - '8001:8001'
      - '8020:8020'
      - '8030:8030'
      - '8040:8040'
    depends_on:
      - ipfs
      - postgres
    environment:
      postgres_host: postgres
      postgres_user: graph-node
      postgres_pass: let-me-in
      postgres_db: graph-node
      ipfs: 'ipfs:5001'
      ethereum: 'fushuma:https://rpc.fushuma.com'
      GRAPH_LOG: info
  ipfs:
    image: ipfs/kubo:v0.14.0
    ports:
      - '5001:5001'
  postgres:
    image: postgres
    ports:
      - '5432:5432'
    environment:
      POSTGRES_USER: graph-node
      POSTGRES_PASSWORD: let-me-in
      POSTGRES_DB: graph-node
```

2. Deploy to local node:

```bash
npm run create-local
npm run deploy-local
```

### Option 3: Goldsky (Subgraph-as-a-Service)

```bash
# Install Goldsky CLI
curl https://goldsky.com | sh

# Login
goldsky login

# Deploy
goldsky subgraph deploy fumaswap-v4/1.0.0 --path .
```

## Network Configuration

Add Fushuma to your graph-node configuration if not already supported:

```json
{
  "network": "fushuma",
  "chainId": 121224,
  "rpc": "https://rpc.fushuma.com"
}
```

## Example Queries

### Get Global Statistics
```graphql
{
  factory(id: "factory") {
    poolCount
    txCount
    totalVolumeUSD
    totalFeesUSD
    totalValueLockedUSD
  }
}
```

### Get Pools with Volume
```graphql
{
  pools(first: 10, orderBy: volumeUSD, orderDirection: desc) {
    id
    token0 { symbol }
    token1 { symbol }
    volumeUSD
    feesUSD
    totalValueLockedUSD
  }
}
```

### Get Pool Day Data (Historical)
```graphql
{
  poolDayDatas(
    first: 30
    orderBy: date
    orderDirection: desc
    where: { pool: "0x..." }
  ) {
    date
    volumeUSD
    tvlUSD
    feesUSD
    open
    high
    low
    close
  }
}
```

### Get Recent Swaps
```graphql
{
  swaps(first: 20, orderBy: timestamp, orderDirection: desc) {
    id
    timestamp
    pool {
      token0 { symbol }
      token1 { symbol }
    }
    amount0
    amount1
    amountUSD
  }
}
```

### Get User Positions
```graphql
{
  positions(where: { owner: "0x..." }) {
    id
    liquidity
    depositedToken0
    depositedToken1
    collectedFeesToken0
    collectedFeesToken1
  }
}
```

## Integration with Frontend

After deploying, update the DeFi router to use the subgraph:

```typescript
// src/lib/subgraph.ts
const SUBGRAPH_URL = 'https://api.thegraph.com/subgraphs/name/fushuma/fumaswap-v4';

export async function querySubgraph(query: string, variables = {}) {
  const response = await fetch(SUBGRAPH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  const data = await response.json();
  return data.data;
}
```

## Troubleshooting

### Subgraph not syncing
- Verify RPC endpoint is accessible
- Check contract addresses are correct
- Ensure startBlock is before contract deployment

### Missing data
- The subgraph only indexes data from `startBlock` onwards
- Historical data before deployment is not available

### Price calculations
- Prices are derived from sqrtPriceX96
- USD values use FUMA price (currently hardcoded at $0.0015)
- For accurate USD pricing, integrate a price oracle

## License

MIT
