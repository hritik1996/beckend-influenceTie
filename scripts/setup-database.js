const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Database configuration - matches main app configuration
const shouldUseSsl = (() => {
  const dbSslFlag = (process.env.DB_SSL || '').toLowerCase();
  if (dbSslFlag === 'true' || dbSslFlag === '1') return true;
  if (process.env.NODE_ENV === 'production') return true;
  if ((process.env.DATABASE_URL || '').toLowerCase().includes('sslmode=require')) return true;
  return false;
})();

const dbConfig = process.env.DATABASE_URL ? {
  // Connection string style (RDS/Cloud providers)
  connectionString: process.env.DATABASE_URL,
  ssl: shouldUseSsl ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
} : {
  // Manual configuration for local environments
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'influencetie_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || process.env.DB_PASSWORD || '',
  ssl: shouldUseSsl ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
};

async function setupDatabase() {
  const pool = new Pool(dbConfig);
  
  try {
    console.log('🔧 Setting up InfluenceTie database...');
    
    // Read the schema SQL file
    const schemaPath = path.join(__dirname, '..', 'sql', 'schema.sql');
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('📋 Reading schema file...');
    
    // Execute the schema
    await pool.query(schemaSQL);
    
    console.log('✅ Database schema created successfully!');
    console.log('🎯 Tables created:');
    console.log('   - users');
    console.log('   - campaigns');
    console.log('   - messages');
    console.log('');
    console.log('🔧 Indexes and triggers created');
    console.log('👑 Default admin user created (admin@influencetie.com)');
    console.log('');
    console.log('🚀 Database is ready for use!');
    
  } catch (error) {
    console.error('❌ Error setting up database:', error);
    
    if (error.code === 'ENOTFOUND') {
      console.error('💡 Make sure PostgreSQL is running and connection details are correct');
    } else if (error.code === '3D000') {
      console.error('💡 Database does not exist. Run npm run db:create first');
    } else if (error.code === '28P01') {
      console.error('💡 Authentication failed. Check username and password');
    }
    
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the setup
setupDatabase();
