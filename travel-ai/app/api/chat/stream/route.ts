import { NextRequest } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { TravelAssistantAgent } from '../../../../ai/agents/agent';
import { ChatRequest, SSEEvent } from '../types';

/**
 * POST /api/chat/stream
 * Server-Sent Events streaming - real-time response streaming
 * Use this for better UX with progressive response display
 */
export async function POST(request: NextRequest) {
    try {
        const body: ChatRequest = await request.json();
        const { message, threadId } = body;

        if (!message || typeof message !== 'string') {
            return new Response(
                JSON.stringify({ error: 'Message is required and must be a string' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // Generate thread ID if not provided
        const finalThreadId = threadId || uuidv4();

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
                    const agent = TravelAssistantAgent.getInstance();
                    await agent.initialize();

                    sendEvent({ type: 'start', data: { threadId: finalThreadId } });

                    // Use the agent's stream method for REAL streaming
                    let fullResponse = '';
                    
                    for await (const chunk of agent.stream(message, finalThreadId)) {
                        if (chunk && typeof chunk === 'string') {
                            fullResponse += chunk;
                            
                            // Stream each chunk as it arrives from the agent
                            sendEvent({
                                type: 'token',
                                data: { content: chunk }
                            });
                        }
                    }

                    // Send completion event
                    sendEvent({
                        type: 'complete',
                        data: {
                            threadId: finalThreadId,
                            response: fullResponse
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
        console.error('Error in /api/chat/stream:', error);
        return new Response(
            JSON.stringify({
                error: 'Failed to start stream',
                details: error instanceof Error ? error.message : 'Unknown error'
            }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}
