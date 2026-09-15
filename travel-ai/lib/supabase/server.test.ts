import { describe, expect, it } from 'vitest';
import { getVerifiedUserId } from './server';

describe('server auth boundary', () => {
  it('fails closed when a bearer token is absent', async () => {
    expect(await getVerifiedUserId(new Request('http://localhost'))).toBeNull();
  });
});
