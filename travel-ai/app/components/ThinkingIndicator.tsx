'use client';

import { MarkdownContent } from './MarkdownContent';

interface ThinkingIndicatorProps {
    content?: string;
}

export function ThinkingIndicator({ content }: ThinkingIndicatorProps) {
    return (
        <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200 my-2">
            {content && (
                <div className="flex-1 text-sm text-gray-700">
                    <MarkdownContent content={content} />
                </div>
            )}
        </div>
    );
}
