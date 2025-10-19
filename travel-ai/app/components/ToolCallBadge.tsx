'use client';

interface ToolCallBadgeProps {
    toolName: string;
    args?: Record<string, any>;
    result?: any;
    summary?: string;
}

export function ToolCallBadge({ toolName, args, result, summary }: ToolCallBadgeProps) {
    const getToolConfig = (name: string) => {
        switch (name) {
            case 'search_cities':
                return {
                    icon: (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                    ),
                    color: 'from-blue-500 to-cyan-500',
                    bgColor: 'bg-blue-50',
                    textColor: 'text-blue-700'
                };
            case 'search_tours_activities':
                return {
                    icon: (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    ),
                    color: 'from-purple-500 to-pink-500',
                    bgColor: 'bg-purple-50',
                    textColor: 'text-purple-700'
                };
            case 'search_hotels':
                return {
                    icon: (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                    ),
                    color: 'from-green-500 to-emerald-500',
                    bgColor: 'bg-green-50',
                    textColor: 'text-green-700'
                };
            case 'search_flights':
                return {
                    icon: (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                    ),
                    color: 'from-orange-500 to-red-500',
                    bgColor: 'bg-orange-50',
                    textColor: 'text-orange-700'
                };
            case 'search_airports':
            case 'get_destination_experiences':
                return {
                    icon: (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                        </svg>
                    ),
                    color: 'from-indigo-500 to-blue-500',
                    bgColor: 'bg-indigo-50',
                    textColor: 'text-indigo-700'
                };
            default:
                return {
                    icon: (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    ),
                    color: 'from-gray-500 to-slate-500',
                    bgColor: 'bg-gray-50',
                    textColor: 'text-gray-700'
                };
        }
    };

    const getToolLabel = (name: string) => {
        return name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    };

    const config = getToolConfig(toolName);

    return (
        <div className={`inline-flex items-center gap-2 px-4 py-2 ${config.bgColor} ${config.textColor} rounded-lg text-sm my-1 border border-current/20 shadow-sm hover:shadow-md transition-all duration-200`}>
            <div className={`p-1 rounded-md bg-gradient-to-br ${config.color} text-white`}>
                {config.icon}
            </div>
            <span className="font-semibold">{getToolLabel(toolName)}</span>
            {summary && (
                <span className="text-xs opacity-75 ml-1">• {summary}</span>
            )}
        </div>
    );
}
