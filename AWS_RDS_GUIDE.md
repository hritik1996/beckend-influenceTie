# 🗃️ AWS RDS PostgreSQL Guide for InfluenceTie

## 💰 **RDS PostgreSQL Cost Breakdown (Mumbai Region)**

### **Instance Classes & Pricing:**

| Instance Class | vCPU | RAM | Storage IOPS | Monthly Cost | Best For |
|----------------|------|-----|--------------|--------------|----------|
| **db.t3.micro** | 2 | 1GB | Baseline | ₹1,200 | Development, Testing |
| **db.t3.small** | 2 | 2GB | Baseline | ₹2,400 | Small Production |
| **db.t3.medium** | 2 | 4GB | Baseline | ₹4,800 | Medium Production |
| **db.t3.large** | 2 | 8GB | Baseline | ₹9,600 | Large Production |
| **db.m5.large** | 2 | 8GB | 3000 IOPS | ₹12,000 | High Performance |

### **Additional Costs:**
```
Storage (GP3):           ₹8/GB/month
Backup Storage:          ₹1.5/GB/month (beyond free 100% of DB storage)
Data Transfer Out:       ₹8/GB (first 1GB free)
Multi-AZ Deployment:     +100% of instance cost
Read Replicas:           Same as source instance cost
```

---

## 🎯 **Recommended RDS Configurations**

### **Development Environment:**
```yaml
Engine: PostgreSQL 15.4
Instance: db.t3.micro
Storage: 20GB GP3 (3000 IOPS)
Multi-AZ: Disabled
Backup: 7 days
Monitoring: Basic
Public Access: Yes (for development only)
Encryption: Enabled

Monthly Cost: ~₹1,500
```

### **Production Environment:**
```yaml
Engine: PostgreSQL 15.4
Instance: db.t3.small
Storage: 100GB GP3 (3000 IOPS)
Multi-AZ: Enabled (High Availability)
Backup: 30 days
Monitoring: Enhanced
Public Access: No
Encryption: Enabled
Performance Insights: Enabled

Monthly Cost: ~₹6,000
```

### **High-Scale Production:**
```yaml
Engine: PostgreSQL 15.4
Instance: db.m5.large
Storage: 500GB GP3 (12000 IOPS)
Multi-AZ: Enabled
Read Replicas: 2 instances
Backup: 30 days
Monitoring: Enhanced
Performance Insights: Enabled

Monthly Cost: ~₹35,000
```

---

## 🔧 **RDS Setup Steps**

### **1. Create RDS Instance via AWS Console:**

```bash
# Navigate to RDS Console
https://console.aws.amazon.com/rds/

# Create Database
1. Click "Create database"
2. Choose "Standard create"
3. Select "PostgreSQL"
4. Choose version (15.4 recommended)
5. Select instance class (db.t3.micro for start)
6. Configure storage (20GB GP3)
7. Set DB instance identifier: "influencetie-db"
8. Set Master username: "influencetie_admin"
9. Set Master password: (strong password)
10. Choose VPC and subnet group
11. Set security group (create new or use existing)
12. Configure additional settings as needed
```

### **2. Security Group Configuration:**

```bash
# RDS Security Group Rules
Type: PostgreSQL
Port: 5432
Source: EC2 Security Group ID (sg-xxxxxxxx)
Description: Allow access from EC2 instances

# OR for development (less secure)
Type: PostgreSQL  
Port: 5432
Source: Your IP address
Description: Development access
```

### **3. Database Connection Examples:**

```javascript
// Connection using environment variables
const dbConfig = {
  host: process.env.DB_HOST,        // RDS endpoint
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,   // Database name
  user: process.env.DB_USER,       // Master username
  password: process.env.DB_PASSWORD, // Master password
  ssl: {
    rejectUnauthorized: false
  },
  max: 20,                         // Connection pool size
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
};

// For production with connection string
const productionConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
};
```

---

## 📊 **Performance Optimization**

### **Connection Pooling:**
```javascript
// Optimized pool configuration for RDS
const pool = new Pool({
  host: process.env.DB_HOST,
  port: 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  
  // Production optimizations
  max: 20,                    // Maximum connections
  min: 2,                     // Minimum connections
  idleTimeoutMillis: 30000,   // Close idle connections
  connectionTimeoutMillis: 5000,
  statement_timeout: 30000,   // Query timeout
  
  // SSL for production
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : false
});
```

