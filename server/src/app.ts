import cors from 'cors';
import express from 'express';
import { env } from './config.js';
import { createAuthRouter } from './routes/auth.js';
import { InMemoryUserStore, PostgresUserStore } from './store/userStore.js';
import type { Pool } from 'pg';
import { Pool as PgPool } from 'pg';

function createUserStore() {
  if (!env.DATABASE_URL) {
    return {
      store: new InMemoryUserStore(),
      mode: 'memory' as const,
      pool: null,
    };
  }

  const pool = new PgPool({
    connectionString: env.DATABASE_URL,
  });

  return {
    store: new PostgresUserStore(pool as Pool),
    mode: 'postgres' as const,
    pool,
  };
}

export function createApp() {
  const { store, mode } = createUserStore();
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

  app.use('/auth', createAuthRouter({ jwtSecret: env.JWT_SECRET, userStore: store }));

  app.use((_req, res) => {
    res.status(404).json({ message: 'Not found' });
  });

  return app;
}

