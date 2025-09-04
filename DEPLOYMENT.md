# 🚀 InfluenceTie Backend Deployment Guide

## 📋 Overview
This guide covers deployment from **Railway** (quick start) to **AWS** (production scale).

---

## 🚂 Phase 1: Railway Deployment (Quick Start)

### **Why Railway First?**
- ✅ **5-minute deployment**
- ✅ **Built-in PostgreSQL**
- ✅ **Free $5/month credit**
- ✅ **Auto-scaling**
- ✅ **Zero config required**

### **Step 1: Setup Railway Account**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Connect your project
railway link
```

### **Step 2: Deploy to Railway**
```bash
# Initial deployment
railway up

# Add PostgreSQL database
railway add postgresql

# Check deployment status
railway status

# View logs
railway logs
```

### **Step 3: Environment Variables (Railway Dashboard)**
Go to Railway Dashboard → Your Project → Variables:

```env
NODE_ENV=production
JWT_SECRET=your-super-secret-key-change-this
JWT_EXPIRES_IN=7d
CORS_ORIGIN=https://your-frontend-domain.com

# Railway automatically provides:
# DATABASE_URL=postgresql://user:pass@host:port/db
# PORT=auto-assigned
# RAILWAY_ENVIRONMENT=production
```

### **Step 4: Test Your Deployment**
```bash
# Check health endpoint
curl https://your-app.railway.app/health

# Test registration
curl -X POST https://your-app.railway.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123","firstName":"Test","lastName":"User","role":"INFLUENCER"}'
```

---

## ☁️ Phase 2: AWS Migration (Production Scale)

### **When to Migrate to AWS?**
- 🔄 When you outgrow Railway's free tier
- 📈 When you need advanced scaling
- 🔒 When you need more security controls
- 💰 When cost optimization becomes important

### **Migration Strategy Overview**
1. **Set up AWS infrastructure**
2. **Export Railway database**
3. **Deploy code to AWS**
4. **Import database to RDS**
5. **Switch DNS/traffic**

---

## 🛠️ AWS Infrastructure Setup

### **Step 1: Create AWS RDS PostgreSQL**
```bash
# Using AWS CLI
aws rds create-db-instance \
  --db-instance-identifier influencetie-prod \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --master-username influencetie_admin \
  --master-user-password "YourSecurePassword123" \
  --allocated-storage 20 \
  --vpc-security-group-ids sg-xxxxxxxx \
  --db-subnet-group-name default \
  --backup-retention-period 7 \
  --multi-az \
  --storage-encrypted
```

### **Step 2: Create EC2 Instance**
```bash
# Launch EC2 instance
aws ec2 run-instances \
  --image-id ami-0abcdef1234567890 \
  --instance-type t3.micro \
  --key-name your-key-pair \
  --security-group-ids sg-xxxxxxxx \
  --subnet-id subnet-xxxxxxxx \
  --user-data file://ec2-userdata.sh
```

### **Step 3: EC2 User Data Script**
Create `ec2-userdata.sh`:
```bash
#!/bin/bash
yum update -y
yum install -y docker git

# Install Node.js
curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
yum install -y nodejs

# Start Docker
service docker start
usermod -a -G docker ec2-user

# Install PM2 for process management
npm install -g pm2

# Clone and setup your app
cd /home/ec2-user
git clone https://github.com/yourusername/influencetie-backend.git
cd influencetie-backend
npm install
npm run build

# Start with PM2
pm2 start dist/index.js --name "influencetie-api"
pm2 startup
pm2 save
```

---

## 📊 Database Migration (Railway → AWS RDS)

### **Step 1: Export from Railway**
```bash
# Connect to Railway database
railway connect postgresql

# Create dump
pg_dump $DATABASE_URL > influencetie_backup.sql

