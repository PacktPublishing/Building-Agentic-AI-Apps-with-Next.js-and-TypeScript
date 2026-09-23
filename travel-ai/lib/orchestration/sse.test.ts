import { describe, expect, it } from 'vitest';
import { SseDecoder } from './sse';

const bytes = (value: string) => new TextEncoder().encode(value);

describe('typed orchestration SSE', () => {
  it('assembles events split across transport chunks', () => {
    const decoder = new SseDecoder();
    expect(decoder.push(bytes('event: prog'))).toEqual([]);
    expect(decoder.push(bytes('ress\ndata: {"node":"FlightAgent"}\n\nevent: final\nda'))).toEqual([
      { event: 'progress', data: { node: 'FlightAgent' } },
    ]);
    expect(decoder.push(bytes('ta: {"response":"Ready"}\n\nevent: done\ndata: {}\n\n'))).toEqual([
      { event: 'final', data: { response: 'Ready' } }, { event: 'done', data: {} },
    ]);
  });
  it('surfaces a midstream error as its own event', () => {
    const decoder = new SseDecoder();
    expect(decoder.push(bytes('event: progress\ndata: {"node":"FlightAgent"}\n\nevent: error\ndata: {"error":"Conversation failed"}\n\n'))[1]).toEqual({
      event: 'error', data: { error: 'Conversation failed' },
    });
  });
});
