import { Pool, PoolClient } from 'pg';

// Decide when to enable SSL for the database connection.
// - Always enable for production
// - Enable if DB_SSL=true
// - Enable if connection string contains `sslmode=require`
const shouldUseSsl: boolean = (() => {
  const dbSslFlag = (process.env.DB_SSL || '').toLowerCase();
  if (dbSslFlag === 'true' || dbSslFlag === '1') return true;
  if (process.env.NODE_ENV === 'production') return true;
  if ((process.env.DATABASE_URL || '').toLowerCase().includes('sslmode=require')) return true;
  return false;
})();

// Database configuration - supports both connection string (RDS/Cloud) and manual config
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

// Create PostgreSQL connection pool
const pool = new Pool(dbConfig);

// Database connection pool
export { pool };

// Get a client from the pool
export async function getClient(): Promise<PoolClient> {
  try {
    const client = await pool.connect();
    return client;
  } catch (error) {
    console.error('Error getting database client:', error);
    throw error;
  }
}

// Execute a query with automatic client management
export async function query(text: string, params?: any[]): Promise<any> {
  const client = await getClient();
  try {
    const result = await client.query(text, params);
    return result;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Test database connection
export async function testDatabaseConnection(): Promise<boolean> {
  try {
    const result = await query('SELECT NOW() as current_time');
    console.log('✅ Database connected successfully at:', result.rows[0]?.current_time);
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}

// Graceful shutdown
export async function disconnectDatabase(): Promise<void> {
  try {
    await pool.end();
    console.log('Database pool closed successfully');
  } catch (error) {
    console.error('Error closing database pool:', error);
  }
}

// Helper function to get database statistics
export async function getDatabaseStats() {
  try {
    // Determine database name safely for stats query
    const databaseName = process.env.DB_NAME || (() => {
      try {
        if (process.env.DATABASE_URL) {
          const url = new URL(process.env.DATABASE_URL);
          return url.pathname.replace('/', '') || undefined;
        }
      } catch (_err) {
        // ignore parse errors
      }
      return undefined;
    })();

    const result = await query(`
      SELECT 
        numbackends as active_connections,
        xact_commit as transactions_committed,
        xact_rollback as transactions_rolled_back,
        blks_read as blocks_read,
        blks_hit as blocks_hit,
        tup_returned as tuples_returned,
        tup_fetched as tuples_fetched,
        tup_inserted as tuples_inserted,
        tup_updated as tuples_updated,
        tup_deleted as tuples_deleted
      FROM pg_stat_database 
      WHERE datname = $1
    `, [databaseName]);
    
    return result.rows[0] || {};
  } catch (error) {
    console.error('Error getting database stats:', error);
    return {};
  }
}