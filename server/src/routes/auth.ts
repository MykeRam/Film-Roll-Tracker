import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { ZodError, z } from 'zod';
import { requireAuth } from '../middleware/requireAuth.js';
import { defaultRollSeeds } from '../seed/defaultRolls.js';
import type { RollStore } from '../store/rollStore.js';
import { toPublicUserRecord, type UserStore } from '../store/userStore.js';

const authSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(128),
});

const registerSchema = authSchema;

const loginSchema = z.object({
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  password: z.string().min(1).max(128),
});

type CreateAuthRouterParams = {
  jwtSecret: string;
  userStore: UserStore;
  rollStore: RollStore;
};

function signToken(userId: string, email: string, jwtSecret: string) {
  return jwt.sign({ sub: userId, email } satisfies { sub: string; email: string }, jwtSecret, {
    expiresIn: '7d',
  });
}

function handleValidationError(error: unknown) {
  if (error instanceof ZodError) {
    return {
      message: 'Validation failed.',
      issues: error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    };
  }

  return null;
}

export function createAuthRouter({ jwtSecret, userStore, rollStore }: CreateAuthRouterParams) {
  const router = Router();

  router.post('/register', async (req, res, next) => {
    try {
      const parsed = registerSchema.parse(req.body);
      console.log(`[auth/register] start ${parsed.email}`);
      const existingUser = await userStore.findByEmail(parsed.email);

      if (existingUser) {
        return res.status(409).json({ message: 'Email is already registered.' });
      }

      const passwordHash = await bcrypt.hash(parsed.password, 12);
      let createdUser;

      try {
        createdUser = await userStore.create({
          name: parsed.name,
          email: parsed.email,
          passwordHash,
        });
      } catch (error) {
        throw new Error(`Failed to create user account for ${parsed.email}.`, { cause: error });
      }

      for (const seed of defaultRollSeeds) {
        try {
          await rollStore.create(createdUser.id, seed);
        } catch (error) {
          throw new Error(`Failed to seed starter roll "${seed.title}".`, { cause: error });
        }
      }

      const token = signToken(createdUser.id, createdUser.email, jwtSecret);

      return res.status(201).json({
        user: toPublicUserRecord(createdUser),
        token,
      });
    } catch (error) {
      console.error('[auth/register] failed', error);
      const validationError = handleValidationError(error);

      if (validationError) {
        return res.status(400).json(validationError);
      }

      return next(error);
    }
  });

  router.post('/login', async (req, res, next) => {
    try {
      const parsed = loginSchema.parse(req.body);
      console.log(`[auth/login] start ${parsed.email}`);
      const user = await userStore.findByEmail(parsed.email);

      if (!user) {
        return res.status(401).json({ message: 'Invalid email or password.' });
      }

      const passwordMatches = await bcrypt.compare(parsed.password, user.passwordHash);

      if (!passwordMatches) {
        return res.status(401).json({ message: 'Invalid email or password.' });
      }

      const token = signToken(user.id, user.email, jwtSecret);

      return res.json({
        user: toPublicUserRecord(user),
        token,
      });
    } catch (error) {
      console.error('[auth/login] failed', error);
      const validationError = handleValidationError(error);

      if (validationError) {
        return res.status(400).json(validationError);
      }

      return next(error);
    }
  });

  router.get('/me', requireAuth(jwtSecret, userStore), (_req, res) => {
    return res.json({
      user: (res.locals as { authUser?: ReturnType<typeof toPublicUserRecord> }).authUser ?? null,
      requestId: randomUUID(),
    });
  });

  return router;
}
