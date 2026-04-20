import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import type { ActivityStore } from '../store/activityStore.js';
import type { RollStore } from '../store/rollStore.js';
import type { UploadStore } from '../store/uploadStore.js';
import type { UserStore } from '../store/userStore.js';
import type { RollStatus } from '../types.js';

type CreateAnalyticsRouterParams = {
  jwtSecret: string;
  userStore: UserStore;
  rollStore: RollStore;
  uploadStore: UploadStore;
  activityStore: ActivityStore;
};

type CountBucket = {
  label: string;
  count: number;
};

function getCurrentUserId(res: { locals: unknown }) {
  const locals = res.locals as { authUser?: { id: string } };
  return locals.authUser?.id ?? null;
}

function buildCounts<T>(items: T[], keyFn: (item: T) => string): CountBucket[] {
  const counts = new Map<string, number>();

  for (const item of items) {
    const key = keyFn(item).trim() || 'Unknown';
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

function buildMonthlyCounts<T>(items: T[], getDate: (item: T) => Date, months = 6) {
  const now = new Date();
  const labels: string[] = [];
  const counts = new Map<string, number>();

  for (let offset = months - 1; offset >= 0; offset -= 1) {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1));
    const label = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
    labels.push(label);
    counts.set(label, 0);
  }

  for (const item of items) {
    const date = getDate(item);
    const label = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
    if (counts.has(label)) {
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }
  }

  return labels.map((label) => ({ label, count: counts.get(label) ?? 0 }));
}

function toDaysSince(dateValue: string) {
  const loadedAt = new Date(`${dateValue}T00:00:00Z`).getTime();
  return Math.max(0, (Date.now() - loadedAt) / 86_400_000);
}

export function createAnalyticsRouter({
  jwtSecret,
  userStore,
  rollStore,
  uploadStore,
  activityStore,
}: CreateAnalyticsRouterParams) {
  const router = Router();

  router.use(requireAuth(jwtSecret, userStore));

  router.get('/overview', async (_req, res, next) => {
    try {
      const userId = getCurrentUserId(res);

      if (!userId) {
        return res.status(401).json({ message: 'Authentication required.' });
      }

      const [rolls, uploads, activity] = await Promise.all([
        rollStore.listByUserId(userId),
        uploadStore.listByUserId(userId),
        activityStore.listByUserId(userId),
      ]);

      const statusCounts = {
        loaded: 0,
        shot: 0,
        developed: 0,
        scanned: 0,
      } satisfies Record<RollStatus, number>;

      for (const roll of rolls) {
        statusCounts[roll.status] += 1;
      }

      const totalRolls = rolls.length;
      const completedRolls = statusCounts.developed + statusCounts.scanned;
      const averageRollAgeDays = totalRolls
        ? Number(
            (
              rolls.reduce((sum, roll) => sum + toDaysSince(roll.dateLoaded), 0) / totalRolls
            ).toFixed(1),
          )
        : null;

      return res.json({
        summary: {
          totalRolls,
          completedRolls,
          openRolls: statusCounts.loaded + statusCounts.shot,
          totalUploads: uploads.length,
          totalActivity: activity.length,
          averageRollAgeDays,
          statusCounts,
        },
        topCameras: buildCounts(rolls, (roll) => roll.camera).slice(0, 5),
        topFilmStocks: buildCounts(rolls, (roll) => roll.filmStock).slice(0, 5),
        monthlyRolls: buildMonthlyCounts(rolls, (roll) => roll.createdAt),
        monthlyUploads: buildMonthlyCounts(uploads, (upload) => upload.createdAt),
        recentActivity: activity.slice(0, 5),
      });
    } catch (error) {
      return next(error);
    }
  });

  return router;
}
