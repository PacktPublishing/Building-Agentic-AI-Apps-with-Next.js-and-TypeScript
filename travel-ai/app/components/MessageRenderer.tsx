'use client';

import { SSEEvent } from '../api/chat/types';
import { ThinkingIndicator } from './ThinkingIndicator';
import { ToolCallBadge } from './ToolCallBadge';
import { ActivityList } from './ActivityList';

interface MessageRendererProps {
    events: SSEEvent[];
}

export function MessageRenderer({ events }: MessageRendererProps) {
    return (
        <div className="space-y-2">
            {events.map((event, index) => {
                switch (event.type) {
                    case 'thinking':
                        return (
                            <ThinkingIndicator
                                key={`thinking-${index}`}
                                content={event.data.content}
                            />
                        );

                    case 'tool_call_start':
                        return (
                            <ToolCallBadge
                                key={`tool-call-${index}`}
                                toolName={event.data.toolName}
                                args={event.data.args}
                            />
                        );

                    case 'tool_result':
                        return (
                            <ToolCallBadge
                                key={`tool-result-${index}`}
                                toolName={event.data.toolName}
                                summary={event.data.summary}
                            />
                        );

                    case 'ui_component':
                        if (event.data.component === 'ActivityList') {
                            return (
                                <ActivityList
                                    key={`activity-list-${index}`}
                                    activities={event.data.props.activities}
                                    totalAvailable={event.data.props.totalAvailable}
                                />
                            );
                        }
                        return null;

                    case 'error':
                        return (
                            <div
                                key={`error-${index}`}
                                className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800"
                            >
                                <strong>Error:</strong> {event.data.error}
                                {event.data.details && (
                                    <div className="text-sm mt-1 text-red-600">
                                        {event.data.details}
                                    </div>
                                )}
                            </div>
                        );

                    default:
                        return null;
                }
            })}
        </div>
    );
}
