import { describe, expect, it } from 'vitest';
import { TripIndexWorker, type IndexJob, type IndexJobStore } from './trip-index-worker';

class FakeStore implements IndexJobStore {
  jobs: IndexJob[] = [{ id: 'j1', tripId: 't1', operation: 'upsert', attempts: 0, availableAt: new Date(0) }];
  async claim(): Promise<IndexJob[]> { return this.jobs.splice(0); }
  async complete(): Promise<void> {}
  async fail(id: string, error: string, nextAttemptAt: Date): Promise<void> { this.jobs.push({ id, tripId: 't1', operation: 'upsert', attempts: 1, availableAt: nextAttemptAt }); }
}

describe('TripIndexWorker', () => {
  it('keeps failed jobs durable for a later restart', async () => {
    const store = new FakeStore();
    const worker = new TripIndexWorker(store, { upsert: async () => { throw new Error('timeout'); }, delete: async () => {} });
    expect(await worker.processOnce()).toEqual({ processed: 0, failed: 1 });
    expect(store.jobs).toHaveLength(1);
  });
});
