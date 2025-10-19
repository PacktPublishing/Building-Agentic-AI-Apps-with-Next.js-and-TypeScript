'use client';

import { useState, useRef, useEffect } from 'react';
import { useStreamChat } from '../hooks/useStreamChat';
import { MessageRenderer } from '../components/MessageRenderer';

export default function ChatPage() {
    const [input, setInput] = useState('');
    const { messages, isStreaming, error, sendMessage, clearMessages } = useStreamChat();
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isStreaming) return;

        const message = input.trim();
        setInput('');
        await sendMessage(message);
    };

    return (
        <div className="flex flex-col h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 px-6 py-4">
                <div className="max-w-6xl mx-auto flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-gray-900">
                        Travel AI Assistant
                    </h1>
                    {messages.length > 0 && (
                        <button
                            onClick={clearMessages}
                            className="text-sm text-gray-600 hover:text-gray-900"
                        >
                            Clear Chat
                        </button>
                    )}
                </div>
            </header>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
                <div className="max-w-6xl mx-auto space-y-6">
                    {messages.length === 0 && (
                        <div className="text-center py-12">
                            <h2 className="text-xl font-semibold text-gray-700 mb-2">
                                Welcome to Travel AI Assistant
                            </h2>
                            <p className="text-gray-600">
                                Ask me to find activities, hotels, or flights in any city!
                            </p>
                            <div className="mt-6 flex flex-wrap gap-2 justify-center">
                                <button
                                    onClick={() => sendMessage('Find activities in Paris')}
                                    className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
                                >
                                    Find activities in Paris
                                </button>
                                <button
                                    onClick={() => sendMessage('Search hotels in Tokyo')}
                                    className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
                                >
                                    Search hotels in Tokyo
                                </button>
                                <button
                                    onClick={() => sendMessage('Find flights to New York')}
                                    className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
                                >
                                    Find flights to New York
                                </button>
                            </div>
                        </div>
                    )}

                    {messages.map((message) => (
                        <div
                            key={message.id}
                            className={`flex ${
                                message.type === 'user' ? 'justify-end' : 'justify-start'
                            }`}
                        >
                            <div
                                className={`max-w-4xl ${
                                    message.type === 'user'
                                        ? 'bg-blue-600 text-white rounded-lg px-4 py-3'
                                        : 'w-full'
                                }`}
                            >
                                {message.type === 'user' ? (
                                    <p>{message.content}</p>
                                ) : (
                                    <div className="bg-white rounded-lg p-6 shadow-sm">
                                        {message.events && message.events.length > 0 ? (
                                            <MessageRenderer events={message.events} />
                                        ) : (
                                            <div className="flex items-center gap-2 text-gray-500">
                                                <div className="flex space-x-1">
                                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                                </div>
                                                <span className="text-sm">Thinking...</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}

                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
                            <strong>Error:</strong> {error}
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* Input */}
            <div className="bg-white border-t border-gray-200 px-6 py-4">
                <form onSubmit={handleSubmit} className="max-w-6xl mx-auto">
                    <div className="flex gap-3">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Ask me anything about travel..."
                            disabled={isStreaming}
                            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                        />
                        <button
                            type="submit"
                            disabled={!input.trim() || isStreaming}
                            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
                        >
                            {isStreaming ? 'Sending...' : 'Send'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
