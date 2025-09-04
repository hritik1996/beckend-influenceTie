const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'influencetie_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
};

async function resetDatabase() {
  const pool = new Pool(dbConfig);
  
  try {
    console.log('🧹 Resetting InfluenceTie database...');
    console.log('⚠️  This will delete all existing data!');
    
    // Drop all tables if they exist
    console.log('🗑️  Dropping existing tables...');
    
    await pool.query(`
      DROP TABLE IF EXISTS messages CASCADE;
      DROP TABLE IF EXISTS campaigns CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
      DROP TYPE IF EXISTS user_role CASCADE;
      DROP TYPE IF EXISTS gender CASCADE;
      DROP TYPE IF EXISTS campaign_status CASCADE;
      DROP TYPE IF EXISTS message_type CASCADE;
      DROP FUNCTION IF EXISTS update_updated_at() CASCADE;
    `);
    
    console.log('✅ Existing tables dropped');
    
    // Read and execute the schema
    const schemaPath = path.join(__dirname, '..', 'sql', 'schema.sql');
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('📋 Recreating database schema...');
    await pool.query(schemaSQL);
    
    console.log('✅ Database reset successfully!');
    console.log('🎯 Fresh database is ready for use!');
    console.log('👑 Default admin user created (admin@influencetie.com)');
    
  } catch (error) {
    console.error('❌ Error resetting database:', error);
    
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

// Run the reset
resetDatabase();
