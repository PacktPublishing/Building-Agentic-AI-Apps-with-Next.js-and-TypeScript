export type Feature = 'chat' | 'retrieval' | 'persistence' | 'auth';

export class FeatureConfigError extends Error {
  constructor(feature: Feature) { super(`${feature} is not configured`); }
}

type FeatureEnvironment = Record<string, string | undefined>;

function value(env: FeatureEnvironment, name: string): string | undefined {
  return env[name]?.trim() || undefined;
}

function trustedUrl(raw: string | undefined, pathname?: string, production = process.env.NODE_ENV === 'production'): boolean {
  if (!raw) return false;
  try {
    const url = new URL(raw);
    if (url.username || url.password || url.hash) return false;
    if (pathname && url.pathname !== pathname) return false;
    if (url.protocol === 'https:') return true;
    return !production && url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname);
  } catch { return false; }
}

export function validateFeature(feature: Feature, env: FeatureEnvironment = process.env): void {
  const fail = () => { throw new FeatureConfigError(feature); };
  const production = env.NODE_ENV === 'production';
  if (feature === 'chat') {
    const model = value(env, 'MODEL_NAME') || 'claude-sonnet-4-5-20250929';
    if (!value(env, 'ANTHROPIC_API_KEY') ||
      !/^claude-(?:(?:sonnet|opus|haiku)-\d+(?:-\d+)?|\d+(?:-\d+)?-(?:sonnet|opus|haiku))(-\d{8})?$/.test(model) ||
      !value(env, 'AMADEUS_BEARER_TOKEN') || !trustedUrl(value(env, 'AMADEUS_URL'), '/api/mcp', production)) fail();
  }
  if (feature === 'retrieval') {
    const endpoint = value(env, 'QDRANT_URL');
    if (!value(env, 'OPENAI_API_KEY') || !trustedUrl(endpoint, undefined, production) ||
      (endpoint && new URL(endpoint).protocol === 'https:' && !value(env, 'QDRANT_API_KEY'))) fail();
  }
  if (feature === 'auth') {
    if (!trustedUrl(value(env, 'NEXT_PUBLIC_SUPABASE_URL'), undefined, production) || !value(env, 'NEXT_PUBLIC_SUPABASE_ANON_KEY')) fail();
  }
  if (feature === 'persistence') {
    const database = value(env, 'POSTGRES_URL');
    try {
      const url = new URL(database || '');
      if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.hostname) fail();
    } catch { fail(); }
  }
}
