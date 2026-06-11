# Fushuma Governance Hub V2 - Implementation Guide

This guide provides step-by-step instructions for deploying and running the Fushuma Governance Hub V2 application.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Local Development Setup](#local-development-setup)
3. [Database Setup](#database-setup)
4. [Environment Configuration](#environment-configuration)
5. [Running the Application](#running-the-application)
6. [Database Seeding](#database-seeding)
7. [Deployment to Azure](#deployment-to-azure)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** v18 or higher
- **pnpm** v8 or higher
- **MySQL** v8.0 or higher (or access to a MySQL database)
- **Git** for version control

## Local Development Setup

### 1. Clone the Repository

```bash
git clone https://github.com/Fushuma/fushuma-gov-hub-v2.git
cd fushuma-gov-hub-v2
```

### 2. Install Dependencies

```bash
pnpm install
```

This will install all required dependencies including Next.js, tRPC, Drizzle ORM, and UI libraries.

---

## Database Setup

### 1. Create MySQL Database

Create a new MySQL database for the application:

```sql
CREATE DATABASE fushuma_governance;
```

### 2. Configure Database Connection

Copy the `.env.example` file to `.env.local`:

```bash
cp .env.example .env.local
```

### 3. Update Database URL

Edit `.env.local` and update the `DATABASE_URL`:

```env
DATABASE_URL=mysql://username:password@localhost:3306/fushuma_governance
```

Replace `username`, `password`, `localhost`, and `fushuma_governance` with your actual database credentials.

### 4. Push Database Schema

Run the following command to create all database tables:

```bash
pnpm db:push
```

This will create the following tables:
- `users` - User accounts and authentication
- `proposals` - Governance proposals
- `proposalVotes` - Votes on proposals
- `developmentGrants` - Grant applications
- `newsFeed` - News and announcements
- `ecosystemProjects` - Ecosystem project listings
- `communityContent` - Community discussions
- `launchpadProjects` - Token launchpad projects

---

## Environment Configuration

### Required Environment Variables

Edit your `.env.local` file and configure the following variables:

```env
# Database
DATABASE_URL=mysql://username:password@localhost:3306/fushuma_governance

# JWT Secret (generate a secure random string)
JWT_SECRET=your-very-long-secure-random-string-at-least-32-characters-long

# Application Settings
NODE_ENV=development
PORT=3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_TITLE=Fushuma Governance Hub

# Blockchain Configuration
NEXT_PUBLIC_FUSHUMA_CHAIN_ID=121224
NEXT_PUBLIC_FUSHUMA_RPC_URL=https://rpc.fushuma.com
NEXT_PUBLIC_FUSHUMA_EXPLORER=https://fumascan.com

# WalletConnect Project ID
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your-walletconnect-project-id

# GitHub Integration (optional)
GITHUB_TOKEN=your-github-personal-access-token
GITHUB_REPO_OWNER=Fushuma
GITHUB_REPO_NAME=Dev_grants

# Admin Configuration
ADMIN_WALLET_ADDRESS=0x0000000000000000000000000000000000000000
```

### Generate JWT Secret

You can generate a secure JWT secret using Node.js:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Get WalletConnect Project ID

1. Visit [https://cloud.walletconnect.com](https://cloud.walletconnect.com)
2. Create a new project
3. Copy the Project ID

---

## Running the Application

### Development Mode

Start the development server:

```bash
pnpm dev
```

The application will be available at [http://localhost:3000](http://localhost:3000)

### Production Build

Build the application for production:

```bash
pnpm build
pnpm start
```

---

## Database Seeding

To populate the database with sample data for testing:

```bash
pnpm db:seed
```

This will create:
- 1 test user
- 3 sample governance proposals
- 3 sample grant applications
- 4 news items

**Note:** Only run this on a fresh database or in development. Do not run on production with existing data.

---

## Deployment to Azure

### Prerequisites

- Azure account with an active subscription
- Azure CLI installed
- MySQL database (Azure Database for MySQL or external)

### Step 1: Prepare the Application

1. Update `.env.local` with production values
2. Build the application:

```bash
pnpm build
```

### Step 2: Create Azure Web App

Using Azure CLI:

```bash
# Login to Azure
az login

# Create a resource group
az group create --name fushuma-rg --location eastus

# Create an App Service plan
az appservice plan create \
  --name fushuma-plan \
  --resource-group fushuma-rg \
  --sku B1 \
  --is-linux

# Create the web app
az webapp create \
  --resource-group fushuma-rg \
  --plan fushuma-plan \
  --name fushuma-governance \
  --runtime "NODE:18-lts"
```

### Step 3: Configure Environment Variables

Set environment variables in Azure:

```bash
az webapp config appsettings set \
  --resource-group fushuma-rg \
  --name fushuma-governance \
  --settings \
    DATABASE_URL="mysql://user:pass@host:3306/db" \
    JWT_SECRET="your-secret" \
    NEXT_PUBLIC_APP_URL="https://governance2.fushuma.com" \
    # ... add all other environment variables
```

### Step 4: Deploy the Application

Deploy using Git:

```bash
# Add Azure remote
az webapp deployment source config-local-git \
  --name fushuma-governance \
  --resource-group fushuma-rg

# Get deployment credentials
az webapp deployment list-publishing-credentials \
  --name fushuma-governance \
  --resource-group fushuma-rg

# Push to Azure
git remote add azure <git-url-from-above>
git push azure main
```

### Step 5: Configure Custom Domain

```bash
# Add custom domain
az webapp config hostname add \
  --webapp-name fushuma-governance \
  --resource-group fushuma-rg \
  --hostname governance2.fushuma.com

# Enable HTTPS
az webapp update \
  --resource-group fushuma-rg \
  --name fushuma-governance \
  --https-only true
```

---

## Troubleshooting

### Database Connection Issues

**Problem:** Cannot connect to database

**Solution:**
1. Verify DATABASE_URL is correct
2. Check MySQL is running: `sudo systemctl status mysql`
3. Ensure user has proper permissions:

```sql
GRANT ALL PRIVILEGES ON fushuma_governance.* TO 'username'@'localhost';
FLUSH PRIVILEGES;
```

### Build Errors

**Problem:** TypeScript errors during build

**Solution:**
```bash
# Check for type errors
pnpm type-check

# Clear Next.js cache
rm -rf .next
pnpm build
```

### tRPC Connection Issues

**Problem:** tRPC endpoints returning 404

**Solution:**
1. Ensure `/api/trpc/[trpc]/route.ts` exists
2. Check `NEXT_PUBLIC_APP_URL` is set correctly
3. Verify the app router is properly configured

### Wallet Connection Issues

**Problem:** Wallet won't connect

**Solution:**
1. Verify `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` is set
2. Check `NEXT_PUBLIC_FUSHUMA_CHAIN_ID` matches the network
3. Ensure RainbowKit is properly configured in `providers.tsx`

### Database Schema Out of Sync

**Problem:** Database schema doesn't match code

**Solution:**
```bash
# Generate new migration
pnpm db:generate

# Push changes to database
pnpm db:push

# Or use Drizzle Studio to inspect
pnpm db:studio
```

---

## Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [tRPC Documentation](https://trpc.io/docs)
- [Drizzle ORM Documentation](https://orm.drizzle.team/docs/overview)
- [RainbowKit Documentation](https://www.rainbowkit.com/docs/introduction)
- [Fushuma Network Documentation](https://docs.fushuma.com)

---

## Support

For issues or questions:
- Open an issue on [GitHub](https://github.com/Fushuma/fushuma-gov-hub-v2/issues)
- Join our [Discord](https://discord.gg/fushuma)
- Contact the team on [Telegram](https://t.me/fushuma)
