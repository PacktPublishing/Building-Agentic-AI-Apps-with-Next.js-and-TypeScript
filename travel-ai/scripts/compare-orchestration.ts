/** Live, paid-provider benchmark. Run only with RUN_LIVE_ORCHESTRATION_BENCHMARK=1. */
import { randomUUID } from 'node:crypto';
import { BaseCallbackHandler } from '@langchain/core/callbacks/base';
import type { LLMResult } from '@langchain/core/outputs';
import { invokeSupervisor } from '../ai/orchestration/supervisor';
import { invokeSwarm } from '../ai/orchestration/swarm';
import { getMcpTools, closeMcpClient } from '../ai/tools/mcp-client';
import { config } from '../config';
import { evaluateRun, type BenchmarkFixture, type BenchmarkPattern } from './orchestration-benchmark-contract';

const fixtures: BenchmarkFixture[] = [
  { id: 'flights', first: 'Find flights from Paris to London', followUp: 'Compare the best flight options for Paris to London', requiredTerms: ['flight'], expectedSupervisorAgents: ['FlightAgent'], expectedSwarmAgent: 'ResearchAgent' },
  { id: 'hotel', first: 'Find a hotel in Barcelona near the beach', followUp: 'Compare those Barcelona hotels', requiredTerms: ['hotel'], expectedSupervisorAgents: ['HotelAgent'], expectedSwarmAgent: 'ResearchAgent' },
  { id: 'trip', first: 'Find flights from Paris to Rome and hotels in Rome', followUp: 'Compare flights and hotels for that Rome trip', requiredTerms: ['flight', 'hotel'], expectedSupervisorAgents: ['FlightAgent', 'HotelAgent'], expectedSwarmAgent: 'ResearchAgent' },
];

class TokenCollector extends BaseCallbackHandler {
  name = 'orchestration-benchmark-token-collector';
  inputTokens = 0;
  outputTokens = 0;
  modelCalls = 0;
  missingUsage = 0;

  handleLLMEnd(output: LLMResult) {
    this.modelCalls++;
    const tokenUsage = output.llmOutput?.tokenUsage as { promptTokens?: number; completionTokens?: number } | undefined;
    const message = output.generations?.[0]?.[0] as { message?: { usage_metadata?: { input_tokens?: number; output_tokens?: number } } } | undefined;
    const input = tokenUsage?.promptTokens ?? message?.message?.usage_metadata?.input_tokens;
    const produced = tokenUsage?.completionTokens ?? message?.message?.usage_metadata?.output_tokens;
    if (typeof input === 'number' && typeof produced === 'number') {
      this.inputTokens += input;
      this.outputTokens += produced;
    } else this.missingUsage++;
  }
}

type Row = {
  fixture: string; repetition: number; phase: 'first-turn' | 'stable-thread'; pattern: BenchmarkPattern;
  durationMs: number; answerValid: boolean; termsPresent: boolean; routeValid: boolean; success: boolean;
  modelCalls: number; inputTokens: number | null; outputTokens: number | null; failure?: string;
};

async function run(pattern: BenchmarkPattern, fixture: BenchmarkFixture, repetition: number, phase: Row['phase'], threadId: string): Promise<Row> {
  const collector = new TokenCollector();
  const started = performance.now();
  const message = phase === 'first-turn' ? fixture.first : fixture.followUp;
  try {
    const result = pattern === 'Supervisor'
      ? await invokeSupervisor(message, threadId, AbortSignal.timeout(55_000), [collector])
      : await invokeSwarm(message, threadId, AbortSignal.timeout(55_000), [collector]);
    const verdict = evaluateRun(pattern, fixture, result);
    return { fixture: fixture.id, repetition, phase, pattern, durationMs: Math.round(performance.now() - started), ...verdict,
      modelCalls: collector.modelCalls, inputTokens: collector.missingUsage || !collector.modelCalls ? null : collector.inputTokens,
      outputTokens: collector.missingUsage || !collector.modelCalls ? null : collector.outputTokens };
  } catch (error) {
    return { fixture: fixture.id, repetition, phase, pattern, durationMs: Math.round(performance.now() - started),
      answerValid: false, termsPresent: false, routeValid: false, success: false,
      modelCalls: collector.modelCalls, inputTokens: null, outputTokens: null,
      failure: error instanceof Error ? error.constructor.name : 'UnknownError' };
  }
}

async function main() {
  if (process.env.RUN_LIVE_ORCHESTRATION_BENCHMARK !== '1') {
    throw new Error('Set RUN_LIVE_ORCHESTRATION_BENCHMARK=1 to authorize paid live provider calls');
  }
  if (!config.have_anthropic_api_key || !config.amadeus_url || !config.amadeus_bearer_token || !process.env.POSTGRES_URL_NON_POOLING) {
    throw new Error('Anthropic, MCP and checkpoint configuration are required');
  }
  const repetitions = Number(process.env.BENCHMARK_REPETITIONS || '3');
  if (!Number.isInteger(repetitions) || repetitions < 2 || repetitions > 10) throw new Error('BENCHMARK_REPETITIONS must be 2–10');
  const tools = (await getMcpTools()).map((tool) => tool.name).sort();
  console.log(JSON.stringify({ provider: 'Anthropic', model: config.model_name, mcpUrl: new URL(config.amadeus_url).origin,
    mcpTools: tools, specialistReportTools: ['report_flight_results', 'report_hotel_results', 'report_activity_results'],
    repetitions, timeoutMs: 55_000, fixtures: fixtures.map((fixture) => fixture.id) }, null, 2));
  const rows: Row[] = [];
  for (const fixture of fixtures) for (let repetition = 0; repetition < repetitions; repetition++) {
    const order: BenchmarkPattern[] = repetition % 2 === 0 ? ['Supervisor', 'Swarm'] : ['Swarm', 'Supervisor'];
    const threads = { Supervisor: `benchmark-supervisor-${randomUUID()}`, Swarm: `benchmark-swarm-${randomUUID()}` };
    for (const phase of ['first-turn', 'stable-thread'] as const) {
      for (const pattern of order) rows.push(await run(pattern, fixture, repetition + 1, phase, threads[pattern]));
    }
  }
  console.table(rows);
  console.log('Interpretation: first-turn means a new conversation, stable-thread reuses it; neither is a process-cold measurement.');
  console.log('Quality is fixture-term and routing checks, not a human evaluation. Latency is wall-clock for these live calls only.');
  console.log('Token totals include observed nested model callbacks; null means at least one model call lacked usage. No cost estimate is made.');
  if (rows.some((row) => !row.success)) process.exitCode = 1;
}

main().catch((error) => { console.error(error instanceof Error ? error.message : 'Benchmark failed'); process.exitCode = 1; })
  .finally(() => closeMcpClient().catch(() => {}));