### **Query Optimization:**
```sql
-- Enable query performance tracking
ALTER SYSTEM SET log_statement = 'all';
ALTER SYSTEM SET log_min_duration_statement = 1000; -- Log slow queries (>1s)

-- Create performance-critical indexes
CREATE INDEX CONCURRENTLY idx_users_search 
ON users USING GIN(to_tsvector('english', first_name || ' ' || last_name || ' ' || bio));

CREATE INDEX CONCURRENTLY idx_campaigns_active 
ON campaigns(status, start_date, end_date) 
WHERE status = 'ACTIVE';

-- Analyze table statistics
ANALYZE users;
ANALYZE campaigns;
ANALYZE messages;
```

---

## 🔍 **Monitoring & Maintenance**

### **CloudWatch Integration:**
```javascript
// Add CloudWatch logging
const winston = require('winston');
const CloudWatchTransport = require('winston-cloudwatch');

const logger = winston.createLogger({
  transports: [
    new CloudWatchTransport({
      logGroupName: '/aws/rds/influencetie',
      logStreamName: 'application-logs',
      region: 'ap-south-1'
    })
  ]
});
```

### **Performance Insights:**
```sql
-- Enable Performance Insights for query analysis
-- (Done via RDS console during instance creation)

-- View slow queries
SELECT 
    query,
    mean_exec_time,
    calls,
    total_exec_time
FROM pg_stat_statements 
ORDER BY mean_exec_time DESC 
LIMIT 10;
```

### **Automated Backups:**
```yaml
Backup Window: 03:00-04:00 (low traffic hours)
Backup Retention: 7 days (development), 30 days (production)
Deletion Protection: Enabled (production)
Copy Tags to Snapshots: Enabled
```

---

## 🚀 **Scaling Strategies**

### **Vertical Scaling (Instance Size):**
```
User Growth → Instance Upgrade Path:
0-1K users:     db.t3.micro   (₹1,200/month)
1K-5K users:    db.t3.small   (₹2,400/month)
5K-20K users:   db.t3.medium  (₹4,800/month)
20K-50K users:  db.t3.large   (₹9,600/month)
50K+ users:     db.m5.large+  (₹12,000+/month)
```

### **Read Replicas (For Read-Heavy Workload):**
```sql
-- When to add read replicas:
-- 1. Read queries > 70% of total traffic
-- 2. Database CPU consistently > 70%
-- 3. Need to serve different regions

-- Read replica configuration:
Instance: Same as source or smaller
Region: Same or different (for disaster recovery)
Cost: Same as source instance
```

### **Connection Pooling Optimization:**
```javascript
// Scale connection pool based on traffic
const getPoolConfig = () => {
  const baseConfig = {
    host: process.env.DB_HOST,
    // ... other config
  };

  // Adjust pool size based on environment
  if (process.env.NODE_ENV === 'production') {
    return {
      ...baseConfig,
      max: 20,          // High traffic
      min: 5,           // Always keep connections warm
    };
  } else {
    return {
      ...baseConfig,
      max: 5,           // Development
      min: 1,           
    };
  }
};
```

---

## 🔒 **Security Best Practices**

### **Database Security:**
```sql
-- Create application-specific database user
CREATE USER influencetie_app WITH PASSWORD 'AppUserPassword123!';

-- Grant only necessary permissions
GRANT CONNECT ON DATABASE influencetie_db TO influencetie_app;
GRANT USAGE ON SCHEMA public TO influencetie_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO influencetie_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO influencetie_app;

-- Don't use master user for application connections
```

### **Network Security:**
```yaml
VPC Configuration:
  - Place RDS in private subnets
  - EC2 in public/private subnets as needed
  - Security groups with least privilege

SSL/TLS:
  - Force SSL connections
  - Use RDS Certificate Authority
  - Verify SSL in application code
```

### **Access Control:**
```yaml
IAM Database Authentication:
  - Enable IAM DB authentication
  - Use IAM roles instead of passwords
  - Rotate credentials regularly

Secrets Management:
  - Store DB passwords in AWS Secrets Manager
  - Use IAM roles for EC2 to access secrets
  - Automatic password rotation
```

---

## 📈 **Cost Optimization**

### **Reserved Instances:**
```
1-Year Term: 30% savings
3-Year Term: 50% savings

Example:
db.t3.small on-demand: ₹2,400/month
db.t3.small reserved (1yr): ₹1,680/month (₹720 savings)
```

