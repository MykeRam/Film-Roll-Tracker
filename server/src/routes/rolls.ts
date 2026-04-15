import { Router } from 'express';
import { ZodError, z } from 'zod';
import { requireAuth } from '../middleware/requireAuth.js';
import type { RollStore } from '../store/rollStore.js';
import type { RollInput } from '../types.js';
import type { UserStore } from '../store/userStore.js';

const rollSchema = z.object({
  title: z.string().trim().min(2).max(120),
  camera: z.string().trim().min(1).max(120),
  lens: z.string().trim().min(1).max(120),
  filmStock: z.string().trim().min(1).max(120),
  iso: z.number().int().positive().max(51200),
  status: z.enum(['loaded', 'shot', 'developed', 'scanned']),
  dateLoaded: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().trim().max(2000),
});

function parseValidationError(error: unknown) {
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

function toRollInput(body: unknown): RollInput {
  return rollSchema.parse(body);
}

type CreateRollRouterParams = {
  jwtSecret: string;
  userStore: UserStore;
  rollStore: RollStore;
};

export function createRollRouter({ jwtSecret, userStore, rollStore }: CreateRollRouterParams) {
  const router = Router();

  router.use(requireAuth(jwtSecret, userStore));

  router.get('/', async (_req, res, next) => {
    try {
      const currentUser = (res.locals as { authUser?: { id: string } }).authUser;

      if (!currentUser) {
        return res.status(401).json({ message: 'Authentication required.' });
      }

      const rolls = await rollStore.listByUserId(currentUser.id);
      return res.json({ rolls });
    } catch (error) {
      return next(error);
    }
  });

  router.post('/', async (req, res, next) => {
    try {
      const currentUser = (res.locals as { authUser?: { id: string } }).authUser;

      if (!currentUser) {
        return res.status(401).json({ message: 'Authentication required.' });
      }

      const roll = await rollStore.create(currentUser.id, toRollInput(req.body));
      return res.status(201).json({ roll });
    } catch (error) {
      const validationError = parseValidationError(error);

      if (validationError) {
        return res.status(400).json(validationError);
      }

      return next(error);
    }
  });

  router.patch('/:id', async (req, res, next) => {
    try {
      const currentUser = (res.locals as { authUser?: { id: string } }).authUser;
      const existingRoll = await rollStore.findById(req.params.id);

      if (!currentUser) {
        return res.status(401).json({ message: 'Authentication required.' });
      }

      if (!existingRoll) {
        return res.status(404).json({ message: 'Roll not found.' });
      }

      if (existingRoll.userId !== currentUser.id) {
        return res.status(403).json({ message: 'You can only edit your own rolls.' });
      }

      const updatedRoll = await rollStore.update(req.params.id, toRollInput(req.body));
      return res.json({ roll: updatedRoll });
    } catch (error) {
      const validationError = parseValidationError(error);

      if (validationError) {
        return res.status(400).json(validationError);
      }

      return next(error);
    }
  });

  router.delete('/:id', async (req, res, next) => {
    try {
      const currentUser = (res.locals as { authUser?: { id: string } }).authUser;
      const existingRoll = await rollStore.findById(req.params.id);

      if (!currentUser) {
        return res.status(401).json({ message: 'Authentication required.' });
      }

      if (!existingRoll) {
        return res.status(404).json({ message: 'Roll not found.' });
      }

      if (existingRoll.userId !== currentUser.id) {
        return res.status(403).json({ message: 'You can only delete your own rolls.' });
      }

      await rollStore.delete(req.params.id);
      return res.status(204).send();
    } catch (error) {
      return next(error);
    }
  });

  return router;
}
