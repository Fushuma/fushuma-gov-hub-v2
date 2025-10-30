#!/bin/bash

# Fushuma Governance Hub V2 - Deployment Script
# This script deploys V2 with all V1 features to Azure server

set -e  # Exit on error

echo "🚀 Starting Fushuma Governance Hub V2 deployment..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
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
pnpm install --prod

echo "🏗️  Building application..."
pnpm build

echo "🛑 Stopping old process..."
# Kill any running nohup processes on port 3001
pkill -f "PORT=3001" || true
# Stop PM2 process if exists
pm2 delete fushuma-gov-v2 2>/dev/null || true
pm2 delete fushuma-v2 2>/dev/null || true

echo "🚀 Starting with PM2..."
pm2 start ecosystem.config.cjs
pm2 save

echo "✅ Deployment complete!"
echo "📊 Process status:"
pm2 list
pm2 logs fushuma-gov-v2 --lines 20

ENDSSH

echo -e "${GREEN}✅ Deployment successful!${NC}"
echo -e "${BLUE}🌐 V2 should now be running at: https://governance2.fushuma.com${NC}"
echo ""
echo "To check logs:"
echo "  ssh -i $SSH_KEY ${REMOTE_USER}@${REMOTE_HOST} 'pm2 logs fushuma-gov-v2'"
echo ""
echo "To restart:"
echo "  ssh -i $SSH_KEY ${REMOTE_USER}@${REMOTE_HOST} 'pm2 restart fushuma-gov-v2'"
