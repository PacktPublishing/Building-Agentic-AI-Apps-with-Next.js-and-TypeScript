/** Paid-provider comparison of actual model usage, including summary and metadata calls. */
import { randomUUID } from 'node:crypto';
import { BaseCallbackHandler } from '@langchain/core/callbacks/base';
import type { LLMResult } from '@langchain/core/outputs';
import { ChatAnthropic } from '@langchain/anthropic';
import { MemorySaver } from '@langchain/langgraph';
import { createAgent, createMiddleware } from 'langchain';
import { ContextManager } from '../ai/context/context-manager';
import { getAllTools, closeMcpClient } from '../ai/tools';
import { TRAVEL_ASSISTANT_PROMPT } from '../ai/prompts/system-prompt';
import { config } from '../config';

const conversation = [
  'I want to plan a trip to Barcelona with my spouse.',
  'Our budget is 500 euros each for flights.',
  'I prefer a hotel near the city center.',
  'We like cultural visits.',
  'Could you compare flight options from Paris?',
  'Are those flights within our budget?',
  'Summarize my travel preferences.',
  'What would you recommend next?',
];

class Usage extends BaseCallbackHandler {
  name = 'context-comparison-usage';
  calls = 0;
  missing = 0;
  input = 0;
  output = 0;
  handleLLMEnd(result: LLMResult) {
    this.calls++;
    const usage = result.llmOutput?.tokenUsage as { promptTokens?: number; completionTokens?: number } | undefined;
    const message = result.generations?.[0]?.[0] as { message?: { usage_metadata?: { input_tokens?: number; output_tokens?: number } } } | undefined;
    const input = usage?.promptTokens ?? message?.message?.usage_metadata?.input_tokens;
    const output = usage?.completionTokens ?? message?.message?.usage_metadata?.output_tokens;
    if (typeof input === 'number' && typeof output === 'number') { this.input += input; this.output += output; }
    else this.missing++;
  }
}

async function run(optimized: boolean, tools: Awaited<ReturnType<typeof getAllTools>>) {
  const usage = new Usage();
  const model = new ChatAnthropic({ apiKey: config.anthropic_api_key, model: config.model_name, temperature: 0.5, callbacks: [usage] });
  const manager = new ContextManager(model, { maxHistoryMessages: 10, summaryTriggerThreshold: 6, enableSummarization: true, enableMetadataExtraction: true });
  const middleware = optimized ? [createMiddleware({
    name: 'BoundedTravelContext',
    wrapModelCall: async (request, handler) => handler({ ...request, messages: await manager.prepareModelInput(request.messages, request.runtime.configurable?.thread_id || '') }),
  })] : [];
  const graph = createAgent({ model, tools, checkpointer: new MemorySaver(), systemPrompt: TRAVEL_ASSISTANT_PROMPT, middleware });
  const threadId = `context-compare-${randomUUID()}`;
  const started = performance.now();
  let answer = '';
  for (const message of conversation) {
    const result = await graph.invoke({ messages: [{ role: 'user', content: message }] }, { configurable: { thread_id: threadId }, recursionLimit: 12, signal: AbortSignal.timeout(55_000) });
    const last = [...result.messages].reverse().find((item: any) => item._getType?.() === 'ai');
    answer = typeof last?.content === 'string' ? last.content : '';
  }
  return { mode: optimized ? 'bounded' : 'full', durationMs: Math.round(performance.now() - started), modelCalls: usage.calls,
    inputTokens: usage.missing || !usage.calls ? null : usage.input, outputTokens: usage.missing || !usage.calls ? null : usage.output,
    qualityCheck: answer.toLowerCase().includes('travel') || answer.toLowerCase().includes('trip'), answerPreview: answer.slice(0, 160),
    summaryCreated: !!manager.getSummary(threadId), metadataCreated: !!manager.getMetadata(threadId) };
}

async function main() {
  if (process.env.RUN_LIVE_CONTEXT_COMPARISON !== '1') throw new Error('Set RUN_LIVE_CONTEXT_COMPARISON=1 to authorize paid provider calls');
  if (!config.have_anthropic_api_key || !config.amadeus_url || !config.amadeus_bearer_token) throw new Error('Anthropic and MCP configuration required');
  const tools = await getAllTools();
  console.log(JSON.stringify({ provider: 'Anthropic', model: config.model_name, tools: tools.map((tool) => tool.name).sort(), turns: conversation.length,
    summaryPolicy: '10 recent messages plus validated summary and metadata', ordering: 'baseline then bounded' }));
  const results = [await run(false, tools), await run(true, tools)];
  console.table(results);
  console.log('Token totals include all model calls observed for each mode, including summary and metadata generation. Null means usage was unavailable.');
  console.log('Quality check is a simple fixture term check, not human evaluation; latency and token usage are live-sample observations, not fixed savings or price claims.');
  if (results.some((result) => !result.qualityCheck)) process.exitCode = 1;
}

main().catch((error) => { console.error(error instanceof Error ? error.message : 'Comparison failed'); process.exitCode = 1; })
  .finally(() => closeMcpClient().catch(() => {}));
