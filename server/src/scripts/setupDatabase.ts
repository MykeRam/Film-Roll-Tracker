import { readFile } from 'node:fs/promises';
import { Pool } from 'pg';
import { env } from '../config.js';

async function main() {
  if (!env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required to set up PostgreSQL.');
  }

  const pool = new Pool({
    connectionString: env.DATABASE_URL,
  });

  try {
    const schema = await readFile(new URL('../../schema.sql', import.meta.url), 'utf8');
    await pool.query(schema);
    console.log('PostgreSQL schema applied successfully.');
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
