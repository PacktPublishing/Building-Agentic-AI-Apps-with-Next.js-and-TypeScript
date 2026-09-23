import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({ authenticatedUser: vi.fn(), resolveThread: vi.fn(), getSwarmState: vi.fn() }));
vi.mock('@/lib/orchestration/session', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/lib/orchestration/session')>(),
  authenticatedUser: mocks.authenticatedUser, resolveThread: mocks.resolveThread,
}));
vi.mock('@/ai/orchestration/swarm', () => ({ getSwarmState: mocks.getSwarmState, invokeSwarm: vi.fn(), streamSwarm: vi.fn() }));

import { GET } from './route';
import { SessionError } from '@/lib/orchestration/session';

describe('swarm state ownership', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authenticatedUser.mockRejectedValue(new SessionError(401, 'Authentication required'));
  });

  it('rejects anonymous state reads', async () => {
    const response = await GET(new NextRequest('http://localhost/api/orchestration/swarm?threadId=2942cb20-0f89-47b2-af56-53e5b6b7f22e'));
    expect(response.status).toBe(401);
    expect(mocks.getSwarmState).not.toHaveBeenCalled();
  });

  it('rejects foreign and guessed IDs before reading checkpoint state', async () => {
    mocks.authenticatedUser.mockResolvedValue('owner-a');
    mocks.resolveThread.mockRejectedValue(new SessionError(404, 'Conversation not found'));
    const response = await GET(new NextRequest('http://localhost/api/orchestration/swarm?threadId=2942cb20-0f89-47b2-af56-53e5b6b7f22e'));
    expect(response.status).toBe(404);
    expect(mocks.getSwarmState).not.toHaveBeenCalled();
  });
});
