import { createClient } from '@supabase/supabase-js';

/**
 * Verify the caller's Supabase access token on the server. Never accept a
 * model-supplied user id as an authorization source.
 */
export async function getVerifiedUserId(request: Request): Promise<string | null> {
  const header = request.headers.get('authorization') || '';
  const token = header.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  const client = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await client.auth.getUser(token);
  return error || !data.user ? null : data.user.id;
}
