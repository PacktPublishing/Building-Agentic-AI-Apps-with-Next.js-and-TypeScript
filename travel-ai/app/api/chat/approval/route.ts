import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getApprovalAgent } from '@/ai/agents/approval-agent';
import { lastAnswer } from '@/ai/agents/approval-response';
import { ApprovalError, startApprovalRun } from '@/ai/agents/approval-workflow';
import { authenticatedUser, beginRun, parseConversationBody, publicSessionError, resolveThread } from '@/lib/orchestration/session';

export const runtime = 'nodejs';
export const maxDuration = 60;

const pendingSchema = z.object({ actionRequests: z.array(z.object({ name: z.string(), args: z.record(z.unknown()) })).length(1) });

export async function POST(request: NextRequest) {
  let release: (() => Promise<void>) | undefined;
  try {
    const userId = await authenticatedUser(request);
    const input = parseConversationBody(await request.json());
    const thread = await resolveThread(userId, 'approval', input.threadId);
    release = await beginRun(userId, 'approval', thread.publicId);
    const graph = await getApprovalAgent();
    const { result, pending } = await startApprovalRun(graph, thread.internalId, input.message);
    if (pending) {
      const review = pendingSchema.safeParse(pending.value);
      if (!review.success) return NextResponse.json({ error: 'Approval request unavailable' }, { status: 503 });
      return NextResponse.json({ needsApproval: true, threadId: thread.publicId,
        interruptId: pending.id, action: review.data.actionRequests[0] });
    }
    return NextResponse.json({ needsApproval: false, threadId: thread.publicId, response: lastAnswer(result) });
  } catch (error) {
    if (error instanceof ApprovalError) return NextResponse.json({ error: error.message }, { status: error.status });
    const safe = publicSessionError(error);
    return NextResponse.json({ error: safe.message }, { status: safe.status });
  } finally {
    if (release) await release();
  }
}
