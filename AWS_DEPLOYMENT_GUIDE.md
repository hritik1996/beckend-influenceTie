# AWS EC2 + RDS Deployment Guide

Complete guide to deploy InfluenceTie Backend on AWS EC2 with RDS PostgreSQL and SSL certificate.

## Prerequisites

- AWS Account
- Domain name (for SSL certificate)
- Basic knowledge of AWS EC2 and RDS

## Cost Estimation

### Monthly Costs (approximate):

1. **EC2 Instance**:
   - t3.micro (1 vCPU, 1GB RAM): $8-10/month
   - t3.small (2 vCPU, 2GB RAM): $16-20/month
   - t3.medium (2 vCPU, 4GB RAM): $30-35/month

2. **RDS PostgreSQL**:
   - db.t3.micro (1 vCPU, 1GB RAM): $12-15/month
   - db.t3.small (2 vCPU, 2GB RAM): $25-30/month

3. **Additional Costs**:
   - Elastic IP: $3.65/month
   - Storage (EBS): $2-5/month
   - Data Transfer: $1-5/month

**Total**: $25-75/month depending on instance sizes

## Step 1: Create RDS PostgreSQL Database

1. **Go to AWS RDS Console**
2. **Create Database**:
   - Engine: PostgreSQL
   - Version: 15.x
   - Template: Free tier (for testing) or Production
   - DB Instance: db.t3.micro or db.t3.small
   - Storage: 20-100 GB (depends on needs)
   - Database name: `influencetie_db`
   - Username: `postgres`
   - Password: Generate strong password
   - VPC: Default or create new
   - Publicly accessible: No (for security)
   - Security group: Create new (we'll configure later)

3. **Configure Security Group**:
   - Add inbound rule: PostgreSQL (5432) from EC2 security group

4. **Note down**:
   - RDS Endpoint
   - Database name, username, password

## Step 2: Launch EC2 Instance

1. **Go to AWS EC2 Console**
2. **Launch Instance**:
   - AMI: Ubuntu 22.04 LTS
   - Instance Type: t3.small or t3.medium (recommended)
   - Key Pair: Create new or use existing
   - Security Group: Create new with these rules:
     - SSH (22): Your IP
     - HTTP (80): 0.0.0.0/0
     - HTTPS (443): 0.0.0.0/0
     - Custom TCP (4000): 0.0.0.0/0 (for API)
   - Storage: 20-30 GB GP3

3. **Allocate Elastic IP**:
   - Associate with your EC2 instance

## Step 3: Connect to EC2 and Setup Environment

```bash
# Connect to your EC2 instance
ssh -i your-key.pem ubuntu@your-elastic-ip

# Run the automated setup script
curl -fsSL https://raw.githubusercontent.com/your-repo/main/scripts/aws/ec2-setup.sh | bash

# Log out and log back in for docker group changes
exit
ssh -i your-key.pem ubuntu@your-elastic-ip
```

## Step 4: Deploy Your Application

```bash
# Clone your repository
git clone https://github.com/your-username/your-repo.git /opt/influencetie
cd /opt/influencetie

# Create environment file
nano .env
```

### Environment Configuration (.env):

```bash
# Server Configuration
PORT=4000
NODE_ENV=production
CORS_ORIGIN=https://your-domain.com

# Database Configuration (RDS)
DATABASE_URL=postgresql://postgres:your-password@your-rds-endpoint:5432/influencetie_db

# Authentication
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=7d

# Optional: Instagram API (if using)
INSTAGRAM_APP_ID=your-instagram-app-id
INSTAGRAM_APP_SECRET=your-instagram-app-secret
```

## Step 5: Setup SSL Certificate

```bash
# Edit the SSL setup script with your domain
nano scripts/aws/setup-ssl.sh

# Update these lines:
DOMAIN="your-domain.com"
EMAIL="your-email@example.com"

# Run SSL setup
./scripts/aws/setup-ssl.sh
```

## Step 6: Deploy Application

```bash
# Deploy the application
./scripts/aws/deploy.sh

# Check if it's running
curl http://localhost:4000/health
```

## Step 7: Setup Nginx with SSL

```bash
# Start nginx with SSL
docker-compose up -d nginx

# Check nginx status
docker ps | grep nginx

# Test HTTPS
curl https://your-domain.com/health
```

## Step 8: Setup Database Schema

```bash
# Run database setup
docker exec influencetie-backend-container npm run db:setup

# Verify database connection
docker logs influencetie-backend-container
```

## Domain Configuration

1. **Point your domain to EC2**:
   - Add A record: `your-domain.com` → `your-elastic-ip`
   - Add CNAME record: `www.your-domain.com` → `your-domain.com`

2. **Wait for DNS propagation** (5-30 minutes)

## Monitoring and Maintenance

### Check Application Status:
```bash
# Check all containers
docker ps

# View application logs
docker logs influencetie-backend-container

# View nginx logs
docker logs influencetie-nginx-container

# Check system resources
htop
df -h
```

### Update Application:
```bash
cd /opt/influencetie
git pull origin main
./scripts/aws/deploy.sh
```

### Backup Database:
```bash
# Create backup
docker exec postgres-container pg_dump -U postgres influencetie_db > backup_$(date +%Y%m%d).sql

# Restore backup
docker exec -i postgres-container psql -U postgres influencetie_db < backup_20240101.sql
```

## Troubleshooting

### Common Issues:

1. **SSL Certificate Issues**:
   ```bash
   # Check certificate status
   sudo certbot certificates
   
   # Renew certificate manually
   sudo certbot renew
   ```

2. **Database Connection Issues**:
   - Check RDS security group allows EC2 access
   - Verify DATABASE_URL is correct
   - Check RDS instance is running

3. **Application Not Starting**:
   ```bash
   # Check application logs
   docker logs influencetie-backend-container
   
   # Check environment variables
   docker exec influencetie-backend-container env | grep DATABASE_URL
   ```

4. **High Memory Usage**:
   - Monitor with `htop`
   - Consider upgrading to larger instance
   - Setup swap file (script already does this)

## Security Best Practices

1. **Keep system updated**:
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

2. **Regular backups**:
   - Setup automated RDS backups
   - Create manual snapshots before updates

3. **Monitor logs**:
   - Check application logs daily
   - Setup CloudWatch for monitoring

4. **Firewall**:
   - Only open necessary ports
   - Use VPC security groups effectively

## API Endpoints

After deployment, your API will be available at:

- **Health Check**: `https://your-domain.com/health`
- **Authentication**: `https://your-domain.com/api/auth/`
- **Users**: `https://your-domain.com/api/users/`
- **Campaigns**: `https://your-domain.com/api/campaigns/`
- **Messages**: `https://your-domain.com/api/messages/`

## Support

If you encounter issues:

1. Check logs first: `docker logs influencetie-backend-container`
2. Verify environment variables
3. Check AWS security groups and networking
4. Ensure RDS is accessible from EC2

---

**Deployment Complete!** 🚀

Your InfluenceTie Backend is now running on AWS with SSL certificate and PostgreSQL database.