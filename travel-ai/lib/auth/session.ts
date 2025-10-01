/**
 * Session Management
 * Helper functions for managing user sessions
 */

import { cookies } from 'next/headers';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export interface Session {
  user: {
    id: string;
    email: string;
    name?: string;
  };
  accessToken: string;
  refreshToken: string;
}

/**
 * Get current session from cookies
 */
export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Get session token from cookies
  const accessToken = cookieStore.get('sb-access-token')?.value;
  const refreshToken = cookieStore.get('sb-refresh-token')?.value;
  
  if (!accessToken) {
    return null;
  }

  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    return null;
  }

  return {
    user: {
      id: session.user.id,
      email: session.user.email!,
      name: session.user.user_metadata?.name,
    },
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
  };
}

/**
 * Require authentication - throws if no session
 */
export async function requireAuth(): Promise<Session> {
  const session = await getSession();
  
  if (!session) {
    throw new Error('Unauthorized');
  }
  
  return session;
}

/**
 * Get user ID from session
 */
export async function getUserId(): Promise<string | null> {
  const session = await getSession();
  return session?.user.id || null;
}
