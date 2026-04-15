import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import type { RollInput, RollRecord, RollStatus } from '../types.js';

export interface RollStore {
  listByUserId(userId: string): Promise<RollRecord[]>;
  findById(id: string): Promise<RollRecord | null>;
  create(userId: string, input: RollInput): Promise<RollRecord>;
  update(id: string, input: RollInput): Promise<RollRecord | null>;
  delete(id: string): Promise<boolean>;
}

type RollRow = {
  id: string;
  user_id: string;
  title: string;
  camera: string;
  lens: string;
  film_stock: string;
  iso: number;
  status: RollStatus;
  date_loaded: Date | string;
  notes: string;
  created_at: Date | string;
  updated_at: Date | string;
};

function mapRow(row: RollRow): RollRecord {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    camera: row.camera,
    lens: row.lens,
    filmStock: row.film_stock,
    iso: row.iso,
    status: row.status,
    dateLoaded: typeof row.date_loaded === 'string' ? row.date_loaded : row.date_loaded.toISOString().slice(0, 10),
    notes: row.notes,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export class InMemoryRollStore implements RollStore {
  private readonly rollsById = new Map<string, RollRecord>();

  async listByUserId(userId: string): Promise<RollRecord[]> {
    return [...this.rollsById.values()]
      .filter((roll) => roll.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async findById(id: string): Promise<RollRecord | null> {
    return this.rollsById.get(id) ?? null;
  }

  async create(userId: string, input: RollInput): Promise<RollRecord> {
    const now = new Date();
    const roll: RollRecord = {
      id: randomUUID(),
      userId,
      title: input.title,
      camera: input.camera,
      lens: input.lens,
      filmStock: input.filmStock,
      iso: input.iso,
      status: input.status,
      dateLoaded: input.dateLoaded,
      notes: input.notes,
      createdAt: now,
      updatedAt: now,
    };

    this.rollsById.set(roll.id, roll);
    return roll;
  }

  async update(id: string, input: RollInput): Promise<RollRecord | null> {
    const existing = this.rollsById.get(id);

    if (!existing) {
      return null;
    }

    const updated: RollRecord = {
      ...existing,
      ...input,
      updatedAt: new Date(),
    };

    this.rollsById.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    return this.rollsById.delete(id);
  }
}

export class PostgresRollStore implements RollStore {
  constructor(private readonly pool: Pool) {}

  async listByUserId(userId: string): Promise<RollRecord[]> {
    const result = await this.pool.query<RollRow>(
      `select id, user_id, title, camera, lens, film_stock, iso, status, date_loaded, notes, created_at, updated_at
       from rolls
       where user_id = $1
       order by created_at desc`,
      [userId],
    );

    return result.rows.map(mapRow);
  }

  async findById(id: string): Promise<RollRecord | null> {
    const result = await this.pool.query<RollRow>(
      `select id, user_id, title, camera, lens, film_stock, iso, status, date_loaded, notes, created_at, updated_at
       from rolls
       where id = $1
       limit 1`,
      [id],
    );

    return result.rows[0] ? mapRow(result.rows[0]) : null;
  }

  async create(userId: string, input: RollInput): Promise<RollRecord> {
    const result = await this.pool.query<RollRow>(
      `insert into rolls (user_id, title, camera, lens, film_stock, iso, status, date_loaded, notes)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       returning id, user_id, title, camera, lens, film_stock, iso, status, date_loaded, notes, created_at, updated_at`,
      [userId, input.title, input.camera, input.lens, input.filmStock, input.iso, input.status, input.dateLoaded, input.notes],
    );

    return mapRow(result.rows[0]);
  }

  async update(id: string, input: RollInput): Promise<RollRecord | null> {
    const result = await this.pool.query<RollRow>(
      `update rolls
       set title = $2,
           camera = $3,
           lens = $4,
           film_stock = $5,
           iso = $6,
           status = $7,
           date_loaded = $8,
           notes = $9,
           updated_at = now()
       where id = $1
       returning id, user_id, title, camera, lens, film_stock, iso, status, date_loaded, notes, created_at, updated_at`,
      [id, input.title, input.camera, input.lens, input.filmStock, input.iso, input.status, input.dateLoaded, input.notes],
    );

    return result.rows[0] ? mapRow(result.rows[0]) : null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.pool.query('delete from rolls where id = $1', [id]);
    return result.rowCount !== 0;
  }
}
