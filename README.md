# Fushuma Governance Hub V2

> The nexus for community interaction, governance, and economic activity in the Fushuma ecosystem

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/)
[![Fushuma Network](https://img.shields.io/badge/Network-Fushuma-6366f1)](https://fushuma.com)

## 🌟 Overview

Fushuma Governance Hub V2 is a modern, high-performance decentralized governance platform built with Next.js 16, React 19, and the latest Web3 technologies. This is a complete rewrite of the original governance hub, leveraging server-side rendering, optimized performance, and enhanced security.

### Key Features

- **🗳️ Decentralized Governance**: Vote on proposals and shape the future of Fushuma
- **🚀 Project Launchpad**: Discover and support new projects seeking funding
- **💰 Development Grants**: Apply for or review grant applications with GitHub integration
- **💬 Community Discussion**: Engage with the Fushuma community
- **📰 News & Updates**: Stay informed about ecosystem developments
- **🌐 Ecosystem Directory**: Explore all projects built on Fushuma
- **🔐 Web3 Wallet Authentication**: Secure wallet-based sign-in
- **⚡ Lightning Fast**: Server-side rendering for optimal performance
- **🎨 Modern UI**: Beautiful, responsive design with dark mode support

## 🏗️ Tech Stack

**Framework**: Next.js 16 (App Router)  
**Language**: TypeScript 5.9  
**Styling**: Tailwind CSS 4.1 + Radix UI  
**Web3**: wagmi 2.18 + viem 2.38 + RainbowKit 2.2  
**API**: tRPC 11 (Type-safe API layer)  
**Database**: MySQL + Drizzle ORM  
**State Management**: TanStack Query 5.90  
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
│   │   ├── layout.tsx         # Root layout
│   │   ├── page.tsx           # Home page
│   │   └── providers.tsx      # React providers
│   ├── components/            # React components
│   │   ├── ui/               # Reusable UI components
│   │   └── layout/           # Layout components
│   ├── lib/                   # Utilities and configurations
│   │   ├── trpc/             # tRPC client setup
│   │   ├── web3/             # Web3 configuration
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
└── package.json              # Dependencies
```

## 🔐 Security

- **Never commit credentials**: All sensitive data should be in `.env.local` (gitignored)
- **Environment variables**: Use `.env.example` as a template
- **JWT secrets**: Generate strong, random secrets for production
- **Wallet authentication**: Secure Web3 wallet-based authentication
- **HTTPS only**: Always use HTTPS in production
- **Security headers**: Configured in `next.config.ts`

## 🚢 Deployment

### Ubuntu Server Deployment

1. **Server Requirements**
   - Ubuntu 22.04 LTS
   - Node.js 22+
   - pnpm 10+
   - MySQL 8.0+
   - Nginx

2. **Deployment Steps**

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

3. **Configure Nginx** (reverse proxy)

```nginx
server {
    listen 80;
    server_name governance.fushuma.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

4. **Set up SSL** with Let's Encrypt

```bash
sudo certbot --nginx -d governance.fushuma.com
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

**Important**: Never commit files containing credentials or secrets!

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- [GitHub Repository](https://github.com/Fushuma/fushuma-gov-hub-v2)
- [Fushuma Network](https://fushuma.com)
- [Documentation](https://docs.fushuma.com)

## 📞 Support

- **Website**: https://fushuma.com
- **Governance**: https://governance.fushuma.com
- **Community**: Join our community channels

---

Built with ❤️ by the Fushuma Community

