import { Pool, PoolClient } from 'pg';

// Serverless-optimized database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'influencetie_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  
  // Serverless optimizations
  max: 1, // Reduced pool size for serverless
  idleTimeoutMillis: 1000, // Quick cleanup
  connectionTimeoutMillis: 5000,
  statement_timeout: 30000, // 30 second query timeout
  query_timeout: 30000,
  
  // Connection pooling for serverless
  keepAlive: true,
  keepAliveInitialDelayMillis: 0,
};

// Global connection pool for serverless reuse
let globalPool: Pool | null = null;

// Get or create connection pool
function getPool(): Pool {
  if (!globalPool || globalPool.ended) {
    globalPool = new Pool(dbConfig);
    
    // Handle pool errors
    globalPool.on('error', (err) => {
      console.error('Database pool error:', err);
    });
  }
  
  return globalPool;
}

// Execute a query with automatic error handling
export async function query(text: string, params?: any[]): Promise<any> {
  const pool = getPool();
  const start = Date.now();
  
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    
    // Log slow queries (> 1 second)
    if (duration > 1000) {
      console.warn(`Slow query (${duration}ms):`, text.substring(0, 100));
    }
    
    return result;
  } catch (error: any) {
    console.error('Database query error:', {
      error: error.message,
      query: text.substring(0, 100),
      params: params ? params.length : 0,
      duration: Date.now() - start
    });
    throw error;
  }
}

// Get a dedicated client (use sparingly in serverless)
export async function getClient(): Promise<PoolClient> {
  const pool = getPool();
  return await pool.connect();
}

// Test database connection with timeout
export async function testDatabaseConnection(): Promise<boolean> {
  try {
    const result = await query('SELECT NOW() as current_time, version() as pg_version');
    console.log('✅ Database connected successfully');
    console.log('📅 Server time:', result.rows[0]?.current_time);
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}

// Graceful cleanup (for serverless, this may not always run)
export async function disconnectDatabase(): Promise<void> {
  if (globalPool && !globalPool.ended) {
    try {
      await globalPool.end();
      globalPool = null;
      console.log('Database pool closed');
    } catch (error) {
      console.error('Error closing database pool:', error);
    }
  }
}

// Health check optimized for serverless
export async function quickHealthCheck(): Promise<{ status: string; latency: number }> {
  const start = Date.now();
  try {
    await query('SELECT 1');
    return {
      status: 'healthy',
      latency: Date.now() - start
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      latency: Date.now() - start
    };
  }
}
