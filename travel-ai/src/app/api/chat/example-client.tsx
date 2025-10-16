'use client';

import { useState, useRef } from 'react';
import { StartChatResponse, SSEEvent } from './types';

/**
 * Example React component showing how to use the Chat API
 * This is a reference implementation - adapt to your UI needs
 */
export default function ChatExample() {
    const [threadId, setThreadId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [pendingApproval, setPendingApproval] = useState<StartChatResponse | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    const startChat = async (message: string) => {
        setLoading(true);
        setMessages(prev => [...prev, { role: 'user', content: message }]);

        try {
            const response = await fetch('/api/chat/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message }),
            });

            if (!response.ok) {
                throw new Error('Failed to start chat');
            }

            const data: StartChatResponse = await response.json();
            setThreadId(data.threadId);

            if (data.requiresApproval && data.toolCalls) {
                // Show approval UI
                setPendingApproval(data);
            } else if (data.response) {
                // Direct response
                setMessages(prev => [...prev, { role: 'assistant', content: data.response! }]);
            }
        } catch (error) {
            console.error('Error starting chat:', error);
            setMessages(prev => [...prev, { 
                role: 'assistant', 
                content: 'Sorry, an error occurred.' 
            }]);
        } finally {
            setLoading(false);
        }
    };

    const continueChat = async (approved: boolean, newMessage?: string) => {
        if (!threadId) return;

        setLoading(true);
        setPendingApproval(null);

        if (newMessage) {
            setMessages(prev => [...prev, { role: 'user', content: newMessage }]);
        }

        try {
            // Create abort controller for this request
            abortControllerRef.current = new AbortController();

            const response = await fetch('/api/chat/continue', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    threadId,
                    approved,
                    message: newMessage,
                }),
                signal: abortControllerRef.current.signal,
            });

            if (!response.ok) {
                throw new Error('Failed to continue chat');
            }

            // Read SSE stream
            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            let assistantMessage = '';

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
                                        console.log('Tool call:', event.data);
                                        break;

                                    case 'complete':
                                        if (event.data.requiresApproval) {
                                            setPendingApproval({
                                                threadId,
                                                requiresApproval: true,
                                                toolCalls: event.data.toolCalls,
                                            });
                                        }
                                        break;

                                    case 'error':
                                        console.error('Stream error:', event.data);
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
                console.error('Error continuing chat:', error);
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

        if (threadId) {
            continueChat(false, message);
        } else {
            startChat(message);
        }
    };

    const handleApprove = () => {
        continueChat(true);
    };

    const handleReject = () => {
        setPendingApproval(null);
        setMessages(prev => [...prev, {
            role: 'assistant',
            content: 'Action cancelled.'
        }]);
    };

    return (
        <div className="flex flex-col h-screen max-w-4xl mx-auto p-4">
            <div className="flex-1 overflow-y-auto mb-4 space-y-4">
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

                {pendingApproval && (
                    <div className="p-4 bg-yellow-50 border-2 border-yellow-300 rounded-lg">
                        <div className="font-semibold mb-2">⚠️ Approval Required</div>
                        <div className="mb-3">
                            The agent wants to perform the following actions:
                        </div>
                        <div className="space-y-2 mb-4">
                            {pendingApproval.toolCalls?.map((call, idx) => (
                                <div key={idx} className="bg-white p-3 rounded border">
                                    <div className="font-mono text-sm font-semibold">{call.name}</div>
                                    <pre className="text-xs mt-1 overflow-x-auto">
                                        {JSON.stringify(call.args, null, 2)}
                                    </pre>
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={handleApprove}
                                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                                disabled={loading}
                            >
                                ✅ Approve
                            </button>
                            <button
                                onClick={handleReject}
                                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                                disabled={loading}
                            >
                                ❌ Reject
                            </button>
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
