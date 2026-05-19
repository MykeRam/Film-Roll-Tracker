import { createApp } from './app.js';
import { env } from './config.js';
import { Pool as PgPool } from 'pg';
import { applySchema } from './db/bootstrap.js';

async function main() {
  if (env.DATABASE_URL) {
    const bootstrapPool = new PgPool({
      connectionString: env.DATABASE_URL,
    });

    try {
      await applySchema(bootstrapPool);
    } finally {
      await bootstrapPool.end();
    }
  }

  const app = createApp();

  app.listen(env.PORT, env.HOST, () => {
    console.log(`Film Roll Tracker API listening at http://${env.HOST}:${env.PORT}`);
  });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
