import { describe, expect, it } from 'vitest';
import { TripIndexWorker, type IndexJob, type IndexJobStore } from './trip-index-worker';

class FakeStore implements IndexJobStore {
  jobs: IndexJob[] = [{ id: 'j1', tripId: 't1', operation: 'upsert', attempts: 0, version: 1, availableAt: new Date(0) }];
  isCurrent?: (tripId: string, version: number) => Promise<boolean>;
  async claim(): Promise<IndexJob[]> { return this.jobs.splice(0); }
  async complete(): Promise<void> {}
  async fail(id: string, error: string, nextAttemptAt: Date): Promise<void> { this.jobs.push({ id, tripId: 't1', operation: 'upsert', attempts: 1, version: 1, availableAt: nextAttemptAt }); }
}

describe('TripIndexWorker', () => {
  it('keeps failed jobs durable for a later restart', async () => {
    const store = new FakeStore();
    const worker = new TripIndexWorker(store, { upsert: async () => { throw new Error('timeout'); }, delete: async () => {} });
    expect(await worker.processOnce()).toEqual({ processed: 0, failed: 1 });
    expect(store.jobs).toHaveLength(1);
  });

  it('skips a stale job when a newer version exists', async () => {
    const store = new FakeStore();
    store.isCurrent = async () => false;
    let called = false;
    const worker = new TripIndexWorker(store, { upsert: async () => { called = true; }, delete: async () => {} });
    expect(await worker.processOnce()).toEqual({ processed: 0, failed: 0 });
    expect(called).toBe(false);
  });
});
