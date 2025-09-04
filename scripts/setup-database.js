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