### **Storage Optimization:**
```sql
-- Monitor storage usage
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Archive old data
DELETE FROM analytics_events 
WHERE created_at < NOW() - INTERVAL '90 days';

-- Vacuum regularly
VACUUM ANALYZE;
```

---

## 🛡️ **Backup & Recovery**

### **Backup Strategy:**
```yaml
Automated Backups:
  - Daily backups during maintenance window
  - 7-30 days retention
  - Point-in-time recovery enabled

Manual Snapshots:
  - Before major deployments
  - Before schema changes
  - Monthly production snapshots

Cross-Region Backup:
  - Replicate snapshots to different region
  - For disaster recovery
```

### **Recovery Testing:**
```sql
-- Test restore process monthly
-- Create test database from snapshot
-- Verify data integrity
-- Document recovery time objectives (RTO)
-- Document recovery point objectives (RPO)
```

---

## 📊 **Migration from Railway to RDS**

### **Data Export from Railway:**
```bash
# Get Railway database URL
railway variables

# Export data
pg_dump $DATABASE_URL > influencetie_railway_backup.sql

# Or with specific options
pg_dump --verbose --clean --no-acl --no-owner \
  -h railway-host -p 5432 -U railway-user -d railway-db \
  > influencetie_backup.sql
```

### **Data Import to RDS:**
```bash
# Import to RDS
psql -h your-rds-endpoint.ap-south-1.rds.amazonaws.com \
     -p 5432 \
     -U influencetie_admin \
     -d influencetie_db \
     -f influencetie_backup.sql

# Verify import
psql -h your-rds-endpoint.ap-south-1.rds.amazonaws.com \
     -p 5432 \
     -U influencetie_admin \
     -d influencetie_db \
     -c "SELECT COUNT(*) FROM users;"
```

---

## 🔧 **Environment-Specific Configurations**

### **Development RDS:**
```yaml
Purpose: Testing, development
Instance: db.t3.micro
Storage: 20GB
Multi-AZ: No
Backup: 7 days
Public Access: Yes (for development tools)
Encryption: Yes
Cost: ~₹1,500/month
```

### **Staging RDS:**
```yaml
Purpose: Pre-production testing
Instance: db.t3.small
Storage: 50GB
Multi-AZ: No
Backup: 7 days
Public Access: No
Encryption: Yes
Cost: ~₹3,000/month
```

### **Production RDS:**
```yaml
Purpose: Live application
Instance: db.t3.small (start) → db.t3.medium (scale)
Storage: 100GB → 500GB (auto-scaling enabled)
Multi-AZ: Yes (high availability)
Backup: 30 days
Read Replicas: 1-2 (based on read load)
Public Access: No
Encryption: Yes
Performance Insights: Yes
Cost: ~₹6,000-15,000/month
```

---

## 📊 **Performance Benchmarks**

### **Expected Performance (Your InfluenceTie Platform):**

| User Count | DB Instance | Concurrent Connections | Query Response | Monthly Cost |
|------------|-------------|----------------------|----------------|--------------|
| **0-1K** | db.t3.micro | 10-20 | <100ms | ₹1,500 |
| **1K-5K** | db.t3.small | 20-50 | <150ms | ₹3,000 |
| **5K-20K** | db.t3.medium | 50-100 | <200ms | ₹6,000 |
| **20K-50K** | db.t3.large | 100-200 | <300ms | ₹12,000 |
| **50K+** | db.m5.large+ | 200+ | <400ms | ₹15,000+ |

### **Query Performance Examples:**
```sql
-- User search (typical for influencer discovery)
-- Expected: 50-100ms on db.t3.small with proper indexes
SELECT * FROM users 
WHERE role = 'INFLUENCER' 
  AND followers_count BETWEEN 10000 AND 100000
  AND 'fashion' = ANY(categories)
LIMIT 20;

-- Campaign analytics (heavier query)
-- Expected: 200-500ms on db.t3.small
SELECT 
    c.title,
    COUNT(cp.id) as participants,
    AVG(cp.agreed_rate) as avg_rate,
    SUM(posts.views_count) as total_views
FROM campaigns c
LEFT JOIN campaign_participants cp ON c.id = cp.campaign_id
LEFT JOIN content_posts posts ON cp.id = posts.campaign_participant_id
WHERE c.created_at >= NOW() - INTERVAL '30 days'
GROUP BY c.id, c.title
ORDER BY total_views DESC;
```

