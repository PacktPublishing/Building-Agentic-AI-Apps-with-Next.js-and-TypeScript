import { NextRequest, NextResponse } from 'next/server';
import { invokeSupervisor, streamSupervisor } from '@/ai/orchestration/supervisor';
import { authenticatedUser, beginRun, parseConversationBody, publicSessionError, resolveThread } from '@/lib/orchestration/session';

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
    const thread = await resolveThread(userId, 'supervisor', input.threadId);
    release = await beginRun(userId, 'supervisor', thread.publicId);
    const streamAbort = new AbortController();
    const signal = AbortSignal.any([request.signal, streamAbort.signal, AbortSignal.timeout(55_000)]);

    if (!input.stream) {
      try {
        const result = await invokeSupervisor(input.message, thread.internalId, signal);
        return NextResponse.json({ success: true, response: result.response, threadId: thread.publicId, pattern: 'supervisor' });
      } finally {
        await release();
      }
    }

    const freeLease = release;
    const readable = new ReadableStream<Uint8Array>({
      start(controller) {
        void (async () => {
        let finalResponse: string | undefined;
        try {
          controller.enqueue(frame('thread', { threadId: thread.publicId }));
          for await (const update of streamSupervisor(input.message, thread.internalId, signal)) {
            if (signal.aborted) throw new Error('Conversation cancelled');
            if (update.node === 'synthesize' || update.node === 'supervisor') {
              const response = (update.data as { finalResponse?: unknown })?.finalResponse;
              if (typeof response === 'string') finalResponse = response;
            }
            controller.enqueue(frame('progress', { node: update.node }));
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

export async function GET() {
  return NextResponse.json({ pattern: 'supervisor', agents: ['FlightAgent', 'HotelAgent', 'ActivityAgent'] });
}
