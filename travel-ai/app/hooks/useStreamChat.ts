'use client';

import { useState, useCallback, useMemo } from 'react';
import { SSEEvent } from '../api/chat/types';

export interface StreamMessage {
    id: string;
    type: 'user' | 'assistant';
    content: string;
    events?: SSEEvent[];
    timestamp: Date;
}

export function useStreamChat() {
    const [messages, setMessages] = useState<StreamMessage[]>([]);
    const [isStreaming, setIsStreaming] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    // Generate a unique thread ID for this chat session
    const threadId = useMemo(() => `thread-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, []);

    const sendMessage = useCallback(async (message: string) => {
        setIsStreaming(true);
        setError(null);

        // Add user message
        const userMessage: StreamMessage = {
            id: Date.now().toString(),
            type: 'user',
            content: message,
            timestamp: new Date(),
        };
        setMessages(prev => [...prev, userMessage]);

        // Prepare assistant message
        const assistantMessageId = (Date.now() + 1).toString();
        const assistantMessage: StreamMessage = {
            id: assistantMessageId,
            type: 'assistant',
            content: '',
            events: [],
            timestamp: new Date(),
        };
        setMessages(prev => [...prev, assistantMessage]);

        try {
            const response = await fetch('/api/chat/stream-structured', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message, threadId }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();

            if (!reader) {
                throw new Error('No reader available');
            }

            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);
                        try {
                            const event: SSEEvent = JSON.parse(data);
                            
                            // Update assistant message with new event
                            setMessages(prev => prev.map(msg => {
                                if (msg.id === assistantMessageId) {
                                    const updatedEvents = [...(msg.events || []), event];
                                    
                                    // Build content from thinking events
                                    let content = msg.content;
                                    if (event.type === 'thinking') {
                                        content += (content ? '\n\n' : '') + event.data.content;
                                    }
                                    
                                    return {
                                        ...msg,
                                        content,
                                        events: updatedEvents,
                                    };
                                }
                                return msg;
                            }));
                        } catch (e) {
                            console.error('Failed to parse SSE event:', e);
                        }
                    }
                }
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            setError(errorMessage);
            console.error('Stream error:', err);
        } finally {
            setIsStreaming(false);
        }
    }, [threadId]);

    const clearMessages = useCallback(() => {
        setMessages([]);
        setError(null);
    }, []);

    return {
        messages,
        isStreaming,
        error,
        sendMessage,
        clearMessages,
    };
}
