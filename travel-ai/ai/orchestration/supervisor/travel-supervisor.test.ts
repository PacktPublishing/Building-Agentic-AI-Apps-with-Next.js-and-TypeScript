import { describe, expect, it } from 'vitest';
import { AIMessage, HumanMessage, ToolMessage, type BaseMessage } from '@langchain/core/messages';
import { createTravelSupervisor } from './travel-supervisor';

function report(kind: 'flight' | 'hotel', summary: string) {
  return new ToolMessage({ content: JSON.stringify({ type: `${kind}_report`, summary, totalOptions: 1 }), name: `report_${kind}_results`, tool_call_id: 'report-1' });
}

describe('Supervisor conversation turns', () => {
  it('delegates after a direct response on the same thread using the current request', async () => {
    let decisions = 0;
    let workerCalls = 0;
    const synthesisInputs: string[] = [];
    const model = { invoke: async (messages: BaseMessage[]) => {
      const prompt = String(messages[1].content);
      if (String(messages[0].content).includes('Travel Supervisor')) {
        decisions++;
        return new AIMessage(JSON.stringify(decisions === 1
          ? { reasoning: 'General answer', agents: [], directResponse: 'first answer' }
          : { reasoning: 'Need flights', agents: ['FlightAgent'], taskForEachAgent: { FlightAgent: 'Find flights' } }));
      }
      synthesisInputs.push(prompt);
      return new AIMessage('second answer');
    } };
    const flight = { agent: { invoke: async () => {
      workerCalls++;
      return { messages: [report('flight', 'flight report for second request')] };
    } } };
    const { graph } = await createTravelSupervisor({ model, agents: { FlightAgent: flight } });
    const configuration = { configurable: { thread_id: 'test-two-turns' } };
    await graph.invoke({ messages: [new HumanMessage('first request')] }, configuration);
    const second = await graph.invoke({ messages: [new HumanMessage('second request')] }, configuration);
    expect(workerCalls).toBe(1);
    expect(second.finalResponse).toBe('second answer');
    expect(synthesisInputs[0]).toContain("User's original request: second request");
    expect(synthesisInputs[0]).not.toContain('first request');
  });
});

describe('Supervisor report isolation', () => {
  it('uses only selected reports after two delegated turns', async () => {
    let decisions = 0;
    const synthesisInputs: string[] = [];
    const model = { invoke: async (messages: BaseMessage[]) => {
      if (String(messages[0].content).includes('Travel Supervisor')) {
        decisions++;
        const agent = decisions === 1 ? 'FlightAgent' : 'HotelAgent';
        return new AIMessage(JSON.stringify({
          reasoning: 'Ask specialist', agents: [agent], taskForEachAgent: { [agent]: `Task ${decisions}` },
        }));
      }
      synthesisInputs.push(String(messages[1].content));
      return new AIMessage(`answer ${synthesisInputs.length}`);
    } };
    const agents = {
      FlightAgent: { agent: { invoke: async () => ({ messages: [report('flight', 'old flight report')] }) } },
      HotelAgent: { agent: { invoke: async () => ({ messages: [report('hotel', 'new hotel report')] }) } },
    };
    const { graph } = await createTravelSupervisor({ model, agents });
    const configuration = { configurable: { thread_id: 'test-delegation-turns' } };
    await graph.invoke({ messages: [new HumanMessage('first request')] }, configuration);
    const second = await graph.invoke({ messages: [new HumanMessage('second request')] }, configuration);
    expect(second.finalResponse).toBe('answer 2');
    expect(synthesisInputs).toHaveLength(2);
    expect(synthesisInputs[1]).toContain('new hotel report');
    expect(synthesisInputs[1]).not.toContain('old flight report');
    expect(synthesisInputs[1]).toContain("User's original request: second request");
  });

  it('synthesizes one valid report when another selected worker fails', async () => {
    let synthesisCalls = 0;
    let synthesisPrompt = '';
    const model = { invoke: async (messages: BaseMessage[]) => {
      if (String(messages[0].content).includes('Travel Supervisor')) {
        return new AIMessage(JSON.stringify({ reasoning: 'Need both', agents: ['FlightAgent', 'HotelAgent'], taskForEachAgent: { FlightAgent: 'Find flights', HotelAgent: 'Find hotels' } }));
      }
      synthesisCalls++;
      synthesisPrompt = String(messages[1].content);
      return new AIMessage('Partial answer');
    } };
    const agents = {
      FlightAgent: { agent: { invoke: async () => ({ messages: [report('flight', 'Valid flight')] }) } },
      HotelAgent: { agent: { invoke: async () => { throw new Error('private provider error'); } } },
    };
    const { graph } = await createTravelSupervisor({ model, agents });
    const result = await graph.invoke({ messages: [new HumanMessage('Trip') ] }, { configurable: { thread_id: 'partial' } });
    expect(result.finalResponse).toBe('Partial answer');
    expect(synthesisCalls).toBe(1);
    expect(synthesisPrompt).toContain('Valid flight');
    expect(synthesisPrompt).toContain('Unavailable specialists: HotelAgent');
    expect(synthesisPrompt).not.toContain('private provider error');
  });
});
