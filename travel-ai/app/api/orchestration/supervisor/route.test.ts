import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const auth = vi.hoisted(() => ({
  authenticatedUser: vi.fn(), resolveThread: vi.fn(), beginRun: vi.fn(), invokeSupervisor: vi.fn(), streamSupervisor: vi.fn(),
}));
vi.mock('@/lib/orchestration/session', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/lib/orchestration/session')>(),
  authenticatedUser: auth.authenticatedUser,
  resolveThread: auth.resolveThread,
  beginRun: auth.beginRun,
}));
vi.mock('@/ai/orchestration/supervisor', () => ({ invokeSupervisor: auth.invokeSupervisor, streamSupervisor: auth.streamSupervisor }));

import { POST } from './route';
import { SessionError } from '@/lib/orchestration/session';

function request(body: object, token?: string) {
  return new NextRequest('http://localhost/api/orchestration/supervisor', {
    method: 'POST', headers: token ? { authorization: `Bearer ${token}` } : {}, body: JSON.stringify(body),
  });
}

describe('supervisor API authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.authenticatedUser.mockImplementation(async (req: Request) => {
      if (!req.headers.get('authorization')) throw new SessionError(401, 'Authentication required');
      return 'owner-a';
    });
    auth.resolveThread.mockResolvedValue({ publicId: '2942cb20-0f89-47b2-af56-53e5b6b7f22e', internalId: 'supervisor:owner-a:2942cb20-0f89-47b2-af56-53e5b6b7f22e' });
    auth.beginRun.mockResolvedValue(vi.fn());
    auth.invokeSupervisor.mockResolvedValue({ response: 'Safe answer', agentOutputs: { FlightAgent: 'private report' } });
  });

  it('rejects an anonymous request before graph access', async () => {
    const response = await POST(request({ message: 'Trip' }));
    expect(response.status).toBe(401);
    expect(auth.resolveThread).not.toHaveBeenCalled();
  });

  it('rejects a foreign conversation ID without invoking the graph', async () => {
    auth.resolveThread.mockRejectedValue(new SessionError(404, 'Conversation not found'));
    const response = await POST(request({ message: 'Trip', threadId: '2942cb20-0f89-47b2-af56-53e5b6b7f22e' }, 'synthetic'));
    expect(response.status).toBe(404);
    expect(auth.invokeSupervisor).not.toHaveBeenCalled();
  });

  it('passes only a server-scoped ID and omits private reports from the response', async () => {
    const response = await POST(request({ message: 'Trip' }, 'synthetic'));
    expect(response.status).toBe(200);
    expect(auth.invokeSupervisor).toHaveBeenCalledWith('Trip', 'supervisor:owner-a:2942cb20-0f89-47b2-af56-53e5b6b7f22e', expect.any(AbortSignal));
    const body = await response.json();
    expect(body.response).toBe('Safe answer');
    expect(body.agentOutputs).toBeUndefined();
  });

  it('emits typed sanitized midstream errors, not a successful done event', async () => {
    auth.streamSupervisor.mockImplementation(async function* () {
      yield { node: 'FlightAgent', data: { private: 'secret' } };
      throw new Error('secret provider detail');
    });
    const response = await POST(request({ message: 'Trip', stream: true }, 'synthetic'));
    const text = await response.text();
    expect(text).toContain('event: progress');
    expect(text).toContain('event: error');
    expect(text).not.toContain('secret');
    expect(text).not.toContain('event: done');
  });

  it('propagates stream cancellation to the graph signal', async () => {
    let observedSignal: AbortSignal | undefined;
    auth.streamSupervisor.mockImplementation(async function* (_message: string, _thread: string, signal: AbortSignal) {
      observedSignal = signal;
      yield { node: 'FlightAgent', data: {} };
      await new Promise<void>((resolve) => signal.addEventListener('abort', () => resolve(), { once: true }));
    });
    const response = await POST(request({ message: 'Trip', stream: true }, 'synthetic'));
    const reader = response.body!.getReader();
    await reader.read();
    await reader.cancel();
    expect(observedSignal?.aborted).toBe(true);
  });
});
