import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import postgres from 'postgres';
import { z } from 'zod';

export type Pattern = 'supervisor' | 'swarm' | 'approval';
const threadSchema = z.string().uuid();
const bodySchema = z.object({
  message: z.string().trim().min(1).max(4000),
  threadId: threadSchema.optional(),
  stream: z.boolean().optional().default(false),
}).strict();

export class SessionError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

let database: ReturnType<typeof postgres> | undefined;
function sql() {
  if (!process.env.POSTGRES_URL) throw new SessionError(503, 'Conversation storage unavailable');
  let host: string;
  try { host = new URL(process.env.POSTGRES_URL).hostname; }
  catch { throw new SessionError(503, 'Conversation storage unavailable'); }
  const local = process.env.NODE_ENV !== 'production' && (host === '127.0.0.1' || host === 'localhost');
  return database ??= postgres(process.env.POSTGRES_URL, { prepare: false, ssl: local ? false : 'verify-full' });
}

export async function authenticatedUser(request: Request): Promise<string> {
  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ') || authorization.slice(7).trim().length === 0) {
    throw new SessionError(401, 'Authentication required');
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new SessionError(503, 'Authentication unavailable');
  const client = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await client.auth.getUser(authorization.slice(7));
  if (error || !data.user?.id) throw new SessionError(401, 'Authentication required');
  return data.user.id;
}

export async function resolveThread(userId: string, pattern: Pattern, requestedId?: string): Promise<{ publicId: string; internalId: string }> {
  const client = sql();
  const parsed = requestedId === undefined ? undefined : threadSchema.safeParse(requestedId);
  if (parsed && !parsed.success) throw new SessionError(400, 'Invalid conversation ID');
  const publicId = parsed?.data ?? randomUUID();
  if (!requestedId) {
    await client`INSERT INTO orchestration_threads (id, user_id, pattern) VALUES (${publicId}, ${userId}, ${pattern})`;
  } else {
    const rows = await client`SELECT id FROM orchestration_threads WHERE id = ${publicId} AND user_id = ${userId} AND pattern = ${pattern} AND expires_at > NOW()`;
    if (rows.length !== 1) throw new SessionError(404, 'Conversation not found');
  }
  return { publicId, internalId: `${pattern}:${userId}:${publicId}` };
}

export async function beginRun(userId: string, pattern: Pattern, publicId: string): Promise<() => Promise<void>> {
  const client = sql();
  const runId = randomUUID();
  const rows = await client`UPDATE orchestration_threads SET lease_id = ${runId}, lease_until = NOW() + INTERVAL '75 seconds', expires_at = NOW() + INTERVAL '30 days'
    WHERE id = ${publicId} AND user_id = ${userId} AND pattern = ${pattern} AND (lease_until IS NULL OR lease_until < NOW()) RETURNING id`;
  if (rows.length !== 1) throw new SessionError(429, 'Conversation is busy');
  try {
    const usage = await client`INSERT INTO orchestration_daily_usage (user_id, day, used) VALUES (${userId}, CURRENT_DATE, 1)
      ON CONFLICT (user_id, day) DO UPDATE SET used = orchestration_daily_usage.used + 1
      WHERE orchestration_daily_usage.used < 30 RETURNING used`;
    if (usage.length !== 1) throw new SessionError(429, 'Daily conversation limit reached');
  } catch (error) {
    await client`UPDATE orchestration_threads SET lease_id = NULL, lease_until = NULL WHERE id = ${publicId} AND lease_id = ${runId}`;
    throw error;
  }
  return async () => {
    await client`UPDATE orchestration_threads SET lease_id = NULL, lease_until = NULL WHERE id = ${publicId} AND lease_id = ${runId}`;
  };
}

export function parseConversationBody(value: unknown) {
  const result = bodySchema.safeParse(value);
  if (!result.success) throw new SessionError(400, 'Invalid conversation request');
  return result.data;
}

export function publicSessionError(error: unknown) {
  return error instanceof SessionError ? error : new SessionError(503, 'Conversation temporarily unavailable');
}

/** Delete only expired, idle conversations and their checkpoint rows. Schedule daily. */
export async function pruneExpiredConversations(): Promise<number> {
  const client = sql();
  return client.begin(async (tx) => {
    const rows = await tx`SELECT id, user_id, pattern FROM orchestration_threads
      WHERE expires_at < NOW() AND (lease_until IS NULL OR lease_until < NOW())
      ORDER BY expires_at LIMIT 100 FOR UPDATE SKIP LOCKED`;
    for (const row of rows) {
      const internalId = `${row.pattern}:${row.user_id}:${row.id}`;
      await tx`DELETE FROM checkpoint_writes WHERE thread_id = ${internalId}`;
      await tx`DELETE FROM checkpoint_blobs WHERE thread_id = ${internalId}`;
      await tx`DELETE FROM checkpoints WHERE thread_id = ${internalId}`;
      await tx`DELETE FROM orchestration_threads WHERE id = ${row.id}`;
    }
    await tx`DELETE FROM orchestration_daily_usage WHERE day < CURRENT_DATE - INTERVAL '30 days'`;
    return rows.length;
  });
}