---

## 🚨 **Common Issues & Solutions**

### **Connection Issues:**
```bash
# Problem: Can't connect to RDS
# Solution 1: Check security group
aws ec2 describe-security-groups --group-ids sg-xxxxxxxx

# Solution 2: Test connectivity from EC2
telnet your-rds-endpoint.ap-south-1.rds.amazonaws.com 5432

# Solution 3: Check RDS endpoint
aws rds describe-db-instances --db-instance-identifier influencetie-db
```

### **Performance Issues:**
```sql
-- Problem: Slow queries
-- Solution 1: Check missing indexes
SELECT schemaname, tablename, attname, n_distinct, correlation 
FROM pg_stats 
WHERE schemaname = 'public' 
ORDER BY n_distinct DESC;

-- Solution 2: Monitor connections
SELECT count(*) as active_connections 
FROM pg_stat_activity 
WHERE state = 'active';

-- Solution 3: Check long-running queries
SELECT 
    pid,
    now() - pg_stat_activity.query_start AS duration,
    query 
FROM pg_stat_activity 
WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes';
```

### **Storage Issues:**
```sql
-- Monitor database size
SELECT 
    pg_size_pretty(pg_database_size('influencetie_db')) as db_size,
    pg_size_pretty(pg_total_relation_size('users')) as users_table_size,
    pg_size_pretty(pg_total_relation_size('campaigns')) as campaigns_table_size;

-- Clean up old data
DELETE FROM analytics_events WHERE created_at < NOW() - INTERVAL '90 days';
VACUUM FULL analytics_events;
```

---

## 📋 **Migration Checklist**

### **Pre-Migration:**
- [ ] **Test RDS connectivity** from EC2
- [ ] **Backup Railway database** (pg_dump)
- [ ] **Create RDS instance** with same PostgreSQL version
- [ ] **Setup security groups** correctly
- [ ] **Test application** with RDS in development

### **Migration Day:**
- [ ] **Enable maintenance mode** on application
- [ ] **Final database backup** from Railway
- [ ] **Import data to RDS** using psql
- [ ] **Update application config** (DB_HOST, credentials)
- [ ] **Deploy updated application**
- [ ] **Run smoke tests** on all endpoints
- [ ] **Disable maintenance mode**

### **Post-Migration:**
- [ ] **Monitor application performance** for 24 hours
- [ ] **Check database metrics** in CloudWatch
- [ ] **Verify backups** are working
- [ ] **Update monitoring alerts**
- [ ] **Document new database endpoints**
- [ ] **Clean up Railway resources**

---

## 🎯 **Your Action Plan**

### **Immediate (This Week):**
1. **Deploy to Railway** (₹0) - Get MVP running
2. **Build core features** - Registration, campaigns, messaging
3. **Test with users** - Validate product-market fit

### **Month 2-3 (Growth Phase):**
1. **Monitor Railway costs** - When hitting ₹1500+/month
2. **Setup AWS account** - Get familiar with console
3. **Create development RDS** - Test migration process

### **Month 3-6 (Production Ready):**
1. **Migrate to AWS EC2 + RDS** - Full production setup
2. **Setup monitoring** - CloudWatch, alerts
3. **Implement CI/CD** - Automated deployments

### **Month 6+ (Scale):**
1. **Add read replicas** - For read-heavy workloads
2. **Implement caching** - Redis/ElastiCache
3. **Multi-region setup** - For global users

---

## 💡 **Pro Tips**

### **Cost Savings:**
- **Reserved Instances**: Book for 1 year = 30% savings
- **Spot Instances**: For non-critical workloads = 70% savings
- **Storage Optimization**: Use GP3 instead of GP2
- **Right-sizing**: Monitor and adjust instance sizes

### **Performance:**
- **Connection pooling**: Essential for RDS
- **Query optimization**: Use EXPLAIN ANALYZE
- **Indexing strategy**: Monitor slow query log
- **Regular maintenance**: VACUUM, ANALYZE, REINDEX

### **Reliability:**
- **Multi-AZ**: For production high availability
- **Cross-region backups**: For disaster recovery
- **Health checks**: Application and database
- **Monitoring**: Set up alerts for key metrics

---

**🎯 Start with Railway (₹0), migrate to AWS RDS when you outgrow it (₹2500+/month)!**
