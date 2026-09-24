import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getApprovalAgent } from '@/ai/agents/approval-agent';
import { ApprovalError, resumeApprovalRun } from '@/ai/agents/approval-workflow';
import { lastAnswer } from '@/ai/agents/approval-response';
import { authenticatedUser, beginRun, publicSessionError, resolveThread } from '@/lib/orchestration/session';

export const runtime = 'nodejs';
export const maxDuration = 60;

const decisionSchema = z.object({
  threadId: z.string().uuid(), interruptId: z.string().min(1).max(200), decision: z.enum(['approve', 'reject']),
}).strict();

export async function POST(request: NextRequest) {
  let release: (() => Promise<void>) | undefined;
  try {
    const userId = await authenticatedUser(request);
    const parsed = decisionSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: 'Invalid approval decision' }, { status: 400 });
    const thread = await resolveThread(userId, 'approval', parsed.data.threadId);
    release = await beginRun(userId, 'approval', thread.publicId);
    const graph = await getApprovalAgent();
    const result = await resumeApprovalRun(graph, thread.internalId, parsed.data.interruptId, parsed.data.decision);
    return NextResponse.json({ threadId: thread.publicId, response: lastAnswer(result) });
  } catch (error) {
    if (error instanceof ApprovalError) return NextResponse.json({ error: error.message }, { status: error.status });
    const safe = publicSessionError(error);
    return NextResponse.json({ error: safe.message }, { status: safe.status });
  } finally {
    if (release) await release();
  }
}
