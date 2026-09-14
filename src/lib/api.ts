import type { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { AuthSession, FilmRoll, RollActivity, RollDraft, RollStatus, RollUpload, User } from '../types';

export type FilmCatalogItem = {
  _id: string;
  brand: string;
  name: string;
  iso: number;
  formatThirtyFive: boolean;
  formatOneTwenty: boolean;
  color: boolean;
  process: string;
  staticImageUrl?: string;
  description?: string;
  keyFeatures?: Array<{ feature: string }>;
};

export type LoginPayload = { email: string; password: string };
export type RegisterPayload = LoginPayload & { name: string };
export type RollPayload = Omit<RollDraft, 'iso'> & { iso: string };
export type RollUploadPayload = { fileName: string; fileType: string; fileSize: number; fileUrl: string };

function requireSupabase() {
  if (!supabase) throw new Error('Supabase has not been configured yet.');
  return supabase;
}

function mapUser(user: SupabaseUser, name?: string | null): User {
  return { id: user.id, name: name?.trim() || user.user_metadata?.name || user.email?.split('@')[0] || 'Photographer', email: user.email ?? '', createdAt: user.created_at };
}

async function currentUser() {
  const client = requireSupabase();
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) throw new Error('You need to sign in again.');
  return data.user;
}

async function publicUser(user: SupabaseUser) {
  const client = requireSupabase();
  const { data } = await client.from('profiles').select('name').eq('id', user.id).maybeSingle();
  return mapUser(user, data?.name);
}

function mapRoll(row: Record<string, unknown>): FilmRoll {
  return { id: String(row.id), userId: String(row.user_id), title: String(row.title), camera: String(row.camera), lens: String(row.lens), filmStock: String(row.film_stock), iso: Number(row.iso), status: row.status as RollStatus, dateLoaded: String(row.date_loaded), notes: String(row.notes ?? '') };
}

function mapUpload(row: Record<string, unknown>): RollUpload {
  return { id: String(row.id), rollId: String(row.roll_id), userId: String(row.user_id), fileName: String(row.file_name), fileType: String(row.file_type), fileSize: Number(row.file_size), fileUrl: String(row.file_url), createdAt: String(row.created_at) };
}

function mapActivity(row: Record<string, unknown>): RollActivity {
  return { id: String(row.id), rollId: row.roll_id ? String(row.roll_id) : null, userId: String(row.user_id), eventType: String(row.event_type), summary: String(row.summary), payload: (row.payload ?? {}) as Record<string, unknown>, createdAt: String(row.created_at) };
}

function throwIfError(error: { message: string } | null) { if (error) throw new Error(error.message); }

export async function register(payload: RegisterPayload): Promise<AuthSession> {
  const client = requireSupabase();
  const { data, error } = await client.auth.signUp({ email: payload.email.trim(), password: payload.password, options: { data: { name: payload.name.trim() }, emailRedirectTo: window.location.href } });
  throwIfError(error);
  if (!data.user || !data.session) throw new Error('Check your email to confirm your account, then log in.');
  return { user: await publicUser(data.user), token: data.session.access_token };
}

export async function login(payload: LoginPayload): Promise<AuthSession> {
  const client = requireSupabase();
  const { data, error } = await client.auth.signInWithPassword({ email: payload.email.trim(), password: payload.password });
  throwIfError(error);
  if (!data.user || !data.session) throw new Error('Invalid email or password.');
  return { user: await publicUser(data.user), token: data.session.access_token };
}

export async function getSession(_token: string): Promise<{ user: User | null }> {
  const client = requireSupabase();
  const { data } = await client.auth.getUser();
  return { user: data.user ? await publicUser(data.user) : null };
}

export async function listRolls(_token: string): Promise<FilmRoll[]> {
  const client = requireSupabase();
  const { data, error } = await client.from('rolls').select('*').order('created_at', { ascending: false });
  throwIfError(error);
  return (data ?? []).map(mapRoll);
}

export async function createRoll(_token: string, payload: RollPayload): Promise<FilmRoll> {
  const client = requireSupabase(); const user = await currentUser();
  const { data, error } = await client.from('rolls').insert({ title: payload.title, camera: payload.camera, lens: payload.lens, film_stock: payload.filmStock, iso: Number(payload.iso), status: payload.status, date_loaded: payload.dateLoaded, notes: payload.notes, user_id: user.id }).select().single();
  throwIfError(error); return mapRoll(data);
}

export async function updateRoll(_token: string, id: string, payload: RollPayload): Promise<FilmRoll> {
  const client = requireSupabase();
  const { data, error } = await client.from('rolls').update({ title: payload.title, camera: payload.camera, lens: payload.lens, film_stock: payload.filmStock, iso: Number(payload.iso), status: payload.status, date_loaded: payload.dateLoaded, notes: payload.notes, updated_at: new Date().toISOString() }).eq('id', id).select().single();
  throwIfError(error); return mapRoll(data);
}

export async function deleteRoll(_token: string, id: string): Promise<void> { const { error } = await requireSupabase().from('rolls').delete().eq('id', id); throwIfError(error); }

export async function listRollActivity(_token: string, id: string): Promise<RollActivity[]> { const { data, error } = await requireSupabase().from('roll_activity').select('*').eq('roll_id', id).order('created_at', { ascending: false }); throwIfError(error); return (data ?? []).map(mapActivity); }

export async function listRollUploads(_token: string, id: string): Promise<RollUpload[]> { const { data, error } = await requireSupabase().from('roll_uploads').select('*').eq('roll_id', id).order('created_at', { ascending: false }); throwIfError(error); return (data ?? []).map(mapUpload); }

export async function createRollUpload(_token: string, id: string, payload: RollUploadPayload): Promise<RollUpload> {
  const client = requireSupabase(); const user = await currentUser();
  const { data, error } = await client.from('roll_uploads').insert({ roll_id: id, user_id: user.id, file_name: payload.fileName, file_type: payload.fileType, file_size: payload.fileSize, file_url: payload.fileUrl }).select().single();
  throwIfError(error); return mapUpload(data);
}

export async function deleteRollUpload(_token: string, _rollId: string, uploadId: string): Promise<void> { const { error } = await requireSupabase().from('roll_uploads').delete().eq('id', uploadId); throwIfError(error); }

export async function listFilmCatalog(): Promise<FilmCatalogItem[]> { const response = await fetch('https://filmapi.vercel.app/api/films'); if (!response.ok) throw new Error(`Film catalog request failed with status ${response.status}`); return (await response.json()) as FilmCatalogItem[]; }
export function getApiBaseUrl() { return 'Supabase'; }
export function isRollOwner(roll: FilmRoll, userId: string | null | undefined) { return Boolean(userId) && roll.userId === userId; }
export function deriveAuthSession(token: string, user: User): AuthSession { return { token, user }; }
export type { FilmRoll, RollStatus, User };
