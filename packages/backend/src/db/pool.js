import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

/**
 * PostgreSQL Connection Pool
 * Manages database connections with configurable pool settings
 */
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'findvan',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',

  // Pool configuration
  min: parseInt(process.env.DB_POOL_MIN || '2', 10),
  max: parseInt(process.env.DB_POOL_MAX || '10', 10),
  idleTimeoutMillis: parseInt(process.env.DB_POOL_IDLE_TIMEOUT || '30000', 10),
  connectionTimeoutMillis: 5000,
  statement_cache_size: parseInt(process.env.DB_POOL_STATEMENT_CACHE_SIZE || '0', 10),
});

/**
 * Error event handler
 */
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

/**
 * Connect event handler
 */
pool.on('connect', () => {
  console.log('✓ New database connection established');
});

/**
 * Remove event handler
 */
pool.on('remove', () => {
  console.log('✓ Database connection closed');
});

/**
 * Query wrapper with error handling
 * @param {string} text SQL query
 * @param {array} values Query parameters
 * @returns {Promise} Query result
 */
export async function query(text, values) {
  const start = Date.now();

  try {
    const result = await pool.query(text, values);
    const duration = Date.now() - start;

    // Log slow queries (> 1000ms)
    if (duration > 1000) {
      console.warn(`Slow query detected (${duration}ms): ${text.substring(0, 50)}...`);
    }

    return result;
  } catch (error) {
    console.error('Database query error:', {
      message: error.message,
      query: text.substring(0, 100),
      code: error.code
    });
    throw error;
  }
}

/**
 * Get client from pool for transaction
 * @returns {Promise} Client object
 */
export async function getClient() {
  return pool.connect();
}

/**
 * Close all connections in pool
 */
export async function closePool() {
  await pool.end();
  console.log('✓ Connection pool closed');
}

export default pool;
