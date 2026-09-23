import { describe, expect, it, vi } from 'vitest';
import { AIMessage, HumanMessage, ToolMessage } from '@langchain/core/messages';
import { ContextManager } from './context-manager';

describe('bounded model input', () => {
  it('replaces old messages with a validated summary while retaining recent tool pairs', async () => {
    const llm = { invoke: vi.fn().mockResolvedValueOnce({ content: 'The user wants a trip to Paris with a modest budget.' })
      .mockResolvedValueOnce({ content: JSON.stringify({ preferences: { budget: 'modest', destinations: ['Paris'] } }) }) };
    const manager = new ContextManager(llm as any, { maxHistoryMessages: 3 });
    const messages = [
      new HumanMessage('old confidential text'), new AIMessage('old answer'),
      new HumanMessage('recent request'),
      new AIMessage({ content: '', tool_calls: [{ id: 'call-1', name: 'search_flights', args: {} }] }),
      new ToolMessage({ content: 'flight result', tool_call_id: 'call-1', name: 'search_flights' }),
      new AIMessage('recent response'),
    ];
    const modelInput = await manager.prepareModelInput(messages, 'thread-1');
    expect(modelInput[0].content).toContain('The user wants a trip to Paris');
    expect(modelInput.map((message) => String(message.content)).join(' ')).not.toContain('old confidential text');
    expect(modelInput.some((message) => message._getType() === 'tool')).toBe(true);
    expect(modelInput.some((message) => message._getType() === 'ai' && (message as AIMessage).tool_calls?.[0]?.id === 'call-1')).toBe(true);
    expect(messages[0].content).toBe('old confidential text');
    await manager.prepareModelInput(messages, 'thread-1');
    expect(llm.invoke).toHaveBeenCalledTimes(2);
  });

  it('leaves short history untouched and falls back safely on bad summary', async () => {
    const llm = { invoke: vi.fn().mockResolvedValue({ content: 'bad' }) };
    const manager = new ContextManager(llm as any, { maxHistoryMessages: 2 });
    const short = [new HumanMessage('hello')];
    expect(await manager.prepareModelInput(short, 'short')).toBe(short);
    const long = [new HumanMessage('old'), new AIMessage('reply'), new HumanMessage('new')];
    expect(await manager.prepareModelInput(long, 'long')).toBe(long);
  });
});
