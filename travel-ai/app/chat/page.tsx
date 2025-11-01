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
        <div className="flex flex-col h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30">
            {/* Header */}
            <header className="bg-white/80 backdrop-blur-lg border-b border-gray-200/50 px-6 py-4 shadow-sm">
                <div className="max-w-6xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl shadow-lg">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                                Travel AI Assistant
                            </h1>
                            <p className="text-xs text-gray-500">Powered by LangGraph</p>
                        </div>
                    </div>
                    {messages.length > 0 && (
                        <button
                            onClick={clearMessages}
                            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Clear Chat
                        </button>
                    )}
                </div>
            </header>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
                <div className="max-w-6xl mx-auto space-y-6">
                    {messages.length === 0 && (
                        <div className="text-center py-16">
                            <div className="mb-6 inline-block p-4 bg-gradient-to-br from-blue-100 to-purple-100 rounded-2xl">
                                <svg className="w-16 h-16 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                            </div>
                            <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent mb-3">
                                Welcome to Travel AI Assistant
                            </h2>
                            <p className="text-gray-600 text-lg mb-8 max-w-2xl mx-auto">
                                Your intelligent travel companion powered by AI. Ask me to find activities, hotels, or flights anywhere in the world!
                            </p>
                            <div className="flex flex-wrap gap-3 justify-center max-w-3xl mx-auto">
                                <button
                                    onClick={() => sendMessage('Find activities in Paris')}
                                    className="group flex items-center gap-2 px-6 py-3 bg-white hover:bg-blue-50 text-blue-700 rounded-xl border-2 border-blue-200 hover:border-blue-400 transition-all shadow-sm hover:shadow-md"
                                >
                                    <span className="text-2xl">🗼</span>
                                    <span className="font-medium">Find activities in Paris</span>
                                    <svg className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </button>
                                <button
                                    onClick={() => sendMessage('Search hotels in Tokyo')}
                                    className="group flex items-center gap-2 px-6 py-3 bg-white hover:bg-purple-50 text-purple-700 rounded-xl border-2 border-purple-200 hover:border-purple-400 transition-all shadow-sm hover:shadow-md"
                                >
                                    <span className="text-2xl">🏯</span>
                                    <span className="font-medium">Search hotels in Tokyo</span>
                                    <svg className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </button>
                                <button
                                    onClick={() => sendMessage('Find flights to New York')}
                                    className="group flex items-center gap-2 px-6 py-3 bg-white hover:bg-green-50 text-green-700 rounded-xl border-2 border-green-200 hover:border-green-400 transition-all shadow-sm hover:shadow-md"
                                >
                                    <span className="text-2xl">🗽</span>
                                    <span className="font-medium">Find flights to New York</span>
                                    <svg className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    )}

                    {messages.map((message) => (
                        <div
                            key={message.id}
                            className={`flex ${
                                message.type === 'user' ? 'justify-end' : 'justify-start'
                            } animate-fade-in`}
                        >
                            <div
                                className={`max-w-4xl ${
                                    message.type === 'user'
                                        ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-2xl px-6 py-4 shadow-lg'
                                        : 'w-full'
                                }`}
                            >
                                {message.type === 'user' ? (
                                    <p className="text-base leading-relaxed">{message.content}</p>
                                ) : (
                                    <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                                        {message.events && message.events.length > 0 ? (
                                            <MessageRenderer events={message.events} />
                                        ) : (
                                            <div className="flex items-center gap-3 text-gray-500">
                                                <div className="flex space-x-1">
                                                    <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce"></div>
                                                    <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                                    <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                                </div>
                                                <span className="text-sm font-medium">Thinking...</span>
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
            <div className="bg-white/80 backdrop-blur-lg border-t border-gray-200/50 px-6 py-4 shadow-lg">
                <form onSubmit={handleSubmit} className="max-w-6xl mx-auto">
                    <div className="flex gap-3">
                        <div className="flex-1 relative">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Ask me anything about travel..."
                                disabled={isStreaming}
                                className="w-full px-6 py-4 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-gray-100 disabled:cursor-not-allowed transition-all text-base"
                            />
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                                </svg>
                            </div>
                        </div>
                        <button
                            type="submit"
                            disabled={!input.trim() || isStreaming}
                            className="px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed font-semibold shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
                        >
                            {isStreaming ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    <span>Sending...</span>
                                </>
                            ) : (
                                <>
                                    <span>Send</span>
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                    </svg>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
