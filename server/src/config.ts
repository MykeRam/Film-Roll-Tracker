import { config as loadEnv } from 'dotenv';
import { resolve } from 'node:path';

loadEnv({ path: resolve(process.cwd(), 'server/.env') });

const defaultOrigins = ['http://127.0.0.1:5173', 'http://localhost:5173'];

function parseOrigins(value: string | undefined) {
  if (!value) {
    return defaultOrigins;
  }

  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export const env = {
  PORT: Number(process.env.PORT ?? 4000),
  HOST: '127.0.0.1',
  JWT_SECRET: process.env.JWT_SECRET ?? 'film-roll-tracker-dev-secret',
  DATABASE_URL: process.env.DATABASE_URL?.trim() || null,
  CLIENT_ORIGINS: parseOrigins(process.env.CLIENT_ORIGIN),
};
