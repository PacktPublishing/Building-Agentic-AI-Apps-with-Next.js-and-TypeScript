'use client';

import { SSEEvent } from '../api/chat/types';
import { ThinkingIndicator } from './ThinkingIndicator';
import { ToolCallBadge } from './ToolCallBadge';
import { ActivityList } from './ActivityList';
import { FlightList } from './FlightList';
import { HotelList } from './HotelList';

interface MessageRendererProps {
    events: SSEEvent[];
}

export function MessageRenderer({ events }: MessageRendererProps) {
    return (
        <div className="space-y-2 font-[family-name:var(--font-inter)]">
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
                        // Don't show tool results with errors (they're handled by error event)
                        if (event.data.result?.success === false) {
                            return null;
                        }
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
                        if (event.data.component === 'FlightList') {
                            return (
                                <FlightList
                                    key={`flight-list-${index}`}
                                    flights={event.data.props.flights}
                                />
                            );
                        }
                        if (event.data.component === 'HotelList') {
                            return (
                                <HotelList
                                    key={`hotel-list-${index}`}
                                    hotels={event.data.props.hotels}
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
