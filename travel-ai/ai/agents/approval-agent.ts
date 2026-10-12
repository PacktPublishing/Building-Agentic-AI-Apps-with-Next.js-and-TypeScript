import { ChatAnthropic } from '@langchain/anthropic';
import { config } from '../../config';
import { getOrchestrationCheckpointer } from '../../lib/orchestration/checkpointer';
import { getAllTools } from '../tools';
import { TRAVEL_ASSISTANT_PROMPT } from '../prompts/system-prompt';
import { createApprovalGraph } from './approval-workflow';
import { assertReadOnlyTools } from './tool-safety';

let graphPromise: Promise<ReturnType<typeof createApprovalGraph>> | undefined;

/** The public approval API uses a separate durable graph, never the legacy memory-backed chat routes. */
export function getApprovalAgent() {
  if (!graphPromise) graphPromise = (async () => {
    const tools = await getAllTools();
    // No booking action exists in the companion. An effectful tool must be explicitly reviewed,
    // given a business idempotency key, and registered in the approval policy before deployment.
    assertReadOnlyTools(tools);
    return createApprovalGraph({
      model: new ChatAnthropic({ apiKey: config.anthropic_api_key, model: config.model_name, temperature: 0.5 }),
      tools,
      checkpointer: await getOrchestrationCheckpointer(),
      sideEffectToolNames: new Set(),
      systemPrompt: TRAVEL_ASSISTANT_PROMPT,
    });
  })().catch((error) => { graphPromise = undefined; throw error; });
  return graphPromise;
}
