#!/bin/bash

# InfluenceTie Backend EC2 Setup Script
echo "🚀 Setting up InfluenceTie Backend on AWS EC2..."
echo "================================================="

# Update system packages
echo "📦 Updating system packages..."
sudo yum update -y

# Install Node.js 18 LTS
echo "📦 Installing Node.js 18 LTS..."
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# Verify Node.js installation
node_version=$(node --version)
npm_version=$(npm --version)
echo "✅ Node.js installed: $node_version"
echo "✅ npm installed: $npm_version"

# Install Git
echo "📦 Installing Git..."
sudo yum install -y git

# Install PM2 globally for process management
echo "📦 Installing PM2..."
sudo npm install -g pm2

# Install PostgreSQL client
echo "📦 Installing PostgreSQL client..."
sudo yum install -y postgresql

# Create application directory
echo "📁 Creating application directory..."
sudo mkdir -p /opt/influencetie
sudo chown ec2-user:ec2-user /opt/influencetie
cd /opt/influencetie

# Clone repository (you'll need to replace this with your actual repo)
echo "📥 Cloning repository..."
# git clone https://github.com/yourusername/influencetie-backend.git .
echo "⚠️  Please clone your repository manually:"
echo "   git clone https://github.com/yourusername/influencetie-backend.git ."

# Create .env template
echo "📝 Creating environment template..."
cat > .env.template << EOF
# Database Configuration (replace with actual RDS endpoint)
DB_HOST=your-rds-endpoint.ap-south-1.rds.amazonaws.com
DB_PORT=5432
DB_NAME=influencetie_db
DB_USER=influencetie_admin
DB_PASSWORD=YourSecurePassword123!

# JWT Configuration  
JWT_SECRET=your-super-secure-jwt-secret-change-this-immediately
JWT_EXPIRES_IN=7d

# Server Configuration
PORT=3000
NODE_ENV=production
CORS_ORIGIN=https://your-frontend-domain.com

# AWS Configuration
AWS_REGION=ap-south-1
EOF

echo "⚠️  IMPORTANT: Copy .env.template to .env and update with actual values!"

# Install and configure Nginx
echo "🌐 Installing and configuring Nginx..."
sudo yum install -y nginx

# Create Nginx configuration
sudo tee /etc/nginx/conf.d/influencetie.conf > /dev/null <<EOF
server {
    listen 80;
    server_name _;  # Replace with your domain

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Referrer-Policy "strict-origin-when-cross-origin";

    # Rate limiting
    limit_req_zone \$binary_remote_addr zone=api:10m rate=10r/s;
    
    # Main application proxy
    location / {
        limit_req zone=api burst=20 nodelay;
        
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Health check endpoint (no rate limiting)
    location /health {
        proxy_pass http://localhost:3000/health;
        access_log off;
    }

    # API documentation endpoint
    location /docs {
        proxy_pass http://localhost:3000/docs;
    }
}
EOF

# Enable and start Nginx
sudo systemctl enable nginx
sudo systemctl start nginx

# Setup PM2 log rotation
echo "📝 Setting up log rotation..."
sudo tee /etc/logrotate.d/pm2 > /dev/null <<EOF
/home/ec2-user/.pm2/logs/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 0644 ec2-user ec2-user
    postrotate
        pm2 reloadLogs
    endscript
}
EOF

# Create deployment script for future updates
cat > deploy.sh << 'EOF'
#!/bin/bash
echo "🔄 Deploying InfluenceTie Backend..."

# Pull latest code
git pull origin main

# Install dependencies
npm install

# Build application
npm run build

# Restart application with PM2
pm2 restart influencetie-api || pm2 start dist/index.js --name "influencetie-api" --instances 2

# Reload Nginx
sudo systemctl reload nginx

echo "✅ Deployment complete!"
echo "📊 Status: pm2 status"
echo "📝 Logs: pm2 logs"
EOF

chmod +x deploy.sh

# Create monitoring script
cat > monitor.sh << 'EOF'
#!/bin/bash
echo "📊 InfluenceTie Backend Status"
echo "============================="

echo "🚀 PM2 Status:"
pm2 status

echo ""
echo "🌐 Nginx Status:"
sudo systemctl status nginx --no-pager

echo ""
echo "💾 Disk Usage:"
df -h

echo ""
echo "🧠 Memory Usage:"
free -h

echo ""
echo "⚡ CPU Usage:"
top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print "CPU Usage: " 100 - $1 "%"}'

echo ""
echo "🔗 Application Health:"
curl -s http://localhost:3000/health | jq '.' 2>/dev/null || curl -s http://localhost:3000/health

echo ""
echo "📈 Recent Logs (last 20 lines):"
pm2 logs influencetie-api --lines 20 --nostream
EOF

chmod +x monitor.sh

echo ""
echo "✅ EC2 setup complete!"
echo "🎯 Next steps:"
echo "1. Clone your repository: git clone https://github.com/yourusername/influencetie-backend.git ."
echo "2. Copy environment file: cp .env.template .env"
echo "3. Edit .env with your actual RDS endpoint and secrets"
echo "4. Install dependencies: npm install"
echo "5. Build application: npm run build"
echo "6. Setup database: npm run db:setup"
echo "7. Start application: pm2 start dist/index.js --name influencetie-api --instances 2"
echo "8. Setup PM2 startup: pm2 startup && pm2 save"
echo ""
echo "🛠️ Management commands:"
echo "   Deploy updates: ./deploy.sh"
echo "   Monitor status: ./monitor.sh"
echo "   View logs: pm2 logs"
echo "   Restart app: pm2 restart influencetie-api"
echo ""
echo "🌐 Your API will be available at: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)"
