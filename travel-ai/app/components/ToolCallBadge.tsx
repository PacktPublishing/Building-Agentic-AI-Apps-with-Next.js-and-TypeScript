'use client';

interface ToolCallBadgeProps {
    toolName: string;
    args?: Record<string, any>;
    result?: any;
    summary?: string;
}

export function ToolCallBadge({ toolName, args, result, summary }: ToolCallBadgeProps) {
    const getToolIcon = (name: string) => {
        switch (name) {
            case 'search_cities':
                return '🏙️';
            case 'search_tours_activities':
                return '🎭';
            case 'search_hotels':
                return '🏨';
            case 'search_flights':
                return '✈️';
            default:
                return '🔧';
        }
    };

    const getToolLabel = (name: string) => {
        return name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    };

    return (
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-800 rounded-full text-sm my-1">
            <span>{getToolIcon(toolName)}</span>
            <span className="font-medium">{getToolLabel(toolName)}</span>
            {summary && (
                <span className="text-blue-600 text-xs">• {summary}</span>
            )}
        </div>
    );
}
