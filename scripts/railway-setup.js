const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Railway automatically provides DATABASE_URL
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ DATABASE_URL not found. Make sure PostgreSQL service is added in Railway.');
  process.exit(1);
}

async function setupRailwayDatabase() {
  console.log('🚂 Setting up database for Railway deployment...');
  
  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: {
      rejectUnauthorized: false // Railway requires SSL
    }
  });
  
  try {
    // Test connection
    console.log('📡 Testing database connection...');
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful');
    
    // Check if tables already exist
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'users'
    `);
    
    if (tablesResult.rows.length > 0) {
      console.log('ℹ️  Database tables already exist. Skipping setup.');
      return;
    }
    
    // Read and execute schema
    console.log('📋 Creating database schema...');
    const schemaPath = path.join(__dirname, '..', 'sql', 'schema.sql');
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
    
    // Execute schema in transaction
    await pool.query('BEGIN');
    await pool.query(schemaSQL);
    await pool.query('COMMIT');
    
    console.log('✅ Database schema created successfully!');
    console.log('🎯 Tables created: users, campaigns, messages');
    console.log('👑 Default admin user created');
    console.log('🚂 Railway deployment setup complete!');
    
  } catch (error) {
    await pool.query('ROLLBACK').catch(() => {}); // Safe rollback
    console.error('❌ Error setting up Railway database:', error.message);
    
    // Provide helpful error messages
    if (error.code === 'ENOTFOUND') {
      console.error('💡 Database connection failed. Check Railway PostgreSQL service.');
    } else if (error.code === '28P01') {
      console.error('💡 Authentication failed. Check DATABASE_URL in Railway.');
    } else if (error.message.includes('permission denied')) {
      console.error('💡 Database permissions issue. Railway PostgreSQL service may need time to initialize.');
    }
    
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Only run if this script is called directly
if (require.main === module) {
  setupRailwayDatabase();
}

module.exports = { setupRailwayDatabase };
