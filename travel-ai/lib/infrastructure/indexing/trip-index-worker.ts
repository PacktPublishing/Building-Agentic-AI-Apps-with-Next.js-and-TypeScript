export type IndexOperation = 'upsert' | 'delete';

export interface IndexJob {
  id: string;
  tripId: string;
  operation: IndexOperation;
  attempts: number;
  version: number;
  availableAt: Date;
}

/** Persistence port; implementations should claim jobs atomically. */
export interface IndexJobStore {
  claim(limit: number, now: Date): Promise<IndexJob[]>;
  isCurrent?(tripId: string, version: number): Promise<boolean>;
  complete(id: string, version?: number): Promise<void>;
  fail(id: string, error: string, nextAttemptAt: Date): Promise<void>;
}

export interface TripIndexer {
  upsert(tripId: string, version: number): Promise<void>;
  delete(tripId: string, version: number): Promise<void>;
}

import { db, tripIndexJobs } from '@/lib/db';
import { and, eq, lte, or, inArray } from 'drizzle-orm';

/** PostgreSQL implementation used by the scheduled worker process. */
export class DrizzleIndexJobStore implements IndexJobStore {
  async isCurrent(tripId: string, version: number): Promise<boolean> {
    const [job] = await db.select({ version: tripIndexJobs.version }).from(tripIndexJobs)
      .where(eq(tripIndexJobs.tripId, tripId)).limit(1);
    return !job || job.version <= version;
  }

  async claim(limit: number, now: Date): Promise<IndexJob[]> {
    return db.transaction(async (tx) => {
      const reclaimBefore = new Date(now.getTime() - 5 * 60_000);
      const rows = await tx.select().from(tripIndexJobs)
        .where(and(
          or(
            and(inArray(tripIndexJobs.status, ['pending', 'failed']), lte(tripIndexJobs.availableAt, now)),
            and(eq(tripIndexJobs.status, 'processing'), lte(tripIndexJobs.updatedAt, reclaimBefore)),
          ),
        ))
        .limit(limit);
      if (rows.length) await tx.update(tripIndexJobs)
        .set({ status: 'processing', claimedAt: now, updatedAt: now })
        .where(inArray(tripIndexJobs.id, rows.map((row) => row.id)));
      return rows.map((row) => ({ id: row.id, tripId: row.tripId, operation: row.operation as IndexOperation, attempts: row.attempts, version: row.version, availableAt: row.availableAt }));
    });
  }

  async complete(id: string, version?: number): Promise<void> {
    await db.update(tripIndexJobs).set({ status: 'complete', updatedAt: new Date() })
      .where(version === undefined ? eq(tripIndexJobs.id, id) : and(eq(tripIndexJobs.id, id), eq(tripIndexJobs.version, version)));
  }

  async fail(id: string, error: string, nextAttemptAt: Date): Promise<void> {
    const [job] = await db.select({ attempts: tripIndexJobs.attempts }).from(tripIndexJobs).where(eq(tripIndexJobs.id, id)).limit(1);
    await db.update(tripIndexJobs).set({ status: 'failed', attempts: (job?.attempts ?? 0) + 1, lastError: error.slice(0, 1000), availableAt: nextAttemptAt, updatedAt: new Date() }).where(eq(tripIndexJobs.id, id));
  }
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
        if (this.jobs.isCurrent && !(await this.jobs.isCurrent(job.tripId, job.version))) {
          await this.jobs.complete(job.id, job.version);
          continue;
        }
        if (job.operation === 'delete') await this.indexer.delete(job.tripId, job.version);
        else await this.indexer.upsert(job.tripId, job.version);
        await this.jobs.complete(job.id, job.version);
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
