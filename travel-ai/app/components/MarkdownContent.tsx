'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownContentProps {
    content: string;
}

export function MarkdownContent({ content }: MarkdownContentProps) {
    return (
        <div className="prose prose-sm max-w-none">
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                // Style headings
                h1: ({ children }) => (
                    <h1 className="text-2xl font-bold mt-4 mb-2">{children}</h1>
                ),
                h2: ({ children }) => (
                    <h2 className="text-xl font-bold mt-3 mb-2">{children}</h2>
                ),
                h3: ({ children }) => (
                    <h3 className="text-lg font-semibold mt-2 mb-1">{children}</h3>
                ),
                // Style paragraphs
                p: ({ children }) => (
                    <p className="mb-3 leading-relaxed">{children}</p>
                ),
                // Style lists
                ul: ({ children }) => (
                    <ul className="list-disc list-inside mb-3 space-y-1">{children}</ul>
                ),
                ol: ({ children }) => (
                    <ol className="list-decimal list-inside mb-3 space-y-1">{children}</ol>
                ),
                li: ({ children }) => (
                    <li className="ml-4">{children}</li>
                ),
                // Style links
                a: ({ href, children }) => (
                    <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 underline"
                    >
                        {children}
                    </a>
                ),
                // Style code
                code: ({ className, children }) => {
                    const isInline = !className;
                    return isInline ? (
                        <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono text-red-600">
                            {children}
                        </code>
                    ) : (
                        <code className="block bg-gray-100 p-3 rounded text-sm font-mono overflow-x-auto">
                            {children}
                        </code>
                    );
                },
                // Style blockquotes
                blockquote: ({ children }) => (
                    <blockquote className="border-l-4 border-gray-300 pl-4 italic my-3 text-gray-700">
                        {children}
                    </blockquote>
                ),
                // Style strong/bold
                strong: ({ children }) => (
                    <strong className="font-bold text-gray-900">{children}</strong>
                ),
            }}
        >
            {content}
        </ReactMarkdown>
        </div>
    );
}
