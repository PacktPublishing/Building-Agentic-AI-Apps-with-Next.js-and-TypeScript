import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { validateFeature } from '@/lib/config/feature-env';

let instance: SupabaseClient | undefined;

export function getSupabaseClient(): SupabaseClient {
  validateFeature('auth');
  if (instance) return instance;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) throw new Error('Supabase authentication is not configured');
  try { new URL(url); } catch { throw new Error('Supabase authentication endpoint is invalid'); }
  instance = createClient(url, key);
  return instance;
}
