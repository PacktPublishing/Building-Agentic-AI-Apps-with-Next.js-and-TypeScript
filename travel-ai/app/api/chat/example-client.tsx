'use client';

import { useState, useRef } from 'react';
import { SSEEvent } from './types';

/**
 * Example React component showing how to use the Chat API
 * This is a simplified version without approval workflow
 */
export default function ChatExample() {
    const [threadId, setThreadId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const abortControllerRef = useRef<AbortController | null>(null);

    const sendMessage = async (message: string) => {
        setLoading(true);
        setMessages(prev => [...prev, { role: 'user', content: message }]);

        try {
            // Create abort controller for this request
            abortControllerRef.current = new AbortController();

            const response = await fetch('/api/chat/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message,
                    threadId: threadId || undefined,
                }),
                signal: abortControllerRef.current.signal,
            });

            if (!response.ok) {
                throw new Error('Failed to send message');
            }

            // Read SSE stream
            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            let assistantMessage = '';
            let newThreadId = threadId;

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

                                switch (event.type) {
                                    case 'start':
                                        if (event.data.threadId) {
                                            newThreadId = event.data.threadId;
                                            setThreadId(newThreadId);
                                        }
                                        break;

                                    case 'token':
                                        assistantMessage += event.data.content;
                                        // Update UI in real-time
                                        setMessages(prev => {
                                            const newMessages = [...prev];
                                            if (newMessages[newMessages.length - 1]?.role === 'assistant') {
                                                newMessages[newMessages.length - 1].content = assistantMessage;
                                            } else {
                                                newMessages.push({ role: 'assistant', content: assistantMessage });
                                            }
                                            return newMessages;
                                        });
                                        break;

                                    case 'toolCall':
                                        console.log('🔧 Tool call:', event.data);
                                        break;

                                    case 'complete':
                                        console.log('✅ Complete:', event.data);
                                        break;

                                    case 'error':
                                        console.error('❌ Error:', event.data);
                                        setMessages(prev => [...prev, {
                                            role: 'assistant',
                                            content: 'An error occurred: ' + event.data.error
                                        }]);
                                        break;
                                }
                            } catch (e) {
                                console.error('Failed to parse SSE event:', e);
                            }
                        }
                    }
                }
            }
        } catch (error: any) {
            if (error.name === 'AbortError') {
                console.log('Request aborted');
            } else {
                console.error('Error sending message:', error);
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: 'Sorry, an error occurred.'
                }]);
            }
        } finally {
            setLoading(false);
            abortControllerRef.current = null;
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || loading) return;

        const message = input.trim();
        setInput('');
        sendMessage(message);
    };

    const handleReset = () => {
        setThreadId(null);
        setMessages([]);
        setInput('');
    };

    return (
        <div className="flex flex-col h-screen max-w-4xl mx-auto p-4">
            <div className="flex justify-between items-center mb-4">
                <div>
                    {threadId && (
                        <div className="text-sm text-gray-500">
                            Thread: <code className="bg-gray-100 px-2 py-1 rounded">{threadId}</code>
                        </div>
                    )}
                </div>
                {messages.length > 0 && (
                    <button
                        onClick={handleReset}
                        className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded"
                    >
                        🔄 New Chat
                    </button>
                )}
            </div>

            <div className="flex-1 overflow-y-auto mb-4 space-y-4">
                {messages.length === 0 && (
                    <div className="text-center text-gray-400 mt-20">
                        <div className="text-6xl mb-4">💬</div>
                        <p>Start a conversation with the travel agent</p>
                        <p className="text-sm mt-2">Try: "I want to visit Paris" or "Search for flights to NYC"</p>
                    </div>
                )}

                {messages.map((msg, idx) => (
                    <div
                        key={idx}
                        className={`p-4 rounded-lg ${
                            msg.role === 'user'
                                ? 'bg-blue-100 ml-auto max-w-[80%]'
                                : 'bg-gray-100 mr-auto max-w-[80%]'
                        }`}
                    >
                        <div className="font-semibold mb-1">
                            {msg.role === 'user' ? '👤 You' : '🤖 Agent'}
                        </div>
                        <div className="whitespace-pre-wrap">{msg.content}</div>
                    </div>
                ))}

                {loading && messages[messages.length - 1]?.role === 'user' && (
                    <div className="bg-gray-100 p-4 rounded-lg mr-auto max-w-[80%]">
                        <div className="font-semibold mb-1">🤖 Agent</div>
                        <div className="flex items-center gap-2">
                            <div className="animate-pulse">Thinking...</div>
                        </div>
                    </div>
                )}
            </div>

            <form onSubmit={handleSubmit} className="flex gap-2">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Type your message..."
                    className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={loading}
                />
                <button
                    type="submit"
                    disabled={loading || !input.trim()}
                    className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                    {loading ? '⏳' : '📤'}
                </button>
            </form>
        </div>
    );
}
