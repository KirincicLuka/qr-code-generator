import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20, 
  idleTimeoutMillis: 30000, 
  connectionTimeoutMillis: 10000, 
});

pool.on('error', (err: Error, client) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

export default pool;
