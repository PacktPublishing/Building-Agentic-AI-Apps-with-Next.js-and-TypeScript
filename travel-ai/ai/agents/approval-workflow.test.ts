import { describe, expect, it } from 'vitest';
import { MemorySaver } from '@langchain/langgraph';
import { FakeToolCallingModel, tool } from 'langchain';
import { z } from 'zod';
import { createApprovalGraph, resumeApprovalRun, startApprovalRun } from './approval-workflow';

describe('approval-gated side effects', () => {
  it('interrupts before execution, rejects without execution and approves only once', async () => {
    let sideEffects = 0;
    const action = tool(async () => { sideEffects++; return 'recorded'; }, {
      name: 'synthetic_write', description: 'Synthetic test action', schema: z.object({}),
    });
    const model = new FakeToolCallingModel({ toolCalls: [[{ name: 'synthetic_write', args: {}, id: 'call-1' }], []] });
    const graph = createApprovalGraph({ model, tools: [action], checkpointer: new MemorySaver(),
      sideEffectToolNames: new Set(['synthetic_write']) });

    const rejected = await startApprovalRun(graph, 'approval-reject', 'Please record this');
    expect(sideEffects).toBe(0);
    expect((rejected.pending?.value as { actionRequests: Array<{ name: string }> }).actionRequests[0].name).toBe('synthetic_write');
    await resumeApprovalRun(graph, 'approval-reject', rejected.pending!.id, 'reject');
    expect(sideEffects).toBe(0);

    const approved = await startApprovalRun(graph, 'approval-approve', 'Please record this');
    expect(sideEffects).toBe(0);
    await expect(resumeApprovalRun(graph, 'approval-approve', 'stale-decision', 'approve'))
      .rejects.toThrow('stale or already used');
    expect(sideEffects).toBe(0);
    await resumeApprovalRun(graph, 'approval-approve', approved.pending!.id, 'approve');
    expect(sideEffects).toBe(1);
    await expect(resumeApprovalRun(graph, 'approval-approve', approved.pending!.id, 'approve'))
      .rejects.toThrow('stale or already used');
    expect(sideEffects).toBe(1);
  });

  it('refuses an undeclared tool or a policy for a missing tool', () => {
    const action = tool(async () => 'ok', { name: 'synthetic_write', description: 'Synthetic test action', schema: z.object({}) });
    const model = new FakeToolCallingModel();
    expect(() => createApprovalGraph({ model, tools: [action], checkpointer: new MemorySaver(), sideEffectToolNames: new Set() }))
      .toThrow('unreviewed tool');
    expect(() => createApprovalGraph({ model, tools: [], checkpointer: new MemorySaver(), sideEffectToolNames: new Set(['synthetic_write']) }))
      .toThrow('unavailable tool');
  });
});
