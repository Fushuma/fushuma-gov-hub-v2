# Deployment Guide - Fushuma Governance Hub V2

This guide provides step-by-step instructions for deploying the Fushuma Governance Hub V2 on an Ubuntu server.

## Prerequisites

- Ubuntu 22.04 LTS server
- Root or sudo access
- Domain name pointed to your server
- Basic knowledge of Linux command line

## Step 1: Server Preparation

### 1.1 Update System

```bash
sudo apt update && sudo apt upgrade -y
```

### 1.2 Install Node.js 22

```bash
# Install Node.js 22 via NodeSource
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version  # Should be v22.x.x
npm --version
```

### 1.3 Install pnpm

```bash
npm install -g pnpm@latest
pnpm --version  # Should be 10.x.x or higher
```

### 1.4 Install MySQL

```bash
sudo apt install mysql-server -y
sudo mysql_secure_installation

# Create database
sudo mysql -u root -p
```

In MySQL console:

```sql
CREATE DATABASE fushuma_governance;
CREATE USER 'fushuma'@'localhost' IDENTIFIED BY 'your-secure-password';
GRANT ALL PRIVILEGES ON fushuma_governance.* TO 'fushuma'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 1.5 Install PM2

```bash
npm install -g pm2
```

### 1.6 Install Nginx

```bash
sudo apt install nginx -y
sudo systemctl enable nginx
sudo systemctl start nginx
```

### 1.7 Install Git

```bash
sudo apt install git -y
```

## Step 2: Clone and Setup Application

### 2.1 Clone Repository

```bash
cd /var/www
sudo git clone https://github.com/Fushuma/fushuma-gov-hub-v2.git
cd fushuma-gov-hub-v2
```

### 2.2 Set Permissions

```bash
sudo chown -R $USER:$USER /var/www/fushuma-gov-hub-v2
```

### 2.3 Install Dependencies

```bash
pnpm install --frozen-lockfile
```

### 2.4 Configure Environment Variables

**CRITICAL**: Never copy environment files from development or commit them to Git!

```bash
# Create production environment file
nano .env.local
```

Add the following (replace with your actual production values):

```bash
# Database Configuration
DATABASE_URL=mysql://fushuma:your-secure-password@localhost:3306/fushuma_governance

# JWT Secret - Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET=your-generated-64-character-hex-string

# Application Settings
NODE_ENV=production
PORT=3000
NEXT_PUBLIC_APP_URL=https://governance.fushuma.com
NEXT_PUBLIC_APP_TITLE=Fushuma Governance Hub

# Blockchain Configuration
NEXT_PUBLIC_FUSHUMA_CHAIN_ID=121224
NEXT_PUBLIC_FUSHUMA_RPC_URL=https://rpc.fushuma.com
NEXT_PUBLIC_FUSHUMA_EXPLORER=https://fumascan.com

# WalletConnect Project ID
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your-walletconnect-project-id

# GitHub Integration
GITHUB_TOKEN=your-github-personal-access-token
GITHUB_REPO_OWNER=Fushuma
GITHUB_REPO_NAME=Dev_grants

# Redis (if using)
REDIS_URL=redis://localhost:6379

# Admin Configuration
ADMIN_WALLET_ADDRESS=0xYourAdminWalletAddress
```

**Security Checklist**:
- ✅ Generated a strong JWT secret
- ✅ Used a secure database password
- ✅ Set correct production URL
- ✅ File permissions are restrictive (600)

```bash
# Secure the environment file
chmod 600 .env.local
```

### 2.5 Set Up Database

```bash
pnpm db:push
```

### 2.6 Build Application

```bash
pnpm build
```

## Step 3: Configure PM2

### 3.1 Start Application with PM2

```bash
pm2 start pnpm --name "fushuma-hub" -- start
```

### 3.2 Configure PM2 Startup

```bash
pm2 save
pm2 startup
# Follow the instructions provided by the command
```

### 3.3 Verify Application is Running

```bash
pm2 status
pm2 logs fushuma-hub
```

## Step 4: Configure Nginx

### 4.1 Create Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/fushuma-hub
```

