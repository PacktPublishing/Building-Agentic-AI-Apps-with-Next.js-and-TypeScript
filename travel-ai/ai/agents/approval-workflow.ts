import { Command } from '@langchain/langgraph';
import { createAgent, humanInTheLoopMiddleware } from 'langchain';
import type { BaseCheckpointSaver } from '@langchain/langgraph-checkpoint';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { StructuredTool } from '@langchain/core/tools';
import { isReadOnlyToolName } from './tool-safety';

type ApprovalDecision = 'approve' | 'reject';

export class ApprovalError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

/** Side-effecting tools must be explicitly declared and implement business-level idempotency. */
export function createApprovalGraph(input: {
  model: BaseChatModel;
  tools: StructuredTool[];
  checkpointer: BaseCheckpointSaver;
  sideEffectToolNames: ReadonlySet<string>;
  systemPrompt?: string;
}) {
  const interruptOn: Record<string, false | { allowedDecisions: ApprovalDecision[] }> = {};
  for (const tool of input.tools) {
    if (input.sideEffectToolNames.has(tool.name)) {
      interruptOn[tool.name] = { allowedDecisions: ['approve', 'reject'] };
    } else if (isReadOnlyToolName(tool.name)) {
      interruptOn[tool.name] = false;
    } else {
      throw new Error('An unreviewed tool cannot run without an approval workflow');
    }
  }
  for (const name of input.sideEffectToolNames) {
    if (!input.tools.some((tool) => tool.name === name)) throw new Error('Approval policy references an unavailable tool');
  }
  return createAgent({ model: input.model, tools: input.tools, checkpointer: input.checkpointer, systemPrompt: input.systemPrompt,
    middleware: [humanInTheLoopMiddleware({ interruptOn })] });
}

export async function startApprovalRun(graph: ReturnType<typeof createApprovalGraph>, threadId: string, message: string) {
  const config = { configurable: { thread_id: threadId } };
  const state = await graph.getState(config) as unknown as { tasks: Array<{ interrupts?: Array<{ id: string }> }> };
  if (state.tasks.some((task) => task.interrupts?.length)) {
    throw new ApprovalError(409, 'Resolve the pending approval before starting another message');
  }
  const result = await graph.invoke({ messages: [{ role: 'user', content: message }] }, config);
  const pending = result.__interrupt__?.[0];
  return { result, pending };
}

export async function resumeApprovalRun(
  graph: ReturnType<typeof createApprovalGraph>, threadId: string, interruptId: string, decision: ApprovalDecision,
) {
  const config = { configurable: { thread_id: threadId } };
  const state = await graph.getState(config) as unknown as { tasks: Array<{ interrupts?: Array<{ id: string }> }> };
  const pending = state.tasks.flatMap((task) => task.interrupts ?? []);
  if (pending.length !== 1 || pending[0].id !== interruptId) throw new ApprovalError(409, 'Approval decision is stale or already used');
  return graph.invoke(new Command({ resume: { decisions: [{ type: decision }] } }), config);
}
