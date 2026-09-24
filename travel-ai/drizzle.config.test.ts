import { afterEach, describe, expect, it, vi } from 'vitest';

describe('migration connection configuration', () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

  it('passes certificate verification to the pg connection-params branch used by Drizzle Kit', async () => {
    vi.stubEnv('POSTGRES_URL_NON_POOLING', 'postgresql://migrator:p%40ssword@db.example.test:6543/travel_test');
    vi.stubEnv('POSTGRES_CA_CERT', 'test-ca-line-1\\ntest-ca-line-2');
    vi.resetModules();
    const config = (await import('./drizzle.config')).default;
    const credentials = (config as { dbCredentials: unknown }).dbCredentials;
    expect(credentials).toMatchObject({
      host: 'db.example.test', port: 6543, user: 'migrator', password: 'p@ssword', database: 'travel_test',
      ssl: { rejectUnauthorized: true, ca: 'test-ca-line-1\ntest-ca-line-2' },
    });
    expect(credentials).not.toHaveProperty('url');
  });

  it('fails closed when migration credentials are absent', async () => {
    vi.stubEnv('POSTGRES_URL_NON_POOLING', '');
    vi.resetModules();
    await expect(import('./drizzle.config')).rejects.toThrow('POSTGRES_URL_NON_POOLING is required');
  });
});
