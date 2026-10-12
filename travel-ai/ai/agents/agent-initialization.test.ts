import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ getAllTools: vi.fn(), createAgent: vi.fn() }));
vi.mock('../tools', () => ({ getAllTools: mocks.getAllTools, closeMcpClient: vi.fn() }));
vi.mock('langchain', () => ({ createAgent: mocks.createAgent, createMiddleware: (definition: unknown) => definition }));
vi.mock('@langchain/anthropic', () => ({ ChatAnthropic: class { invoke() {} } }));

import { TravelAssistantAgent } from './agent';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { ContextManager } from '../context/context-manager';

function freshAgent() {
  (TravelAssistantAgent as any).instance = undefined;
  return TravelAssistantAgent.getInstance();
}

describe('TravelAssistantAgent initialization', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('shares one in-flight discovery and graph construction among first callers', async () => {
    let complete!: (tools: unknown[]) => void;
    mocks.getAllTools.mockReturnValue(new Promise((resolve) => { complete = resolve; }));
    const graph = { id: 'same-graph' };
    mocks.createAgent.mockReturnValue(graph);
    const agent = freshAgent();
    const first = agent.initialize();
    const second = agent.initialize();
    expect(mocks.getAllTools).toHaveBeenCalledTimes(1);
    complete([{ name: 'search_flights' }]);
    await Promise.all([first, second]);
    expect(mocks.createAgent).toHaveBeenCalledTimes(1);
    expect(agent.getTools()).toHaveLength(1);
    await agent.initialize();
    expect(mocks.getAllTools).toHaveBeenCalledTimes(1);
  });

  it('clears a failed attempt without publishing partial state, then retries', async () => {
    mocks.getAllTools.mockRejectedValueOnce(new Error('Discovery failed')).mockResolvedValueOnce([{ name: 'search_hotels' }]);
    mocks.createAgent.mockReturnValue({ id: 'new-graph' });
    const agent = freshAgent();
    await expect(agent.initialize()).rejects.toThrow('Discovery failed');
    expect(agent.getTools()).toEqual([]);
    await agent.initialize();
    expect(mocks.getAllTools).toHaveBeenCalledTimes(2);
    expect(mocks.createAgent).toHaveBeenCalledTimes(1);
    expect(agent.getTools()).toHaveLength(1);
  });

  it('passes the compacted context to the actual model handler without changing graph state', async () => {
    mocks.getAllTools.mockResolvedValue([]);
    mocks.createAgent.mockReturnValue({});
    const agent = freshAgent();
    await agent.initialize();
    const input = [new HumanMessage('old'), new HumanMessage('latest')];
    const compact = [new SystemMessage('Validated summary'), input[1]];
    const compactSpy = vi.spyOn(ContextManager.prototype, 'prepareModelInput').mockResolvedValue(compact);
    const middleware = mocks.createAgent.mock.calls[0][0].middleware[0];
    const handler = vi.fn().mockResolvedValue({ content: 'answer' });
    await middleware.wrapModelCall({ messages: input, runtime: { configurable: { thread_id: 'owned-thread' } } }, handler);
    expect(handler.mock.calls[0][0].messages).toBe(compact);
    expect(input[0].content).toBe('old');
    compactSpy.mockRestore();
  });

  it('fails closed for the unsupported approval API before invoking any tool', async () => {
    const invoke = vi.fn();
    const stream = vi.fn();
    mocks.getAllTools.mockResolvedValue([{ name: 'future_booking_action' }]);
    mocks.createAgent.mockReturnValue({ invoke, stream });
    const agent = freshAgent();
    await expect(agent.initialize()).rejects.toThrow('An unreviewed tool cannot run');
    await expect(agent.invokeWithApproval('book now', 'thread')).rejects.toThrow('Approval workflow is unavailable');
    await expect(agent.approveAndContinue('thread')).rejects.toThrow('Approval workflow is unavailable');
    expect(invoke).not.toHaveBeenCalled();
    expect(stream).not.toHaveBeenCalled();
  });
});
