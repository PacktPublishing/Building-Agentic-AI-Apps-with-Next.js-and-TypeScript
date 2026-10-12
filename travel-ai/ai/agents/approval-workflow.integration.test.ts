import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { PostgresSaver } from '@langchain/langgraph-checkpoint-postgres';
import { FakeToolCallingModel, tool } from 'langchain';
import { z } from 'zod';
import { createApprovalGraph, resumeApprovalRun, startApprovalRun } from './approval-workflow';

const databaseUrl = process.env.TEST_POSTGRES_URL;

describe.skipIf(!databaseUrl)('durable pre-tool approval (isolated Postgres)', () => {
  it('resumes once after a new graph instance, never for another owner or a replay', async () => {
    let sideEffects = 0;
    const action = tool(async () => { sideEffects++; return 'recorded'; }, {
      name: 'synthetic_write', description: 'Synthetic test action', schema: z.object({}),
    });
    const ownThread = `approval:owner-a:${randomUUID()}`;
    const foreignThread = `approval:owner-b:${randomUUID()}`;
    const firstSaver = PostgresSaver.fromConnString(databaseUrl!);
    const secondSaver = PostgresSaver.fromConnString(databaseUrl!);
    try {
      await firstSaver.setup();
      const first = createApprovalGraph({
        model: new FakeToolCallingModel({ toolCalls: [[{ name: 'synthetic_write', args: {}, id: 'call-1' }], []] }),
        tools: [action], checkpointer: firstSaver, sideEffectToolNames: new Set(['synthetic_write']),
      });
      const started = await startApprovalRun(first, ownThread, 'Record this');
      expect(sideEffects).toBe(0);
      const pendingId = started.pending?.id;
      expect(pendingId).toBeTruthy();
      await firstSaver.end();

      const restarted = createApprovalGraph({
        model: new FakeToolCallingModel({ toolCalls: [[]] }),
        tools: [action], checkpointer: secondSaver, sideEffectToolNames: new Set(['synthetic_write']),
      });
      await expect(resumeApprovalRun(restarted, foreignThread, pendingId!, 'approve'))
        .rejects.toThrow('stale or already used');
      expect(sideEffects).toBe(0);
      await resumeApprovalRun(restarted, ownThread, pendingId!, 'approve');
      expect(sideEffects).toBe(1);
      await expect(resumeApprovalRun(restarted, ownThread, pendingId!, 'approve'))
        .rejects.toThrow('stale or already used');
      expect(sideEffects).toBe(1);
    } finally {
      await Promise.allSettled([firstSaver.end(), secondSaver.end()]);
    }
  });
});
