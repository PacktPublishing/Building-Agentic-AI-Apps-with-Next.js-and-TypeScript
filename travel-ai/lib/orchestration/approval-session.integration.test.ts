import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { resolveThread, SessionError } from './session';

const databaseUrl = process.env.TEST_POSTGRES_URL;

describe.skipIf(!databaseUrl)('approval session ownership (isolated Postgres)', () => {
  it('binds an opaque approval conversation to its authenticated owner', async () => {
    process.env.POSTGRES_URL = databaseUrl;
    const db = postgres(databaseUrl!, { prepare: false, ssl: false });
    try {
      const first = await readFile(resolve(process.cwd(), 'drizzle/0004_orchestration_sessions.sql'), 'utf8');
      const second = await readFile(resolve(process.cwd(), 'drizzle/0005_approval_sessions.sql'), 'utf8');
      await db.unsafe(first);
      await db.unsafe(second);
      const own = await resolveThread('owner-a', 'approval');
      expect(own.internalId).toBe(`approval:owner-a:${own.publicId}`);
      expect(await resolveThread('owner-a', 'approval', own.publicId)).toEqual(own);
      await expect(resolveThread('owner-b', 'approval', own.publicId)).rejects.toMatchObject({ status: 404 });
      await expect(resolveThread('owner-a', 'supervisor', own.publicId)).rejects.toMatchObject({ status: 404 });
      await expect(resolveThread('owner-a', 'approval', '00000000-0000-4000-8000-000000000000'))
        .rejects.toBeInstanceOf(SessionError);
    } finally {
      await db.end();
    }
  });
});
