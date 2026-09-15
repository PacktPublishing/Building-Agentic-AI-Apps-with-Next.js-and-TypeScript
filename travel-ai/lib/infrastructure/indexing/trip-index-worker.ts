export type IndexOperation = 'upsert' | 'delete';

export interface IndexJob {
  id: string;
  tripId: string;
  operation: IndexOperation;
  attempts: number;
  availableAt: Date;
}

/** Persistence port; implementations should claim jobs atomically. */
export interface IndexJobStore {
  claim(limit: number, now: Date): Promise<IndexJob[]>;
  complete(id: string): Promise<void>;
  fail(id: string, error: string, nextAttemptAt: Date): Promise<void>;
}

export interface TripIndexer {
  upsert(tripId: string): Promise<void>;
  delete(tripId: string): Promise<void>;
}

/**
 * Restart-safe outbox consumer. A job is claimed before processing and only
 * marked complete after Qdrant succeeds; failed jobs remain durable.
 */
export class TripIndexWorker {
  constructor(
    private readonly jobs: IndexJobStore,
    private readonly indexer: TripIndexer,
    private readonly maxAttempts = 5,
  ) {}

  async processOnce(limit = 25): Promise<{ processed: number; failed: number }> {
    const claimed = await this.jobs.claim(limit, new Date());
    let processed = 0;
    let failed = 0;
    for (const job of claimed) {
      try {
        if (job.operation === 'delete') await this.indexer.delete(job.tripId);
        else await this.indexer.upsert(job.tripId);
        await this.jobs.complete(job.id);
        processed++;
      } catch (error) {
        failed++;
        const attempts = job.attempts + 1;
        const delayMs = Math.min(60_000, 250 * 2 ** Math.max(0, attempts - 1));
        await this.jobs.fail(job.id, error instanceof Error ? error.message : 'Indexing failed', new Date(Date.now() + delayMs));
        if (attempts >= this.maxAttempts) break;
      }
    }
    return { processed, failed };
  }
}
