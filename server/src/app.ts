import cors from 'cors';
import express from 'express';
import { env } from './config.js';
import { createAuthRouter } from './routes/auth.js';
import { createRollRouter } from './routes/rolls.js';
import { InMemoryRollStore, PostgresRollStore } from './store/rollStore.js';
import { InMemoryUserStore, PostgresUserStore } from './store/userStore.js';
import type { Pool } from 'pg';
import { Pool as PgPool } from 'pg';

function createStores() {
  if (!env.DATABASE_URL) {
    return {
      userStore: new InMemoryUserStore(),
      rollStore: new InMemoryRollStore(),
      mode: 'memory' as const,
    };
  }

  const pool = new PgPool({
    connectionString: env.DATABASE_URL,
  });

  return {
    userStore: new PostgresUserStore(pool as Pool),
    rollStore: new PostgresRollStore(pool as Pool),
    mode: 'postgres' as const,
    pool,
  };
}

export function createApp() {
  const { userStore, rollStore, mode } = createStores();
  const app = express();

  app.use(
    cors({
      origin: env.CLIENT_ORIGINS,
      credentials: true,
    }),
  );
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({
      ok: true,
      authMode: mode,
    });
  });

  app.use('/auth', createAuthRouter({ jwtSecret: env.JWT_SECRET, userStore, rollStore }));
  app.use('/rolls', createRollRouter({ jwtSecret: env.JWT_SECRET, userStore, rollStore }));

  app.use((_req, res) => {
    res.status(404).json({ message: 'Not found' });
  });

  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(error);
    const message = error instanceof Error ? error.message : 'Internal server error.';
    res.status(500).json({ message });
  });

  return app;
}
