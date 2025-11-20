# Fushuma Governance Hub V2

**Last Updated:** November 20, 2025

> The unified platform for governance, DeFi, and community interaction in the Fushuma ecosystem

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/)
[![Fushuma Network](https://img.shields.io/badge/Network-Fushuma-6366f1)](https://fushuma.com)
[![Deployment](https://img.shields.io/badge/Deployment-100%25%20Complete-brightgreen)](https://governance2.fushuma.com)

## 🌟 Overview

Fushuma Governance Hub V2 is a comprehensive, high-performance decentralized platform built with Next.js 16, React 19, and the latest Web3 technologies. This unified platform combines governance features with a complete DeFi suite, providing users with everything they need to participate in the Fushuma ecosystem.

**Live Platform**: [https://governance2.fushuma.com](https://governance2.fushuma.com)

**✅ Platform Status**: Fully deployed and operational with all 22 essential smart contracts live on Fushuma zkEVM+ Mainnet!

### Key Features

**Governance:**
- **🗳️ Decentralized Governance**: Vote on proposals and shape the future of Fushuma
- **🚀 Project Launchpad**: Discover and support new projects seeking funding
- **💰 Development Grants**: Apply for or review grant applications with GitHub integration
- **💬 Community Discussion**: Engage with the Fushuma community
- **📰 News & Updates**: Stay informed about ecosystem developments
- **🌐 Ecosystem Directory**: Explore all projects built on Fushuma

**DeFi Suite (FumaSwap V4) - ✅ Fully Deployed!**
- **💱 Token Swap**: Trade tokens with optimal routing and low slippage
- **💧 Liquidity Pools**: Provide liquidity and earn fees (CL & Bin pools)
- **🌾 Yield Farming**: Stake LP tokens and earn rewards
- **🔒 Staking**: Single-asset staking with competitive APY
- **📊 Position Management**: Manage concentrated liquidity positions as NFTs
- **🔄 Multi-Pool Support**: Both concentrated liquidity and bin-based pools

**Platform Features:**
- **🔐 Web3 Wallet Authentication**: Secure wallet-based sign-in
- **⚡ Lightning Fast**: Server-side rendering for optimal performance
- **🎨 Modern UI**: Beautiful, responsive design with dark mode support
- **🔗 Unified Experience**: Single platform for all Fushuma activities

## 🏗️ Tech Stack

**Framework**: Next.js 16 (App Router)  
**Language**: TypeScript 5.9  
**Styling**: Tailwind CSS 4.1 + Radix UI  
**Web3**: wagmi 2.18 + viem 2.38 + RainbowKit 2.2  
**API**: tRPC 11 (Type-safe API layer)  
**Database**: MySQL + Drizzle ORM  
**State Management**: TanStack Query 5.90 + Zustand 5.0  
**DeFi**: PancakeSwap V4 (Infinity) SDK  
**Charts**: Chart.js 4.5  
**Blockchain**: Fushuma zkEVM+ Mainnet (Chain ID: 121224)

## 🚀 Quick Start

### Prerequisites

- Node.js 22.0.0 or higher
- pnpm 10.0.0 or higher
- MySQL 8.0 or higher

### Installation

```bash
# Clone the repository
git clone https://github.com/Fushuma/fushuma-gov-hub-v2.git
cd fushuma-gov-hub-v2

# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env.local

# Edit .env.local with your configuration
# IMPORTANT: Never commit .env.local or any file with real credentials!

# Set up database
pnpm db:push

# Run development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📦 Available Scripts

```bash
pnpm dev          # Start development server
pnpm build        # Build for production
pnpm start        # Start production server
pnpm lint         # Run ESLint
pnpm type-check   # Run TypeScript type checking
pnpm db:push      # Push database schema changes
pnpm db:studio    # Open Drizzle Studio (database GUI)
```

## 🔗 Deployed Smart Contracts

### Governance Contracts (✅ Fully Deployed)

All governance contracts are deployed and operational on Fushuma zkEVM+ Mainnet:

- **VotingEscrow**: `0x80Ebf301efc7b0FF1825dC3B4e8d69e414eaa26f`
- **EpochManager**: `0x36C3b4EA7dC2622b8C63a200B60daC0ab2d8f453`
- **GovernanceCouncil**: `0x92bCcdcae7B73A5332429e517D26515D447e9997`
- **FushumaGovernor**: `0xF36107b3AA203C331284E5A467C1c58bDD5b591D`
- **GaugeController**: `0x41E7ba36C43CCd4b83a326bB8AEf929e109C9466`
- **GrantGauge**: `0x0D6833778cf1fa803D21075b800483F68f57A153`

### DeFi Contracts (⚠️ Core Redeployed - Shanghai EVM Compatible)

**Core Contracts (November 20, 2025 - Shanghai EVM):**
- **Vault**: `0x9c6bAfE545fF2d31B0abef12F4724DCBfB08c839`
- **CLPoolManager**: `0x2D691Ff314F7BB2Ce9Aeb94d556440Bb0DdbFe1e`
- **BinPoolManager**: `0xD5F370971602DB2D449a6518f55fCaFBd1a51143`

**⚠️ Important**: Core contracts have been redeployed with Shanghai EVM adaptations. Periphery contracts below are from the old deployment and need to be redeployed.

**Concentrated Liquidity Periphery:**
- **CLQuoter**: `0x9C82E4098805a00eAE3CE96D1eBFD117CeB1fAF8`
- **CLPositionDescriptor**: `0x181267d849a0a89bC45F4e96F70914AcFb631515`
- **CLPositionManager**: `0x411755EeC7BaA85F8d6819189FE15d966F41Ad85`

**Bin Pool Periphery:**
- **BinQuoter**: `0x24cc1bc41220e638204216FdB4252b1D3716561D`
- **BinPositionManager**: `0x36eb7e5Ae00b2eEA50435084bb98Bb4Ebf5E2982`

**Router:**
- **InfinityRouter**: `0x9E98f794bd1c4161898013fa0DEE406B7b06aB6B`

**Supporting Contracts:**
- **Permit2**: `0x1d5E963f9581F5416Eae6C9978246B7dDf559Ff0`
- **WFUMA**: `0xBcA7B11c788dBb85bE92627ef1e60a2A9B7e2c6E`

### Launchpad & Bridge (✅ Deployed)

- **LaunchpadProxy**: `0x206236eca2dF8FB37EF1d024e1F72f4313f413E4`
- **VestingImplementation**: `0x0d8e696475b233193d21E565C21080EbF6A3C5DA`
- **Bridge**: `0x7304ac11BE92A013dA2a8a9D77330eA5C1531462`

### Payment Tokens (✅ Deployed)

- **USDC**: `0xf8EA5627691E041dae171350E8Df13c592084848`
- **USDT**: `0x1e11d176117dbEDbd234b1c6a10C6eb8dceD275e`

**Note**: Core contracts have been redeployed with Shanghai EVM adaptations using the Storage-as-Transient pattern (November 20, 2025). Periphery contracts need to be redeployed to work with the new core contracts. Frontend integration requires updating contract addresses in `src/lib/fumaswap/contracts.ts`.

See [src/lib/governance/contracts.ts](src/lib/governance/contracts.ts) and [src/lib/fumaswap/contracts.ts](src/lib/fumaswap/contracts.ts) for complete contract addresses and configuration.

## 🎯 Feature Routes

### Governance
- `/` - Home page
- `/governance` - Governance proposals
- `/grants` - Development grants
- `/launchpad` - Project launchpad
- `/news` - News and updates
- `/ecosystem` - Ecosystem directory
- `/community` - Community hub

### DeFi
- `/defi/swap` - Token swap
- `/defi/liquidity` - Liquidity pools
- `/defi/farms` - Yield farming
- `/defi/staking` - Token staking
- `/defi/migrate` - Migration tools
- `/defi/launchpads` - Token launches

## 🔐 Security

- **Never commit credentials**: All sensitive data should be in `.env.local` (gitignored)
- **Environment variables**: Use `.env.example` as a template
- **JWT secrets**: Generate strong, random secrets for production
- **Wallet authentication**: Secure Web3 wallet-based authentication
- **HTTPS only**: Always use HTTPS in production
- **Security headers**: Configured in `next.config.ts`
- **Smart contract interactions**: All transactions require wallet signatures
- **⚠️ Audit Status**: Smart contracts have NOT been professionally audited yet

## 🚢 Deployment

### Production Deployment

The platform is currently deployed at: **[https://governance2.fushuma.com](https://governance2.fushuma.com)**

### Ubuntu Server Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for complete deployment instructions.

Quick deployment steps:

```bash
# On your server
git clone https://github.com/Fushuma/fushuma-gov-hub-v2.git
cd fushuma-gov-hub-v2

# Install dependencies
pnpm install

# Create .env.local with production values
# NEVER copy from development - use secure production credentials!
nano .env.local

# Build application
pnpm build

# Start with PM2
pm2 start pnpm --name "fushuma-hub" -- start
pm2 save
pm2 startup
```

## 📚 Documentation

- **[README.md](./README.md)** - This file, project overview
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Ubuntu server deployment guide
- **[DEFI-INTEGRATION.md](./DEFI-INTEGRATION.md)** - DeFi integration details
- **[SECURITY.md](./SECURITY.md)** - Security best practices
- **[SETUP-SUMMARY.md](./SETUP-SUMMARY.md)** - Quick setup guide
- **[SMART_CONTRACT_DEPLOYMENT.md](./SMART_CONTRACT_DEPLOYMENT.md)** - Smart contract deployment info
- **[.env.example](./.env.example)** - Environment variable template

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

**Important**: Never commit files containing credentials or secrets!

## 🔗 Integration Details

### DeFi Integration

The platform integrates a complete DeFi suite based on PancakeSwap V4 (Infinity), providing:

- **Unified Navigation**: Seamless access to both governance and DeFi features
- **Shared Authentication**: Single wallet connection for all features
- **Consistent UI/UX**: Unified design language across all features
- **Optimized Performance**: Server-side rendering and code splitting
- **Paris EVM Compatible**: Modified contracts for zkEVM+ compatibility

See [DEFI-INTEGRATION.md](./DEFI-INTEGRATION.md) for detailed integration documentation.

### Technology Integration

- **Web3 Stack**: Shared wagmi/viem configuration for governance and DeFi
- **State Management**: TanStack Query for server state, Zustand for client state
- **UI Components**: Radix UI + Tailwind CSS for consistent design
- **API Layer**: tRPC for type-safe governance APIs
- **Charts**: Chart.js for DeFi analytics and governance metrics

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- **Repository**: https://github.com/Fushuma/fushuma-gov-hub-v2
- **Smart Contracts**: https://github.com/Fushuma/fushuma-contracts
- **Live Platform**: https://governance2.fushuma.com
- **Fushuma Network**: https://fushuma.com
- **Documentation**: https://docs.fushuma.com
- **Chain Explorer**: https://fumascan.com

## 📞 Support

- **Website**: https://fushuma.com
- **Governance Hub**: https://governance2.fushuma.com
- **Community**: Join our community channels
- **Issues**: https://github.com/Fushuma/fushuma-gov-hub-v2/issues

---

Built with ❤️ by the Fushuma Community
