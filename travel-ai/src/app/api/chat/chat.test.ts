import { describe, it, expect, beforeAll } from 'vitest';
import { StartChatRequest, StartChatResponse, ContinueChatRequest, SSEEvent } from './types';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

describe('Chat API Routes', () => {
    let testThreadId: string;

    describe('POST /api/chat/start', () => {
        it('should start a new chat conversation', async () => {
            const request: StartChatRequest = {
                message: 'Hello, I want to plan a trip to Paris'
            };

            const response = await fetch(`${BASE_URL}/api/chat/start`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(request),
            });

            expect(response.ok).toBe(true);
            const data: StartChatResponse = await response.json();

            expect(data.threadId).toBeDefined();
            expect(typeof data.threadId).toBe('string');
            expect(data.requiresApproval).toBeDefined();
            expect(typeof data.requiresApproval).toBe('boolean');

            if (data.response) {
                expect(typeof data.response).toBe('string');
            }

            testThreadId = data.threadId;
            console.log('✅ Chat started with thread ID:', testThreadId);
        }, 30000);

        it('should return 400 for missing message', async () => {
            const response = await fetch(`${BASE_URL}/api/chat/start`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({}),
            });

            expect(response.status).toBe(400);
            const data = await response.json();
            expect(data.error).toBeDefined();
        });

        it('should handle tool calls requiring approval', async () => {
            const request: StartChatRequest = {
                message: 'Search for flights from Paris to New York for November 2025'
            };

            const response = await fetch(`${BASE_URL}/api/chat/start`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(request),
            });

            expect(response.ok).toBe(true);
            const data: StartChatResponse = await response.json();

            if (data.requiresApproval) {
                expect(data.toolCalls).toBeDefined();
                expect(Array.isArray(data.toolCalls)).toBe(true);
                console.log('🔧 Tool calls requiring approval:', data.toolCalls);
            }
        }, 30000);
    });

    describe('POST /api/chat/continue', () => {
        beforeAll(async () => {
            // Start a chat to get a thread ID
            const request: StartChatRequest = {
                message: 'What are good activities in Paris?'
            };

            const response = await fetch(`${BASE_URL}/api/chat/start`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(request),
            });

            const data: StartChatResponse = await response.json();
            testThreadId = data.threadId;
        });

        it('should continue chat with SSE streaming', async () => {
            const request: ContinueChatRequest = {
                threadId: testThreadId,
                approved: true
            };

            const response = await fetch(`${BASE_URL}/api/chat/continue`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(request),
            });

            expect(response.ok).toBe(true);
            expect(response.headers.get('content-type')).toBe('text/event-stream');

            // Read SSE stream
            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            const events: SSEEvent[] = [];

            if (reader) {
                let done = false;
                while (!done) {
                    const { value, done: streamDone } = await reader.read();
                    done = streamDone;

                    if (value) {
                        const chunk = decoder.decode(value);
                        const lines = chunk.split('\n');

                        for (const line of lines) {
                            if (line.startsWith('data: ')) {
                                const eventData = line.substring(6);
                                try {
                                    const event: SSEEvent = JSON.parse(eventData);
                                    events.push(event);
                                    console.log('📡 SSE Event:', event.type, event.data);
                                } catch (e) {
                                    // Ignore parse errors
                                }
                            }
                        }
                    }
                }
            }

            expect(events.length).toBeGreaterThan(0);
            expect(events[0].type).toBe('start');
            expect(events[events.length - 1].type).toBe('complete');
        }, 30000);

        it('should return 400 for missing thread ID', async () => {
            const response = await fetch(`${BASE_URL}/api/chat/continue`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ approved: true }),
            });

            expect(response.status).toBe(400);
        });

        it('should handle new message in existing thread', async () => {
            const request: ContinueChatRequest = {
                threadId: testThreadId,
                approved: false,
                message: 'Tell me more about the Eiffel Tower'
            };

            const response = await fetch(`${BASE_URL}/api/chat/continue`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(request),
            });

            expect(response.ok).toBe(true);
            expect(response.headers.get('content-type')).toBe('text/event-stream');
        }, 30000);
    });
});
