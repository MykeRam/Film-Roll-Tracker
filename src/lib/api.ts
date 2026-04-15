import type { AuthSession, FilmRoll, RollDraft, RollStatus, User } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:4000';

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

type RequestOptions = {
  method?: HttpMethod;
  body?: unknown;
  token?: string | null;
};

type ApiErrorPayload = {
  message?: string;
  issues?: Array<{ path: string; message: string }>;
};

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    let payload: ApiErrorPayload | null = null;

    try {
      payload = (await response.json()) as ApiErrorPayload;
    } catch {
      payload = null;
    }

    const message = payload?.message ?? `Request failed with status ${response.status}`;
    const issues = payload?.issues?.map((issue) => `${issue.path}: ${issue.message}`) ?? [];
    throw new Error([message, ...issues].filter(Boolean).join(' '));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export type LoginPayload = {
  email: string;
  password: string;
};

export type RegisterPayload = LoginPayload & {
  name: string;
};

export type RollPayload = Omit<RollDraft, 'iso'> & {
  iso: string;
};

export async function register(payload: RegisterPayload): Promise<AuthSession> {
  return request<AuthSession>('/auth/register', {
    method: 'POST',
    body: payload,
  });
}

export async function login(payload: LoginPayload): Promise<AuthSession> {
  return request<AuthSession>('/auth/login', {
    method: 'POST',
    body: payload,
  });
}

export async function getSession(token: string): Promise<{ user: User | null }> {
  return request<{ user: User | null }>('/auth/me', {
    token,
  });
}

export async function listRolls(token: string): Promise<FilmRoll[]> {
  const response = await request<{ rolls: FilmRoll[] }>('/rolls', { token });
  return response.rolls;
}

export async function createRoll(token: string, payload: RollPayload): Promise<FilmRoll> {
  const response = await request<{ roll: FilmRoll }>('/rolls', {
    method: 'POST',
    body: {
      ...payload,
      iso: Number(payload.iso),
    },
    token,
  });

  return response.roll;
}

export async function updateRoll(token: string, id: string, payload: RollPayload): Promise<FilmRoll> {
  const response = await request<{ roll: FilmRoll }>(`/rolls/${id}`, {
    method: 'PATCH',
    body: {
      ...payload,
      iso: Number(payload.iso),
    },
    token,
  });

  return response.roll;
}

export async function deleteRoll(token: string, id: string): Promise<void> {
  await request<void>(`/rolls/${id}`, {
    method: 'DELETE',
    token,
  });
}

export function getApiBaseUrl() {
  return API_BASE_URL;
}

export function isRollOwner(roll: FilmRoll, userId: string | null | undefined) {
  return Boolean(userId) && roll.userId === userId;
}

export function deriveAuthSession(token: string, user: User): AuthSession {
  return { token, user };
}

export type { FilmRoll, RollStatus, User };
