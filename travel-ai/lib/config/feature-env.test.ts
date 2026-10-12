import { describe, expect, it } from 'vitest';
import { FeatureConfigError, validateFeature } from './feature-env';

describe('deployment feature configuration', () => {
  it('fails safely on blank or invalid chat configuration', () => {
    for (const env of [{}, { ANTHROPIC_API_KEY: ' ', AMADEUS_BEARER_TOKEN: 'token', AMADEUS_URL: 'https://mcp.example/api/mcp' },
      { ANTHROPIC_API_KEY: 'key', AMADEUS_BEARER_TOKEN: 'token', AMADEUS_URL: 'https://other.example/api/mcp', MODEL_NAME: 'invalid' },
      { ANTHROPIC_API_KEY: 'key', AMADEUS_BEARER_TOKEN: 'token', AMADEUS_URL: 'https://other.example/api/mcp', MODEL_NAME: 'claude-fake-model' },
      { ANTHROPIC_API_KEY: 'key', AMADEUS_BEARER_TOKEN: 'token', AMADEUS_URL: 'http://mcp.example/api/mcp' }]) {
      expect(() => validateFeature('chat', env)).toThrow(FeatureConfigError);
    }
    expect(() => validateFeature('chat', { ANTHROPIC_API_KEY: 'key', AMADEUS_BEARER_TOKEN: 'token', AMADEUS_URL: 'https://mcp.example/api/mcp' })).not.toThrow();
  });
  it('requires explicit retrieval and auth services without printing configuration values', () => {
    expect(() => validateFeature('retrieval', { OPENAI_API_KEY: 'secret', QDRANT_URL: 'http://public.example:6333' })).toThrow('retrieval is not configured');
    expect(() => validateFeature('retrieval', { OPENAI_API_KEY: 'secret', QDRANT_URL: 'https://q.example' })).toThrow('retrieval is not configured');
    expect(() => validateFeature('retrieval', { OPENAI_API_KEY: 'secret', QDRANT_URL: 'https://q.example', QDRANT_API_KEY: 'secret' })).not.toThrow();
    expect(() => validateFeature('auth', { NEXT_PUBLIC_SUPABASE_URL: 'https://s.example', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon' })).not.toThrow();
    expect(() => validateFeature('auth', { NEXT_PUBLIC_SUPABASE_URL: 'file:///etc/passwd', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon' })).toThrow('auth is not configured');
  });
  it('validates persistence without including the supplied URL in errors', () => {
    expect(() => validateFeature('persistence', { POSTGRES_URL: 'invalid-private-value' })).toThrow('persistence is not configured');
    expect(() => validateFeature('persistence', { POSTGRES_URL: 'postgresql://u:password@db.example/app' })).not.toThrow();
  });
});
