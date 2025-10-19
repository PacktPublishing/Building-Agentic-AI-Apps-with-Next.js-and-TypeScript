'use client';

interface ThinkingIndicatorProps {
    content?: string;
}

export function ThinkingIndicator({ content }: ThinkingIndicatorProps) {
    return (
        <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200 my-2">
            <div className="flex-shrink-0">
                <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
            </div>
            {content && (
                <div className="flex-1 text-sm text-gray-700">
                    {content}
                </div>
            )}
        </div>
    );
}
