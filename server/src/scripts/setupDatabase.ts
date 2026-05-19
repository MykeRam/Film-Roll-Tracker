import { Pool } from 'pg';
import { env } from '../config.js';
import { applySchema } from '../db/bootstrap.js';

async function main() {
  if (!env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required to set up PostgreSQL.');
  }

  const pool = new Pool({
    connectionString: env.DATABASE_URL,
  });

  try {
    await applySchema(pool);
    console.log('PostgreSQL schema applied successfully.');
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
