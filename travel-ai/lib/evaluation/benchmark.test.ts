import { describe, expect, it } from 'vitest';
import { benchmarkRetrieval } from './benchmark';

describe('retrieval benchmark', () => {
  it('runs variants over the same fixed queries and records latency', async () => {
    const service = { search: async () => [{ id: 'x' }] } as any;
    const rows = await benchmarkRetrieval(service, ['a', 'b'], [{ name: 'baseline' }, { name: 'hybrid', options: { alpha: .8 } }]);
    expect(rows.map((r) => r.name)).toEqual(['baseline', 'hybrid']);
    expect(rows[0].queries).toBe(2);
    expect(rows[1].resultCount).toBe(2);
  });
});
