import { describe, expect, it } from 'vitest';
import { verifiedPostgresConnection } from './postgres-connection';

describe('verified PostgreSQL connection fields', () => {
  it('keeps certificate verification even when a URL asks to disable SSL', () => {
    const connection = verifiedPostgresConnection(
      'postgresql://migrator:p%40ssword@db.example.test:6543/travel_test?sslmode=disable',
      'test-ca-line-1\\ntest-ca-line-2',
    );
    expect(connection).toMatchObject({ host: 'db.example.test', port: 6543, user: 'migrator',
      password: 'p@ssword', database: 'travel_test',
      ssl: { rejectUnauthorized: true, ca: 'test-ca-line-1\ntest-ca-line-2' } });
    expect(connection).not.toHaveProperty('connectionString');
  });

  it('rejects missing and malformed URLs without including the supplied value in the error', () => {
    expect(() => verifiedPostgresConnection(undefined)).toThrow('POSTGRES_URL_NON_POOLING is required');
    expect(() => verifiedPostgresConnection('secret-but-not-a-url')).toThrow('Invalid database URL');
  });
});
