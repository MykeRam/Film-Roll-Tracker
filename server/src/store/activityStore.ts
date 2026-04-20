import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import type { ActivityInput, RollActivityRecord } from '../types.js';

export interface ActivityStore {
  listByUserId(userId: string): Promise<RollActivityRecord[]>;
  listByRollId(rollId: string): Promise<RollActivityRecord[]>;
  create(userId: string, rollId: string | null, input: ActivityInput): Promise<RollActivityRecord>;
}

type ActivityRow = {
  id: string;
  roll_id: string | null;
  user_id: string;
  event_type: string;
  summary: string;
  payload: Record<string, unknown> | string;
  created_at: Date | string;
};

function mapPayload(value: ActivityRow['payload']): Record<string, unknown> {
  if (!value) {
    return {};
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {};
    } catch {
      return {};
    }
  }

  return value;
}

function mapRow(row: ActivityRow): RollActivityRecord {
  return {
    id: row.id,
    rollId: row.roll_id,
    userId: row.user_id,
    eventType: row.event_type,
    summary: row.summary,
    payload: mapPayload(row.payload),
    createdAt: new Date(row.created_at),
  };
}

export class InMemoryActivityStore implements ActivityStore {
  private readonly activitiesById = new Map<string, RollActivityRecord>();

  async listByUserId(userId: string): Promise<RollActivityRecord[]> {
    return [...this.activitiesById.values()]
      .filter((activity) => activity.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async listByRollId(rollId: string): Promise<RollActivityRecord[]> {
    return [...this.activitiesById.values()]
      .filter((activity) => activity.rollId === rollId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async create(userId: string, rollId: string | null, input: ActivityInput): Promise<RollActivityRecord> {
    const activity: RollActivityRecord = {
      id: randomUUID(),
      rollId,
      userId,
      eventType: input.eventType,
      summary: input.summary,
      payload: input.payload ?? {},
      createdAt: new Date(),
    };

    this.activitiesById.set(activity.id, activity);
    return activity;
  }
}

export class PostgresActivityStore implements ActivityStore {
  constructor(private readonly pool: Pool) {}

  async listByUserId(userId: string): Promise<RollActivityRecord[]> {
    const result = await this.pool.query<ActivityRow>(
      `select id, roll_id, user_id, event_type, summary, payload, created_at
       from roll_activity
       where user_id = $1
       order by created_at desc`,
      [userId],
    );

    return result.rows.map(mapRow);
  }

  async listByRollId(rollId: string): Promise<RollActivityRecord[]> {
    const result = await this.pool.query<ActivityRow>(
      `select id, roll_id, user_id, event_type, summary, payload, created_at
       from roll_activity
       where roll_id = $1
       order by created_at desc`,
      [rollId],
    );

    return result.rows.map(mapRow);
  }

  async create(userId: string, rollId: string | null, input: ActivityInput): Promise<RollActivityRecord> {
    const result = await this.pool.query<ActivityRow>(
      `insert into roll_activity (roll_id, user_id, event_type, summary, payload)
       values ($1, $2, $3, $4, $5)
       returning id, roll_id, user_id, event_type, summary, payload, created_at`,
      [rollId, userId, input.eventType, input.summary, input.payload ?? {}],
    );

    return mapRow(result.rows[0]);
  }
}
