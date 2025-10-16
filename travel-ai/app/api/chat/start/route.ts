import { NextRequest } from 'next/server';
import { MyFirstAgent } from '../../../../ai/agents/agent';
import { ChatRequest, SSEEvent } from '../types';

/**
 * POST /api/chat/start
 * Start or continue a chat conversation with streaming via SSE
 */
export async function POST(request: NextRequest) {
    try {
        const body: ChatRequest = await request.json();
        const { message, threadId, userId } = body;

        if (!message || typeof message !== 'string') {
            return new Response(
                JSON.stringify({ error: 'Message is required and must be a string' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // Generate thread ID if not provided
        const finalThreadId = threadId || `thread-${Date.now()}-${Math.random().toString(36).substring(7)}`;

        // Create a ReadableStream for SSE
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            async start(controller) {
                const sendEvent = (event: SSEEvent) => {
                    const data = `data: ${JSON.stringify(event)}\n\n`;
                    controller.enqueue(encoder.encode(data));
                };

                try {
                    // Initialize the agent
                    const agent = MyFirstAgent.getInstance();
                    await agent.initialize();

                    sendEvent({ type: 'start', data: { threadId: finalThreadId } });

                    // Invoke the agent and get the final response
                    const response = await agent.invoke(message, finalThreadId);
                    
                    // Stream the response word by word for better UX
                    if (response && typeof response === 'string') {
                        const words = response.split(' ');
                        for (let i = 0; i < words.length; i++) {
                            const word = words[i];
                            sendEvent({
                                type: 'token',
                                data: { content: word + (i < words.length - 1 ? ' ' : '') }
                            });
                            // Small delay for streaming effect
                            await new Promise(resolve => setTimeout(resolve, 30));
                        }
                    }

                    // Send completion event
                    sendEvent({
                        type: 'complete',
                        data: {
                            threadId: finalThreadId,
                            response: response || ''
                        }
                    });

                } catch (error) {
                    console.error('Error in SSE stream:', error);
                    sendEvent({
                        type: 'error',
                        data: {
                            error: 'Failed to process request',
                            details: error instanceof Error ? error.message : 'Unknown error'
                        }
                    });
                } finally {
                    controller.close();
                }
            }
        });

        // Return SSE response
        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        });

    } catch (error) {
        console.error('Error in /api/chat/start:', error);
        return new Response(
            JSON.stringify({
                error: 'Failed to start chat',
                details: error instanceof Error ? error.message : 'Unknown error'
            }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}
