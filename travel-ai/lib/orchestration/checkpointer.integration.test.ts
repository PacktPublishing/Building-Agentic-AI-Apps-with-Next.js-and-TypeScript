import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { PostgresSaver } from '@langchain/langgraph-checkpoint-postgres';
import { AIMessage, HumanMessage, type BaseMessage } from '@langchain/core/messages';
import { createTravelSupervisor } from '../../ai/orchestration/supervisor/travel-supervisor';

const databaseUrl = process.env.TEST_POSTGRES_URL;

describe.skipIf(!databaseUrl)('durable supervisor checkpoint (isolated Postgres)', () => {
  it('continues the same conversation through a fresh saver and graph instance', async () => {
    const threadId = `supervisor:integration:${randomUUID()}`;
    const model = { invoke: async (messages: BaseMessage[]) => {
      const humans = String(messages[1]?.content).match(/human:/g) ?? [];
      return new AIMessage(JSON.stringify({
        reasoning: 'Direct response', agents: [], directResponse: `seen-${humans.length}`,
      }));
    } };
    const firstSaver = PostgresSaver.fromConnString(databaseUrl!);
    const secondSaver = PostgresSaver.fromConnString(databaseUrl!);
    try {
      await firstSaver.setup();
      const first = await createTravelSupervisor({ model, agents: {}, checkpointer: firstSaver });
      await first.graph.invoke({ messages: [new HumanMessage('first')] }, { configurable: { thread_id: threadId } });
      await firstSaver.end();

      // A new saver and graph cannot read the first instance's in-memory state.
      const second = await createTravelSupervisor({ model, agents: {}, checkpointer: secondSaver });
      const state = await second.graph.getState({ configurable: { thread_id: threadId } });
      expect(state.values.messages.some((message: BaseMessage) => message.content === 'first')).toBe(true);
      await second.graph.invoke({ messages: [new HumanMessage('second')] }, { configurable: { thread_id: threadId } });
      const resumed = await second.graph.getState({ configurable: { thread_id: threadId } });
      expect(resumed.values.messages.some((message: BaseMessage) => message.content === 'second')).toBe(true);
    } finally {
      await Promise.allSettled([firstSaver.end(), secondSaver.end()]);
    }
  });
});