Add the following configuration:

```nginx
server {
    listen 80;
    server_name governance.fushuma.com;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Increase max upload size if needed
    client_max_body_size 10M;
}
```

### 4.2 Enable Site

```bash
sudo ln -s /etc/nginx/sites-available/fushuma-hub /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Step 5: Set Up SSL with Let's Encrypt

### 5.1 Install Certbot

```bash
sudo apt install certbot python3-certbot-nginx -y
```

### 5.2 Obtain SSL Certificate

```bash
sudo certbot --nginx -d governance.fushuma.com
```

Follow the prompts and choose to redirect HTTP to HTTPS.

### 5.3 Verify Auto-Renewal

```bash
sudo certbot renew --dry-run
```

## Step 6: Set Up Firewall

```bash
sudo ufw allow 'Nginx Full'
sudo ufw allow OpenSSH
sudo ufw enable
sudo ufw status
```

## Step 7: Monitoring and Maintenance

### 7.1 View Logs

```bash
# PM2 logs
pm2 logs fushuma-hub

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### 7.2 Restart Application

```bash
pm2 restart fushuma-hub
```

### 7.3 Update Application

```bash
cd /var/www/fushuma-gov-hub-v2
git pull origin main
pnpm install
pnpm build
pm2 restart fushuma-hub
```

### 7.4 Database Backup

```bash
# Create backup script
sudo nano /usr/local/bin/backup-fushuma-db.sh
```

Add:

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/fushuma"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR
mysqldump -u fushuma -p'your-password' fushuma_governance > $BACKUP_DIR/fushuma_$DATE.sql
# Keep only last 7 days of backups
find $BACKUP_DIR -name "fushuma_*.sql" -mtime +7 -delete
```

Make executable and add to cron:

```bash
sudo chmod +x /usr/local/bin/backup-fushuma-db.sh
sudo crontab -e
# Add: 0 2 * * * /usr/local/bin/backup-fushuma-db.sh
```

## Troubleshooting

### Application Won't Start

```bash
# Check logs
pm2 logs fushuma-hub --lines 100

# Check environment variables
cat .env.local

# Rebuild
pnpm build
pm2 restart fushuma-hub
```

### Database Connection Issues

```bash
# Test MySQL connection
mysql -u fushuma -p fushuma_governance

# Check DATABASE_URL in .env.local
```

### Nginx Issues

```bash
# Test configuration
sudo nginx -t

# Check error logs
sudo tail -f /var/log/nginx/error.log
```

### SSL Certificate Issues

```bash
# Renew manually
sudo certbot renew --force-renewal
```

## Security Best Practices

1. **Never commit `.env.local`** to version control
2. **Rotate secrets regularly** (JWT secret, database password)
3. **Keep system updated**: `sudo apt update && sudo apt upgrade`
4. **Monitor logs** for suspicious activity
5. **Use strong passwords** for database and admin accounts
6. **Enable firewall** and only allow necessary ports
7. **Regular backups** of database and application files
8. **Use SSH keys** instead of password authentication

## Performance Optimization

### Enable Gzip in Nginx

Add to Nginx config:

```nginx
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json;
```

### Set Up Redis (Optional but Recommended)

```bash
sudo apt install redis-server -y
sudo systemctl enable redis-server
sudo systemctl start redis-server
```

Update `.env.local`:

```bash
REDIS_URL=redis://localhost:6379
```

## Support

If you encounter issues:

1. Check the logs: `pm2 logs fushuma-hub`
2. Review this guide carefully
3. Check GitHub issues: https://github.com/Fushuma/fushuma-gov-hub-v2/issues
4. Contact the development team

---

**Remember**: Never share your `.env.local` file or commit it to version control!

