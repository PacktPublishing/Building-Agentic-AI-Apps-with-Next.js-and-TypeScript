import { getVerifiedUserId } from '@/lib/supabase/server';

/** Application-level auth composition used by request-bound tool factories. */
export async function resolveRequestUser(request: Request): Promise<{ userId: string; scope: 'private' } | null> {
  const userId = await getVerifiedUserId(request);
  return userId ? { userId, scope: 'private' } : null;
}
