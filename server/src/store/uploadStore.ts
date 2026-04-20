import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import type { RollUploadRecord, UploadInput } from '../types.js';

export interface UploadStore {
  listByUserId(userId: string): Promise<RollUploadRecord[]>;
  listByRollId(rollId: string): Promise<RollUploadRecord[]>;
  findById(id: string): Promise<RollUploadRecord | null>;
  create(userId: string, rollId: string, input: UploadInput): Promise<RollUploadRecord>;
  delete(id: string): Promise<boolean>;
}

type UploadRow = {
  id: string;
  roll_id: string;
  user_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  file_url: string;
  created_at: Date | string;
};

function mapRow(row: UploadRow): RollUploadRecord {
  return {
    id: row.id,
    rollId: row.roll_id,
    userId: row.user_id,
    fileName: row.file_name,
    fileType: row.file_type,
    fileSize: Number(row.file_size),
    fileUrl: row.file_url,
    createdAt: new Date(row.created_at),
  };
}

export class InMemoryUploadStore implements UploadStore {
  private readonly uploadsById = new Map<string, RollUploadRecord>();

  async listByUserId(userId: string): Promise<RollUploadRecord[]> {
    return [...this.uploadsById.values()]
      .filter((upload) => upload.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async listByRollId(rollId: string): Promise<RollUploadRecord[]> {
    return [...this.uploadsById.values()]
      .filter((upload) => upload.rollId === rollId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async findById(id: string): Promise<RollUploadRecord | null> {
    return this.uploadsById.get(id) ?? null;
  }

  async create(userId: string, rollId: string, input: UploadInput): Promise<RollUploadRecord> {
    const upload: RollUploadRecord = {
      id: randomUUID(),
      rollId,
      userId,
      fileName: input.fileName,
      fileType: input.fileType,
      fileSize: input.fileSize,
      fileUrl: input.fileUrl,
      createdAt: new Date(),
    };

    this.uploadsById.set(upload.id, upload);
    return upload;
  }

  async delete(id: string): Promise<boolean> {
    return this.uploadsById.delete(id);
  }
}

export class PostgresUploadStore implements UploadStore {
  constructor(private readonly pool: Pool) {}

  async listByUserId(userId: string): Promise<RollUploadRecord[]> {
    const result = await this.pool.query<UploadRow>(
      `select id, roll_id, user_id, file_name, file_type, file_size, file_url, created_at
       from roll_uploads
       where user_id = $1
       order by created_at desc`,
      [userId],
    );

    return result.rows.map(mapRow);
  }

  async listByRollId(rollId: string): Promise<RollUploadRecord[]> {
    const result = await this.pool.query<UploadRow>(
      `select id, roll_id, user_id, file_name, file_type, file_size, file_url, created_at
       from roll_uploads
       where roll_id = $1
       order by created_at desc`,
      [rollId],
    );

    return result.rows.map(mapRow);
  }

  async findById(id: string): Promise<RollUploadRecord | null> {
    const result = await this.pool.query<UploadRow>(
      `select id, roll_id, user_id, file_name, file_type, file_size, file_url, created_at
       from roll_uploads
       where id = $1
       limit 1`,
      [id],
    );

    return result.rows[0] ? mapRow(result.rows[0]) : null;
  }

  async create(userId: string, rollId: string, input: UploadInput): Promise<RollUploadRecord> {
    const result = await this.pool.query<UploadRow>(
      `insert into roll_uploads (roll_id, user_id, file_name, file_type, file_size, file_url)
       values ($1, $2, $3, $4, $5, $6)
       returning id, roll_id, user_id, file_name, file_type, file_size, file_url, created_at`,
      [rollId, userId, input.fileName, input.fileType, input.fileSize, input.fileUrl],
    );

    return mapRow(result.rows[0]);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.pool.query('delete from roll_uploads where id = $1', [id]);
    return result.rowCount !== 0;
  }
}
