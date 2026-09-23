import { NextRequest, NextResponse } from 'next/server';
import { invokeSwarm, streamSwarm, getSwarmState } from '@/ai/orchestration/swarm';
import { authenticatedUser, beginRun, parseConversationBody, publicSessionError, resolveThread, SessionError } from '@/lib/orchestration/session';

export const runtime = 'nodejs';
export const maxDuration = 60;

function frame(event: string, data: object): Uint8Array {
  return new TextEncoder().encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

export async function POST(request: NextRequest) {
  let release: (() => Promise<void>) | undefined;
  try {
    const userId = await authenticatedUser(request);
    const input = parseConversationBody(await request.json());
    const thread = await resolveThread(userId, 'swarm', input.threadId);
    release = await beginRun(userId, 'swarm', thread.publicId);
    const streamAbort = new AbortController();
    const signal = AbortSignal.any([request.signal, streamAbort.signal, AbortSignal.timeout(55_000)]);
    if (!input.stream) {
      try {
        const result = await invokeSwarm(input.message, thread.internalId, signal);
        return NextResponse.json({ success: true, response: result.response, activeAgent: result.activeAgent, threadId: thread.publicId });
      } finally { await release(); }
    }
    const freeLease = release;
    const readable = new ReadableStream<Uint8Array>({
      start(controller) {
        void (async () => {
        let finalResponse = '';
        try {
          controller.enqueue(frame('thread', { threadId: thread.publicId }));
          for await (const update of streamSwarm(input.message, thread.internalId, signal)) {
            if (signal.aborted) throw new Error('Conversation cancelled');
            if (update.data.response) finalResponse = update.data.response;
            controller.enqueue(frame('progress', { node: update.node, activeAgent: update.activeAgent }));
          }
          if (!finalResponse) throw new Error('Conversation produced no response');
          controller.enqueue(frame('final', { response: finalResponse }));
          controller.enqueue(frame('done', {}));
        } catch {
          if (!streamAbort.signal.aborted) controller.enqueue(frame('error', { error: 'Conversation failed' }));
        } finally {
          try { await freeLease(); } catch { /* A timed lease will expire if storage is unavailable. */ }
          if (!streamAbort.signal.aborted) controller.close();
        }
        })();
      },
      cancel() { streamAbort.abort(); },
    });
    release = undefined;
    return new Response(readable, { headers: { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform' } });
  } catch (error) {
    if (release) await release();
    const safe = publicSessionError(error);
    return NextResponse.json({ error: safe.message }, { status: safe.status });
  }
}

export async function GET(request: NextRequest) {
  try {
    const userId = await authenticatedUser(request);
    const threadId = new URL(request.url).searchParams.get('threadId');
    if (!threadId) throw new SessionError(400, 'Conversation ID required');
    const thread = await resolveThread(userId, 'swarm', threadId);
    const state = await getSwarmState(thread.internalId);
    return NextResponse.json({ success: true, threadId: thread.publicId, activeAgent: state.activeAgent, messageCount: state.messageCount });
  } catch (error) {
    const safe = publicSessionError(error);
    return NextResponse.json({ error: safe.message }, { status: safe.status });
  }
}
