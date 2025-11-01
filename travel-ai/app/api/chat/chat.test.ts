import { describe, it, expect } from 'vitest';
import { ChatRequest, SSEEvent } from './types';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

describe('Chat API', () => {
    describe('POST /api/chat/start', () => {
        it('should start a new chat and stream response', async () => {
            const request: ChatRequest = {
                message: 'Hello! I want to plan a trip to Paris'
            };

            const response = await fetch(`${BASE_URL}/api/chat/start`, {
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
            let threadId: string | null = null;

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
                                    
                                    if (event.type === 'start' && event.data.threadId) {
                                        threadId = event.data.threadId;
                                    }
                                    
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
            expect(threadId).toBeDefined();
            console.log('✅ Thread ID:', threadId);
        }, 30000);

        it('should continue conversation with existing threadId', async () => {
            // First message
            const request1: ChatRequest = {
                message: 'Hello!'
            };

            const response1 = await fetch(`${BASE_URL}/api/chat/start`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(request1),
            });

            const reader1 = response1.body?.getReader();
            const decoder = new TextDecoder();
            let threadId: string | null = null;

            if (reader1) {
                while (true) {
                    const { value, done } = await reader1.read();
                    if (done) break;

                    const chunk = decoder.decode(value);
                    const lines = chunk.split('\n');

                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            try {
                                const event: SSEEvent = JSON.parse(line.substring(6));
                                if (event.type === 'start' && event.data.threadId) {
                                    threadId = event.data.threadId;
                                }
                            } catch (e) {
                                // Ignore
                            }
                        }
                    }
                }
            }

            expect(threadId).toBeDefined();

            // Second message with same threadId
            const request2: ChatRequest = {
                message: 'Tell me more about Paris',
                threadId: threadId!
            };

            const response2 = await fetch(`${BASE_URL}/api/chat/start`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(request2),
            });

            expect(response2.ok).toBe(true);
            console.log('✅ Continued conversation with thread:', threadId);
        }, 30000);

        it('should return 400 for missing message', async () => {
            const response = await fetch(`${BASE_URL}/api/chat/start`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}),
            });

            expect(response.status).toBe(400);
            const data = await response.json();
            expect(data.error).toBeDefined();
        });

        it('should handle tool calls automatically', async () => {
            const request: ChatRequest = {
                message: 'Search for good activities in Paris'
            };

            const response = await fetch(`${BASE_URL}/api/chat/start`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(request),
            });

            expect(response.ok).toBe(true);

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            const events: SSEEvent[] = [];

            if (reader) {
                while (true) {
                    const { value, done } = await reader.read();
                    if (done) break;

                    const chunk = decoder.decode(value);
                    const lines = chunk.split('\n');

                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            try {
                                const event: SSEEvent = JSON.parse(line.substring(6));
                                events.push(event);
                                
                                if (event.type === 'toolCall') {
                                    console.log('🔧 Tool called:', event.data.name);
                                }
                            } catch (e) {
                                // Ignore
                            }
                        }
                    }
                }
            }

            // Should have completed without requiring approval
            expect(events[events.length - 1].type).toBe('complete');
            console.log('✅ Agent handled tools automatically');
        }, 30000);
    });
});
