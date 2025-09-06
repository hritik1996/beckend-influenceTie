#!/bin/bash

# SSL Certificate Setup Script using Let's Encrypt
# Make sure to run: chmod +x scripts/aws/setup-ssl.sh

set -e

# Configuration - CHANGE THESE VALUES
DOMAIN="your-domain.com"
EMAIL="your-email@example.com"

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

# Check if domain and email are set
if [ "$DOMAIN" = "your-domain.com" ] || [ "$EMAIL" = "your-email@example.com" ]; then
    print_error "Please update DOMAIN and EMAIL variables in this script first!"
    exit 1
fi

print_status "Setting up SSL certificate for $DOMAIN"

# Install certbot if not already installed
if ! command -v certbot &> /dev/null; then
    print_status "Installing Certbot..."
    sudo apt update
    sudo apt install -y certbot python3-certbot-nginx
fi

# Stop nginx if running
print_status "Stopping nginx..."
sudo systemctl stop nginx 2>/dev/null || true

# Obtain SSL certificate
print_status "Obtaining SSL certificate from Let's Encrypt..."
sudo certbot certonly --standalone \
    --preferred-challenges http \
    --email $EMAIL \
    --agree-tos \
    --no-eff-email \
    -d $DOMAIN \
    -d www.$DOMAIN

# Create SSL directory for Docker
print_status "Setting up SSL files for Docker..."
sudo mkdir -p /etc/nginx/ssl
sudo cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem /etc/nginx/ssl/
sudo cp /etc/letsencrypt/live/$DOMAIN/privkey.pem /etc/nginx/ssl/
sudo chmod 644 /etc/nginx/ssl/fullchain.pem
sudo chmod 600 /etc/nginx/ssl/privkey.pem

# Also copy to project directory
mkdir -p ssl
sudo cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem ssl/
sudo cp /etc/letsencrypt/live/$DOMAIN/privkey.pem ssl/
sudo chown $(whoami):$(whoami) ssl/*

# Update nginx configuration with your domain
print_status "Updating nginx configuration..."
sed -i "s/your-domain.com/$DOMAIN/g" nginx/sites-available/influencetie.conf

# Set up automatic renewal
print_status "Setting up automatic SSL renewal..."
sudo crontab -l 2>/dev/null | grep -v certbot || true > /tmp/crontab_backup
echo "0 12 * * * /usr/bin/certbot renew --quiet --post-hook 'docker restart nginx'" >> /tmp/crontab_backup
sudo crontab /tmp/crontab_backup
rm /tmp/crontab_backup

print_status "✅ SSL certificate setup complete!"
print_status "Certificate files are in: ssl/"
print_status "Nginx configuration updated with domain: $DOMAIN"
print_status "Auto-renewal configured via cron"

print_warning "Don't forget to:"
print_warning "1. Point your domain DNS to this server's IP"
print_warning "2. Start nginx: docker-compose up nginx"
print_warning "3. Test HTTPS: https://$DOMAIN/health"
