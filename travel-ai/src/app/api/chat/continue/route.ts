import { NextRequest } from 'next/server';
import { MyFirstAgent } from '../../../../../ai/agents/agent';
import { ContinueChatRequest, SSEEvent } from '../types';

/**
 * POST /api/chat/continue
 * Continue a chat conversation with streaming via SSE
 */
export async function POST(request: NextRequest) {
    try {
        const body: ContinueChatRequest = await request.json();
        const { threadId, approved, message } = body;

        if (!threadId || typeof threadId !== 'string') {
            return new Response(
                JSON.stringify({ error: 'Thread ID is required' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

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

                    sendEvent({ type: 'start', data: { threadId } });

                    let result;

                    if (message) {
                        // New message in the conversation
                        sendEvent({ 
                            type: 'token', 
                            data: { content: 'Processing your request...' } 
                        });

                        result = await agent.invoke(message, threadId);
                    } else if (approved) {
                        // Continue after approval
                        sendEvent({ 
                            type: 'token', 
                            data: { content: 'Executing approved actions...' } 
                        });

                        const response = await agent.approveAndContinue(threadId);
                        result = { response, requiresApproval: false };
                    } else {
                        // Rejection case
                        sendEvent({ 
                            type: 'complete', 
                            data: { 
                                response: 'Action cancelled by user.',
                                requiresApproval: false 
                            } 
                        });
                        controller.close();
                        return;
                    }

                    // Send tool calls if any
                    if (result.toolCalls && result.toolCalls.length > 0) {
                        for (const toolCall of result.toolCalls) {
                            sendEvent({
                                type: 'toolCall',
                                data: {
                                    name: toolCall.name,
                                    args: toolCall.args
                                }
                            });
                        }
                    }

                    // Stream the response token by token
                    if (result.response) {
                        const words = result.response.split(' ');
                        for (let i = 0; i < words.length; i++) {
                            const word = words[i];
                            sendEvent({
                                type: 'token',
                                data: { content: word + (i < words.length - 1 ? ' ' : '') }
                            });
                            // Small delay to simulate streaming
                            await new Promise(resolve => setTimeout(resolve, 30));
                        }
                    }

                    // Send completion event
                    sendEvent({
                        type: 'complete',
                        data: {
                            response: result.response,
                            requiresApproval: result.requiresApproval,
                            toolCalls: result.toolCalls
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
        console.error('Error in /api/chat/continue:', error);
        return new Response(
            JSON.stringify({
                error: 'Failed to continue chat',
                details: error instanceof Error ? error.message : 'Unknown error'
            }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}
