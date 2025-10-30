#!/bin/bash

# Fushuma Governance Hub V2 - Deployment Script
# This script deploys V2 with all core governance features to Azure server

set -e  # Exit on error

echo "🚀 Starting Fushuma Governance Hub V2 deployment..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
REMOTE_USER="azureuser"
REMOTE_HOST="40.124.72.151"
REMOTE_DIR="/home/azureuser/fushuma-gov-hub-v2"
SSH_KEY="/home/ubuntu/upload/fushuma-governance-key_1.pem"

echo -e "${BLUE}📦 Step 1: Preparing local files...${NC}"

# Ensure we're in the project directory
cd /home/ubuntu/fushuma-gov-hub-v2

# Create a tarball of the updated files (excluding node_modules and .next)
echo "Creating deployment package..."
tar -czf /tmp/v2-deployment.tar.gz \
  --exclude='node_modules' \
  --exclude='.next' \
  --exclude='.git' \
  --exclude='*.log' \
  .

echo -e "${GREEN}✅ Deployment package created${NC}"

echo -e "${BLUE}📤 Step 2: Uploading to server...${NC}"

# Set correct permissions for SSH key
chmod 600 "$SSH_KEY"

# Upload the tarball
scp -i "$SSH_KEY" -o StrictHostKeyChecking=no \
  /tmp/v2-deployment.tar.gz \
  ${REMOTE_USER}@${REMOTE_HOST}:/tmp/

echo -e "${GREEN}✅ Files uploaded${NC}"

echo -e "${BLUE}🔧 Step 3: Deploying on server...${NC}"

# Execute deployment commands on remote server
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no ${REMOTE_USER}@${REMOTE_HOST} << 'ENDSSH'
set -e

echo "📂 Extracting files..."
cd /home/azureuser/fushuma-gov-hub-v2
tar -xzf /tmp/v2-deployment.tar.gz
rm /tmp/v2-deployment.tar.gz

echo "📦 Installing dependencies..."
pnpm install

echo "🗄️  Setting up database..."
# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "⚠️  Warning: .env.local not found!"
    echo "Please create .env.local with DATABASE_URL and other environment variables"
    echo "See .env.example for reference"
else
    echo "Pushing database schema..."
    pnpm db:push || echo "⚠️  Database push failed - may need manual setup"
fi

echo "🏗️  Building application..."
pnpm build

echo "🛑 Stopping old process..."
# Stop PM2 process if exists
pm2 delete fushuma-gov-v2 2>/dev/null || true
pm2 delete fushuma-v2 2>/dev/null || true
pm2 delete fushuma-gov 2>/dev/null || true

echo "🚀 Starting with PM2..."
# Check if ecosystem.config.cjs exists, otherwise use npm start
if [ -f ecosystem.config.cjs ]; then
    pm2 start ecosystem.config.cjs
else
    pm2 start npm --name "fushuma-gov-v2" -- start
fi
pm2 save

echo "✅ Deployment complete!"
echo "📊 Process status:"
pm2 list
echo ""
echo "📝 Recent logs:"
pm2 logs fushuma-gov-v2 --lines 20 --nostream || pm2 logs --lines 20 --nostream

ENDSSH

echo -e "${GREEN}✅ Deployment successful!${NC}"
echo -e "${BLUE}🌐 V2 should now be running at: https://governance2.fushuma.com${NC}"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANT: Database Setup${NC}"
echo "If this is the first deployment, you need to:"
echo "1. SSH to server: ssh -i $SSH_KEY ${REMOTE_USER}@${REMOTE_HOST}"
echo "2. Create .env.local with DATABASE_URL"
echo "3. Run: pnpm db:push"
echo "4. Optionally seed data: pnpm db:seed"
echo "5. Restart: pm2 restart fushuma-gov-v2"
echo ""
echo "To check logs:"
echo "  ssh -i $SSH_KEY ${REMOTE_USER}@${REMOTE_HOST} 'pm2 logs fushuma-gov-v2'"
echo ""
echo "To restart:"
echo "  ssh -i $SSH_KEY ${REMOTE_USER}@${REMOTE_HOST} 'pm2 restart fushuma-gov-v2'"