# Or use Railway CLI
railway database backup
```

### **Step 2: Import to AWS RDS**
```bash
# Connect to AWS RDS
psql -h your-rds-endpoint.amazonaws.com \
     -U influencetie_admin \
     -d influencetie_prod \
     -f influencetie_backup.sql
```

### **Step 3: Update Environment Variables**
```env
# AWS RDS connection
DB_HOST=your-rds-endpoint.amazonaws.com
DB_PORT=5432
DB_NAME=influencetie_prod
DB_USER=influencetie_admin
DB_PASSWORD=YourSecurePassword123

# Remove DATABASE_URL (we'll use individual params)
# DATABASE_URL=
```

---

## 🔄 Zero-Downtime Migration Process

### **Step 1: Parallel Deployment**
1. Deploy to AWS while Railway is still running
2. Test AWS deployment thoroughly
3. Set up database replication (Railway → AWS)

### **Step 2: Traffic Switch**
```bash
# Update DNS to point to AWS
# Or use load balancer to gradually shift traffic

# Monitor both systems during transition
```

### **Step 3: Cleanup**
```bash
# After successful migration
railway down  # Stop Railway deployment
```

---

## 📊 Cost Comparison

| Service | Railway | AWS EC2 + RDS |
|---------|---------|---------------|
| **Startup** | Free ($5 credit) | ~$20-30/month |
| **Small Scale** | $5-20/month | $30-50/month |
| **Medium Scale** | $50-100/month | $100-200/month |
| **Large Scale** | $200+/month | $300-500/month |

**Break-even point**: Around 50-100 users or $20/month Railway usage

---

## 🔧 Production Optimizations (AWS)

### **Performance**
```javascript
// Add Redis for caching
const redis = require('redis');
const client = redis.createClient({
  host: 'your-elasticache-endpoint'
});

// Database connection pooling
const pool = new Pool({
  host: process.env.DB_HOST,
  max: 50, // Increase pool size
  idleTimeoutMillis: 30000,
});
```

### **Security**
```bash
# AWS Security Groups
# Only allow necessary ports (80, 443, 5432)

# Environment variables from AWS Systems Manager
aws ssm put-parameter \
  --name "/influencetie/prod/jwt-secret" \
  --value "your-secret" \
  --type "SecureString"
```

### **Monitoring**
```bash
# CloudWatch logs
npm install winston aws-sdk

# Health checks
# Application Load Balancer health checks
# Route 53 health checks
```

---

## 🚀 Deployment Commands Summary

### **Railway Deployment**
```bash
# One-time setup
railway login
railway link
railway add postgresql

# Deploy
railway up

# Monitor
railway logs
railway status
```

### **AWS Deployment**
```bash
# Build and deploy
npm run build
pm2 restart influencetie-api

# Database operations
npm run db:setup  # First time only
npm run db:migrate  # For updates

# Monitor
pm2 logs influencetie-api
pm2 monit
```

---

## 🆘 Troubleshooting

### **Railway Issues**
```bash
# Check Railway status
railway status

# View detailed logs
railway logs --follow

# Database connection issues
railway shell
echo $DATABASE_URL
```

### **AWS Issues**
```bash
# EC2 connection
ssh -i your-key.pem ec2-user@your-ec2-ip

# Check application logs
pm2 logs influencetie-api

# Database connectivity
psql -h your-rds-endpoint -U influencetie_admin -d influencetie_prod
```

---

## 📈 Scaling Strategy

### **Railway Scaling** (Automatic)
- Railway automatically scales based on demand
- No configuration needed
- Suitable for 0-1000 concurrent users

### **AWS Scaling** (Manual/Auto)
```bash
# Auto Scaling Group
aws autoscaling create-auto-scaling-group \
  --auto-scaling-group-name influencetie-asg \
  --min-size 1 \
  --max-size 10 \
  --desired-capacity 2

# Load Balancer
aws elbv2 create-load-balancer \
  --name influencetie-alb \
  --type application
```

---

**🎯 Start with Railway today, migrate to AWS when you need it!**
