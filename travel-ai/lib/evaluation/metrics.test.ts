import { describe, expect, it } from 'vitest';
import { meanReciprocalRank, calculateRetrievalMetrics } from './metrics';

describe('retrieval metric cutoffs', () => {
  const results = [{ id: 'noise', score: 1 }, { id: 'relevant', score: .9 }];
  it('does not count a first relevant result after K', () => {
    expect(meanReciprocalRank(results, new Set(['relevant']), 1)).toBe(0);
  });
  it('uses the same K for all metrics', () => {
    const metrics = calculateRetrievalMetrics(results, new Set(['relevant']), 1);
    expect(metrics.mrr).toBe(0);
    expect(metrics.hitRate).toBe(0);
  });
});
