import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  authenticatedUser: vi.fn(), resolveThread: vi.fn(), beginRun: vi.fn(),
  getApprovalAgent: vi.fn(), startApprovalRun: vi.fn(), resumeApprovalRun: vi.fn(),
}));
vi.mock('@/lib/orchestration/session', async (original) => ({
  ...await original<typeof import('@/lib/orchestration/session')>(),
  authenticatedUser: mocks.authenticatedUser, resolveThread: mocks.resolveThread, beginRun: mocks.beginRun,
}));
vi.mock('@/ai/agents/approval-agent', () => ({ getApprovalAgent: mocks.getApprovalAgent }));
vi.mock('@/ai/agents/approval-workflow', async (original) => ({
  ...await original<typeof import('@/ai/agents/approval-workflow')>(),
  startApprovalRun: mocks.startApprovalRun, resumeApprovalRun: mocks.resumeApprovalRun,
}));

import { POST as start } from './route';
import { POST as decide } from './decision/route';
import { ApprovalError } from '@/ai/agents/approval-workflow';
import { SessionError } from '@/lib/orchestration/session';

const threadId = '2942cb20-0f89-47b2-af56-53e5b6b7f22e';
function request(path: string, body: object) {
  return new NextRequest(`http://localhost${path}`, { method: 'POST',
    headers: { authorization: 'Bearer synthetic-token' }, body: JSON.stringify(body) });
}

describe('authenticated approval routes', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.authenticatedUser.mockResolvedValue('owner-a');
    mocks.resolveThread.mockResolvedValue({ publicId: threadId, internalId: `approval:owner-a:${threadId}` });
    mocks.beginRun.mockResolvedValue(vi.fn().mockResolvedValue(undefined));
    mocks.getApprovalAgent.mockResolvedValue({});
  });

  it('does not create a graph for an anonymous start request', async () => {
    mocks.authenticatedUser.mockRejectedValue(new SessionError(401, 'Authentication required'));
    const response = await start(request('/api/chat/approval', { message: 'Search flights' }));
    expect(response.status).toBe(401);
    expect(mocks.getApprovalAgent).not.toHaveBeenCalled();
  });

  it('rejects a foreign thread before graph resumption', async () => {
    mocks.resolveThread.mockRejectedValue(new SessionError(404, 'Conversation not found'));
    const response = await decide(request('/api/chat/approval/decision', { threadId, interruptId: 'pending-1', decision: 'approve' }));
    expect(response.status).toBe(404);
    expect(mocks.resumeApprovalRun).not.toHaveBeenCalled();
  });

  it('rejects a stale decision after ownership verification', async () => {
    mocks.resumeApprovalRun.mockRejectedValue(new ApprovalError(409, 'Approval decision is stale or already used'));
    const response = await decide(request('/api/chat/approval/decision', { threadId, interruptId: 'old', decision: 'approve' }));
    expect(response.status).toBe(409);
    expect(mocks.resolveThread).toHaveBeenCalledWith('owner-a', 'approval', threadId);
  });
});
