import type {
  AnalyticsOverview,
  AuthSession,
  FilmRoll,
  RollActivity,
  RollDraft,
  RollStatus,
  RollUpload,
  User,
} from '../types';

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
    const responseText = await response.text();
    let payload: ApiErrorPayload | null = null;

    try {
      payload = responseText ? (JSON.parse(responseText) as ApiErrorPayload) : null;
    } catch {
      payload = null;
    }

    const payloadMessage = payload?.message?.trim() ?? '';
    const message = payloadMessage || `Request failed with status ${response.status}`;
    const issues = payload?.issues?.map((issue) => `${issue.path}: ${issue.message}`) ?? [];
    const detail = !payloadMessage && responseText && !responseText.trim().startsWith('{') ? responseText : '';
    throw new Error([message, ...issues, detail].filter(Boolean).join(' '));
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

export type RollUploadPayload = {
  fileName: string;
  fileType: string;
  fileSize: number;
  fileUrl: string;
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

export async function listRollActivity(token: string, id: string): Promise<RollActivity[]> {
  const response = await request<{ activity: RollActivity[] }>(`/rolls/${id}/activity`, { token });
  return response.activity;
}

export async function listRollUploads(token: string, id: string): Promise<RollUpload[]> {
  const response = await request<{ uploads: RollUpload[] }>(`/rolls/${id}/uploads`, { token });
  return response.uploads;
}

export async function createRollUpload(token: string, id: string, payload: RollUploadPayload): Promise<RollUpload> {
  const response = await request<{ upload: RollUpload }>(`/rolls/${id}/uploads`, {
    method: 'POST',
    body: payload,
    token,
  });

  return response.upload;
}

export async function deleteRollUpload(token: string, rollId: string, uploadId: string): Promise<void> {
  await request<void>(`/rolls/${rollId}/uploads/${uploadId}`, {
    method: 'DELETE',
    token,
  });
}

export async function getAnalyticsOverview(token: string): Promise<AnalyticsOverview> {
  return request<AnalyticsOverview>('/analytics/overview', { token });
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
