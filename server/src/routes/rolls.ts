import { Router } from 'express';
import { ZodError, z } from 'zod';
import { requireAuth } from '../middleware/requireAuth.js';
import type { ActivityStore } from '../store/activityStore.js';
import type { RollStore } from '../store/rollStore.js';
import type { RollInput } from '../types.js';
import type { UploadStore } from '../store/uploadStore.js';
import type { UserStore } from '../store/userStore.js';
import type { UploadInput } from '../types.js';

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

const uploadSchema = z.object({
  fileName: z.string().trim().min(1).max(255),
  fileType: z.string().trim().min(1).max(255),
  fileSize: z.number().int().nonnegative().max(25_000_000),
  fileUrl: z.string().trim().min(1),
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

function toUploadInput(body: unknown): UploadInput {
  return uploadSchema.parse(body);
}

function serializeRoll(roll: {
  id: string;
  userId: string;
  title: string;
  camera: string;
  lens: string;
  filmStock: string;
  iso: number;
  status: string;
  dateLoaded: string;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: roll.id,
    userId: roll.userId,
    title: roll.title,
    camera: roll.camera,
    lens: roll.lens,
    filmStock: roll.filmStock,
    iso: roll.iso,
    status: roll.status,
    dateLoaded: roll.dateLoaded,
    notes: roll.notes,
    createdAt: roll.createdAt.toISOString(),
    updatedAt: roll.updatedAt.toISOString(),
  };
}

function diffRoll(before: ReturnType<typeof serializeRoll>, after: ReturnType<typeof serializeRoll>) {
  const fields = ['title', 'camera', 'lens', 'filmStock', 'iso', 'status', 'dateLoaded', 'notes'] as const;
  const changes: Record<string, { before: unknown; after: unknown }> = {};

  for (const field of fields) {
    if (before[field] !== after[field]) {
      changes[field] = {
        before: before[field],
        after: after[field],
      };
    }
  }

  return changes;
}

type CreateRollRouterParams = {
  jwtSecret: string;
  userStore: UserStore;
  rollStore: RollStore;
  uploadStore: UploadStore;
  activityStore: ActivityStore;
};

export function createRollRouter({ jwtSecret, userStore, rollStore, uploadStore, activityStore }: CreateRollRouterParams) {
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
      await activityStore.create(currentUser.id, roll.id, {
        eventType: 'roll_created',
        summary: `Created "${roll.title}".`,
        payload: serializeRoll(roll),
      });
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
      if (!updatedRoll) {
        return res.status(404).json({ message: 'Roll not found.' });
      }

      const before = serializeRoll(existingRoll);
      const after = serializeRoll(updatedRoll);
      const changes = diffRoll(before, after);
      await activityStore.create(currentUser.id, updatedRoll.id, {
        eventType: 'roll_updated',
        summary:
          Object.keys(changes).length > 0
            ? `Updated "${updatedRoll.title}" with ${Object.keys(changes).join(', ')}.`
            : `Saved "${updatedRoll.title}" without field changes.`,
        payload: {
          before,
          after,
          changes,
        },
      });
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

      await activityStore.create(currentUser.id, existingRoll.id, {
        eventType: 'roll_deleted',
        summary: `Deleted "${existingRoll.title}".`,
        payload: serializeRoll(existingRoll),
      });
      await rollStore.delete(req.params.id);
      return res.status(204).send();
    } catch (error) {
      return next(error);
    }
  });

  router.get('/:id/activity', async (req, res, next) => {
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
        return res.status(403).json({ message: 'You can only view your own roll activity.' });
      }

      const activity = await activityStore.listByRollId(existingRoll.id);
      return res.json({ activity });
    } catch (error) {
      return next(error);
    }
  });

  router.get('/:id/uploads', async (req, res, next) => {
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
        return res.status(403).json({ message: 'You can only view your own uploads.' });
      }

      const uploads = await uploadStore.listByRollId(existingRoll.id);
      return res.json({ uploads });
    } catch (error) {
      return next(error);
    }
  });

  router.post('/:id/uploads', async (req, res, next) => {
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
        return res.status(403).json({ message: 'You can only upload files to your own rolls.' });
      }

      const upload = await uploadStore.create(currentUser.id, existingRoll.id, toUploadInput(req.body));
      await activityStore.create(currentUser.id, existingRoll.id, {
        eventType: 'upload_added',
        summary: `Added ${upload.fileName} to "${existingRoll.title}".`,
        payload: {
          upload,
        },
      });

      return res.status(201).json({ upload });
    } catch (error) {
      const validationError = parseValidationError(error);

      if (validationError) {
        return res.status(400).json(validationError);
      }

      return next(error);
    }
  });

  router.delete('/:id/uploads/:uploadId', async (req, res, next) => {
    try {
      const currentUser = (res.locals as { authUser?: { id: string } }).authUser;
      const existingRoll = await rollStore.findById(req.params.id);
      const upload = await uploadStore.findById(req.params.uploadId);

      if (!currentUser) {
        return res.status(401).json({ message: 'Authentication required.' });
      }

      if (!existingRoll) {
        return res.status(404).json({ message: 'Roll not found.' });
      }

      if (!upload || upload.rollId !== existingRoll.id) {
        return res.status(404).json({ message: 'Upload not found.' });
      }

      if (existingRoll.userId !== currentUser.id || upload.userId !== currentUser.id) {
        return res.status(403).json({ message: 'You can only delete your own uploads.' });
      }

      await activityStore.create(currentUser.id, existingRoll.id, {
        eventType: 'upload_removed',
        summary: `Removed ${upload.fileName} from "${existingRoll.title}".`,
        payload: {
          upload,
        },
      });

      await uploadStore.delete(upload.id);
      return res.status(204).send();
    } catch (error) {
      return next(error);
    }
  });

  return router;
}
