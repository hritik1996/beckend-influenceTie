#!/bin/bash

# EC2 Instance Setup Script
# Run this script on your fresh EC2 Ubuntu instance
# Usage: curl -fsSL https://raw.githubusercontent.com/your-repo/main/scripts/aws/ec2-setup.sh | bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_status "🚀 Setting up EC2 instance for InfluenceTie Backend..."

# Update system
print_status "Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install essential packages
print_status "Installing essential packages..."
sudo apt install -y curl wget git unzip software-properties-common apt-transport-https ca-certificates gnupg lsb-release

# Install Docker
print_status "Installing Docker..."
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io

# Install Docker Compose
print_status "Installing Docker Compose..."
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Add user to docker group
print_status "Adding user to docker group..."
sudo usermod -aG docker $USER

# Install Node.js (for local development/debugging)
print_status "Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 (process manager)
print_status "Installing PM2..."
sudo npm install -g pm2

# Setup firewall
print_status "Configuring UFW firewall..."
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 4000/tcp
sudo ufw --force enable

# Create application directory
print_status "Creating application directory..."
sudo mkdir -p /opt/influencetie
sudo chown $USER:$USER /opt/influencetie

# Setup log rotation
print_status "Setting up log rotation..."
sudo tee /etc/logrotate.d/influencetie > /dev/null <<EOF
/opt/influencetie/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 $USER $USER
}
EOF

# Create logs directory
mkdir -p /opt/influencetie/logs

# Setup swap (if not exists and instance has < 2GB RAM)
MEMORY=$(free -m | awk 'NR==2{printf "%.0f", $2/1024}')
if [ "$MEMORY" -lt 2 ] && ! swapon --show | grep -q "/swapfile"; then
    print_status "Setting up swap file (low memory detected)..."
    sudo fallocate -l 1G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
fi

# Install AWS CLI (optional but useful)
print_status "Installing AWS CLI..."
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install
rm -rf aws awscliv2.zip

print_status "✅ EC2 setup complete!"
print_status "🔄 Please log out and log back in for docker group changes to take effect"

print_warning "Next steps:"
print_warning "1. Clone your repository: git clone <your-repo-url> /opt/influencetie"
print_warning "2. Copy your .env file to /opt/influencetie/"
print_warning "3. Run: cd /opt/influencetie && chmod +x scripts/aws/*.sh"
print_warning "4. Setup SSL: ./scripts/aws/setup-ssl.sh"
print_warning "5. Deploy: ./scripts/aws/deploy.sh"

print_status "Server Information:"
print_status "OS: $(lsb_release -d | cut -f2)"
print_status "Memory: ${MEMORY}GB"
print_status "Docker: $(docker --version)"
print_status "Docker Compose: $(docker-compose --version)"
print_status "Node.js: $(node --version)"
