# Fushuma Governance Hub V2

> The unified platform for governance, DeFi, and community interaction in the Fushuma ecosystem

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/)
[![Fushuma Network](https://img.shields.io/badge/Network-Fushuma-6366f1)](https://fushuma.com)

## 🌟 Overview

Fushuma Governance Hub V2 is a comprehensive, high-performance decentralized platform built with Next.js 16, React 19, and the latest Web3 technologies. This unified platform combines governance features with a complete DeFi suite, providing users with everything they need to participate in the Fushuma ecosystem.

### Key Features

**Governance:**
- **🗳️ Decentralized Governance**: Vote on proposals and shape the future of Fushuma
- **🚀 Project Launchpad**: Discover and support new projects seeking funding
- **💰 Development Grants**: Apply for or review grant applications with GitHub integration
- **💬 Community Discussion**: Engage with the Fushuma community
- **📰 News & Updates**: Stay informed about ecosystem developments
- **🌐 Ecosystem Directory**: Explore all projects built on Fushuma

**DeFi Suite:**
- **💱 Token Swap**: Trade tokens with optimal routing and low slippage
- **💧 Liquidity Pools**: Provide liquidity and earn fees
- **🌾 Yield Farming**: Stake LP tokens and earn rewards
- **🔒 Staking**: Single-asset staking with competitive APY
- **🔄 Migration Tools**: Seamlessly migrate between protocol versions
- **🚀 Token Launchpad**: Participate in new token launches

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
**DeFi**: Uniswap V3 SDK + Soy SDK  
**Charts**: Chart.js 4.5  
**Blockchain**: Fushuma Network (Chain ID: 121224)

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

## 📝 Environment Variables

**CRITICAL**: Never commit `.env.local` or any file containing real credentials to the repository!

Create a `.env.local` file based on `.env.example` and fill in your actual values:

```bash
# Database (replace with your actual credentials)
DATABASE_URL=mysql://user:password@localhost:3306/fushuma_governance

# JWT Secret (generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
JWT_SECRET=your-generated-secret-here

# WalletConnect Project ID (get from https://cloud.walletconnect.com)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your-project-id

# GitHub Token (for grants sync - create at https://github.com/settings/tokens)
GITHUB_TOKEN=your-github-token

# Admin wallet address
ADMIN_WALLET_ADDRESS=0xYourAdminWalletAddress
```

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

## 🗂️ Project Structure

```
fushuma-gov-hub-v2/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── api/trpc/          # tRPC API endpoint
│   │   ├── defi/              # DeFi pages (swap, liquidity, farms, etc.)
│   │   ├── governance/        # Governance pages
│   │   ├── grants/            # Grants pages
│   │   ├── layout.tsx         # Root layout
│   │   ├── page.tsx           # Home page
│   │   └── providers.tsx      # React providers
│   ├── components/            # React components
│   │   ├── ui/               # Reusable UI components
│   │   ├── layout/           # Layout components
│   │   └── defi/             # DeFi-specific components
│   ├── lib/                   # Utilities and configurations
│   │   ├── trpc/             # tRPC client setup
│   │   ├── web3/             # Web3 configuration
│   │   ├── defi/             # DeFi utilities, hooks, stores
│   │   └── utils.ts          # Helper functions
│   ├── hooks/                 # Custom React hooks
│   └── contexts/              # React contexts
├── server/                    # Backend logic
│   ├── routers/              # tRPC routers
│   ├── db/                   # Database operations
│   ├── services/             # Background services
│   └── trpc.ts               # tRPC setup
├── drizzle/                   # Database schemas
├── public/                    # Static assets
├── DEFI-INTEGRATION.md       # DeFi integration documentation
└── package.json              # Dependencies
```

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

## 🚢 Deployment

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

The platform integrates a complete DeFi suite from FuDEFI, providing:

- **Unified Navigation**: Seamless access to both governance and DeFi features
- **Shared Authentication**: Single wallet connection for all features
- **Consistent UI/UX**: Unified design language across all features
- **Optimized Performance**: Server-side rendering and code splitting

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
- **Fushuma Network**: https://fushuma.com
- **Documentation**: https://docs.fushuma.com
- **Chain Explorer**: https://fumascan.com

## 📞 Support

- **Website**: https://fushuma.com
- **Governance**: https://governance.fushuma.com
- **Community**: Join our community channels
- **Issues**: https://github.com/Fushuma/fushuma-gov-hub-v2/issues

---

Built with ❤️ by the Fushuma Community

