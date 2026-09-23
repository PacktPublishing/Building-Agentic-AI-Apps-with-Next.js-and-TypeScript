export type OrchestrationEvent =
  | { event: 'thread'; data: { threadId: string } }
  | { event: 'progress'; data: { node: string; activeAgent?: string } }
  | { event: 'final'; data: { response: string } }
  | { event: 'error'; data: { error: string } }
  | { event: 'done'; data: Record<string, never> };

export class SseDecoder {
  private decoder = new TextDecoder();
  private buffer = '';

  push(chunk: Uint8Array): OrchestrationEvent[] {
    this.buffer += this.decoder.decode(chunk, { stream: true }).replace(/\r\n/g, '\n');
    const frames = this.buffer.split('\n\n');
    this.buffer = frames.pop() || '';
    return frames.map((frame) => {
      const lines = frame.split('\n');
      const kind = lines.find((line) => line.startsWith('event: '))?.slice(7);
      const raw = lines.filter((line) => line.startsWith('data: ')).map((line) => line.slice(6)).join('\n');
      if (!kind || !raw) throw new Error('Invalid stream event');
      const data: unknown = JSON.parse(raw);
      if (!data || typeof data !== 'object') throw new Error('Invalid stream event');
      if (kind === 'thread' && typeof (data as any).threadId === 'string') return { event: kind, data: data as { threadId: string } };
      if (kind === 'progress' && typeof (data as any).node === 'string') return { event: kind, data: data as { node: string; activeAgent?: string } };
      if (kind === 'final' && typeof (data as any).response === 'string') return { event: kind, data: data as { response: string } };
      if (kind === 'error' && typeof (data as any).error === 'string') return { event: kind, data: data as { error: string } };
      if (kind === 'done') return { event: kind, data: {} };
      throw new Error('Invalid stream event');
    });
  }
}
