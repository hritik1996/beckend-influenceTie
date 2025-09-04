const { Pool } = require('pg');
require('dotenv').config();

// Database configuration for connecting to PostgreSQL server (without specific database)
const serverConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
};

const databaseName = process.env.DB_NAME || 'influencetie_db';

async function createDatabase() {
  const pool = new Pool(serverConfig);
  
  try {
    console.log('🔧 Creating InfluenceTie database...');
    console.log(`📝 Database name: ${databaseName}`);
    
    // Check if database exists
    const checkResult = await pool.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [databaseName]
    );
    
    if (checkResult.rows.length > 0) {
      console.log('ℹ️  Database already exists');
      console.log('✅ Database ready for use!');
      return;
    }
    
    // Create the database
    await pool.query(`CREATE DATABASE "${databaseName}"`);
    
    console.log('✅ Database created successfully!');
    console.log('🎯 Next step: Run npm run db:setup to create tables');
    
  } catch (error) {
    console.error('❌ Error creating database:', error);
    
    if (error.code === 'ENOTFOUND') {
      console.error('💡 Make sure PostgreSQL is running and connection details are correct');
    } else if (error.code === '28P01') {
      console.error('💡 Authentication failed. Check username and password');
    } else if (error.code === '42P04') {
      console.error('💡 Database already exists');
    }
    
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the creation
createDatabase();
