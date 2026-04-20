import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import type { PublicUser, UserRecord } from '../types.js';

export type CreateUserInput = {
  name: string;
  email: string;
  passwordHash: string;
};

export interface UserStore {
  findByEmail(email: string): Promise<UserRecord | null>;
  findById(id: string): Promise<UserRecord | null>;
  create(input: CreateUserInput): Promise<UserRecord>;
}

function toPublicUser(user: UserRecord): PublicUser {
  const { passwordHash, ...publicUser } = user;
  return publicUser;
}

export class InMemoryUserStore implements UserStore {
  private readonly usersById = new Map<string, UserRecord>();
  private readonly usersByEmail = new Map<string, UserRecord>();

  async findByEmail(email: string): Promise<UserRecord | null> {
    return this.usersByEmail.get(email.toLowerCase()) ?? null;
  }

  async findById(id: string): Promise<UserRecord | null> {
    return this.usersById.get(id) ?? null;
  }

  async create(input: CreateUserInput): Promise<UserRecord> {
    const user: UserRecord = {
      id: randomUUID(),
      name: input.name,
      email: input.email.toLowerCase(),
      passwordHash: input.passwordHash,
      createdAt: new Date(),
    };

    this.usersById.set(user.id, user);
    this.usersByEmail.set(user.email, user);
    return user;
  }
}

type UserRow = {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  created_at: Date | string;
};

function mapRow(row: UserRow): UserRecord {
  return {
    id: row.id,
    name: row.name,
    email: row.email.toLowerCase(),
    passwordHash: row.password_hash,
    createdAt: new Date(row.created_at),
  };
}

export class PostgresUserStore implements UserStore {
  constructor(private readonly pool: Pool) {}

  async findByEmail(email: string): Promise<UserRecord | null> {
    const result = await this.pool.query<UserRow>(
      `select id, name, email, password_hash, created_at
       from users
       where lower(email) = lower($1)
       limit 1`,
      [email],
    );

    return result.rows[0] ? mapRow(result.rows[0]) : null;
  }

  async findById(id: string): Promise<UserRecord | null> {
    const result = await this.pool.query<UserRow>(
      `select id, name, email, password_hash, created_at
       from users
       where id = $1
       limit 1`,
      [id],
    );

    return result.rows[0] ? mapRow(result.rows[0]) : null;
  }

  async create(input: CreateUserInput): Promise<UserRecord> {
    const result = await this.pool.query<UserRow>(
      `insert into users (name, email, password_hash)
       values ($1, lower($2), $3)
       returning id, name, email, password_hash, created_at`,
      [input.name, input.email, input.passwordHash],
    );

    return mapRow(result.rows[0]);
  }
}

export function toPublicUserRecord(user: UserRecord): PublicUser {
  return toPublicUser(user);
}
