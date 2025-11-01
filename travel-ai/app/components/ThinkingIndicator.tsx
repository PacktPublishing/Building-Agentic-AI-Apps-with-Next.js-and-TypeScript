'use client';

import { MarkdownContent } from './MarkdownContent';

interface ThinkingIndicatorProps {
    content?: string;
}

export function ThinkingIndicator({ content }: ThinkingIndicatorProps) {
    return (
        <div className="relative overflow-hidden bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 rounded-xl border border-blue-200/50 p-5 my-3 shadow-sm">
            {/* Animated background gradient */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-400/10 via-purple-400/10 to-pink-400/10 animate-pulse" />
            
            <div className="relative flex items-start gap-4">
                {/* Brain icon with pulse animation */}
                <div className="flex-shrink-0 mt-0.5">
                    <div className="relative">
                        <svg className="w-6 h-6 text-blue-600 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                        <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full animate-ping" />
                    </div>
                </div>
                
                {content ? (
                    <div className="flex-1 text-sm text-gray-800">
                        <MarkdownContent content={content} />
                    </div>
                ) : (
                    <div className="flex-1 text-sm text-gray-700 font-medium flex items-center gap-2">
                        <span>Processing your request</span>
                        <div className="flex gap-1">
                            <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
