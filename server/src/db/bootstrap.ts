import { readFile } from 'node:fs/promises';
import type { Pool } from 'pg';

export async function applySchema(pool: Pool) {
  const schema = await readFile(new URL('../../schema.sql', import.meta.url), 'utf8');
  await pool.query(schema);
}
