import { streamTripPlannerWorkflow } from './trip-planner-graph';
import { TripPlannerState } from './trip-planner-state';

// ==================== SSE EVENT TYPES ====================

export type SSEEventType =
    | 'workflow_start'
    | 'orchestrator_complete'
    | 'search_start'
    | 'search_complete'
    | 'workflow_complete'
    | 'error';

export interface SSEEvent {
    type: SSEEventType;
    data: any;
    timestamp: string;
}

// ==================== EVENT DATA INTERFACES ====================

export interface OrchestratorCompleteData {
    estimatedBudget: {
        flightBudgetPerPerson: number;
        hotelBudgetPerNight: number;
        activityBudgetPerDay: number;
        totalEstimated: number;
    };
    criteria: {
        flightClass: string;
        maxStops: number;
        hotelStars: number;
        activityTypes: string[];
    };
}

export interface SearchStartData {
    searchType: 'flights' | 'hotels' | 'activities';
}

export interface SearchCompleteData {
    searchType: 'flights' | 'hotels' | 'activities';
    component: 'FlightList' | 'HotelList' | 'ActivityList';
    props: any;
    resultCount: number;
}

export interface WorkflowCompleteData {
    success: boolean;
    hasErrors: boolean;
    errors: string[];
}

export interface ErrorEventData {
    error: string;
    details?: any;
    node?: string;
}

// ==================== SSE EVENT GENERATOR ====================

/**
 * Converts workflow updates into SSE events
 * This is an async generator that yields formatted SSE events
 */
export async function* generateSSEEvents(
    input: Partial<TripPlannerState>
): AsyncIterableIterator<SSEEvent> {
    try {
        // Emit workflow start event
        yield createEvent('workflow_start', {
            threadId: input.threadId,
            formInput: input.formInput
        });

        // Track which searches have started/completed
        const searchesStarted = new Set<string>();

        // Stream the workflow
        for await (const update of streamTripPlannerWorkflow(input)) {
            const { node, state } = update;

            console.log(`📡 SSE Event from node: ${node}`, state);

            // Map node updates to SSE events
            switch (node) {
                case 'orchestrator':
                    if (state.orchestratorDecisions) {
                        const data: OrchestratorCompleteData = {
                            estimatedBudget: state.orchestratorDecisions.budget,
                            criteria: state.orchestratorDecisions.criteria
                        };
                        yield createEvent('orchestrator_complete', data);
                    }
                    break;

                case 'flight_search':
                    if (state.flightResults) {
                        // Emit search_start if not already started
                        if (!searchesStarted.has('flights')) {
                            yield createEvent('search_start', { searchType: 'flights' });
                            searchesStarted.add('flights');
                        }

                        // Emit search_complete if finished
                        if (state.flightResults.status === 'completed') {
                            const data: SearchCompleteData = {
                                searchType: 'flights',
                                component: 'FlightList',
                                props: { flights: state.flightResults.data || [] },
                                resultCount: state.flightResults.data?.length || 0
                            };
                            yield createEvent('search_complete', data);
                        } else if (state.flightResults.status === 'error') {
                            yield createEvent('error', {
                                error: state.flightResults.error || 'Flight search failed',
                                node: 'flight_search'
                            });
                        }
                    }
                    break;

                case 'hotel_search':
                    if (state.hotelResults) {
                        if (!searchesStarted.has('hotels')) {
                            yield createEvent('search_start', { searchType: 'hotels' });
                            searchesStarted.add('hotels');
                        }

                        if (state.hotelResults.status === 'completed') {
                            const data: SearchCompleteData = {
                                searchType: 'hotels',
                                component: 'HotelList',
                                props: { hotels: state.hotelResults.data || [] },
                                resultCount: state.hotelResults.data?.length || 0
                            };
                            yield createEvent('search_complete', data);
                        } else if (state.hotelResults.status === 'error') {
                            yield createEvent('error', {
                                error: state.hotelResults.error || 'Hotel search failed',
                                node: 'hotel_search'
                            });
                        }
                    }
                    break;

                case 'activity_search':
                    if (state.activityResults) {
                        if (!searchesStarted.has('activities')) {
                            yield createEvent('search_start', { searchType: 'activities' });
                            searchesStarted.add('activities');
                        }

                        if (state.activityResults.status === 'completed') {
                            const data: SearchCompleteData = {
                                searchType: 'activities',
                                component: 'ActivityList',
                                props: { activities: state.activityResults.data || [] },
                                resultCount: state.activityResults.data?.length || 0
                            };
                            yield createEvent('search_complete', data);
                        } else if (state.activityResults.status === 'error') {
                            yield createEvent('error', {
                                error: state.activityResults.error || 'Activity search failed',
                                node: 'activity_search'
                            });
                        }
                    }
                    break;

            }
        }

        // Emit workflow complete event
        yield createEvent('workflow_complete', {
            success: true,
            hasErrors: false,
            errors: []
        });

    } catch (error) {
        console.error('❌ SSE Event Generation Error:', error);

        yield createEvent('error', {
            error: error instanceof Error ? error.message : String(error),
            details: error
        });

        yield createEvent('workflow_complete', {
            success: false,
            hasErrors: true,
            errors: [error instanceof Error ? error.message : String(error)]
        });
    }
}

// ==================== SSE FORMATTING ====================

/**
 * Create a properly formatted SSE event
 */
function createEvent(type: SSEEventType, data: any): SSEEvent {
    return {
        type,
        data,
        timestamp: new Date().toISOString()
    };
}

/**
 * Format an SSE event for transmission
 * Follows SSE specification: data: {json}\n\n
 */
export function formatSSEEvent(event: SSEEvent): string {
    return `data: ${JSON.stringify(event)}\n\n`;
}

/**
 * Create SSE stream from async generator
 * This is used in API routes to create ReadableStream
 */
export async function createSSEStream(
    input: Partial<TripPlannerState>
): Promise<ReadableStream> {
    const encoder = new TextEncoder();

    return new ReadableStream({
        async start(controller) {
            try {
                // Generate and send events
                for await (const event of generateSSEEvents(input)) {
                    const formatted = formatSSEEvent(event);
                    controller.enqueue(encoder.encode(formatted));

                    // If workflow complete or error, close the stream
                    if (event.type === 'workflow_complete' || event.type === 'error') {
                        // Add a small delay before closing to ensure client receives event
                        await new Promise(resolve => setTimeout(resolve, 100));
                    }
                }

                // Close the stream
                controller.close();
            } catch (error) {
                console.error('Stream error:', error);

                // Send error event before closing
                const errorEvent = createEvent('error', {
                    error: error instanceof Error ? error.message : String(error)
                });
                controller.enqueue(encoder.encode(formatSSEEvent(errorEvent)));

                controller.close();
            }
        },

        cancel() {
            console.log('SSE stream cancelled by client');
        }
    });
}

// ==================== UTILITY FUNCTIONS ====================

/**
 * Parse SSE event string into event object
 * Used by frontend to decode events
 */
export function parseSSEEvent(eventString: string): SSEEvent | null {
    try {
        // Remove "data: " prefix if present
        const jsonString = eventString.replace(/^data:\s*/, '').trim();

        if (!jsonString) {
            return null;
        }

        return JSON.parse(jsonString) as SSEEvent;
    } catch (error) {
        console.error('Failed to parse SSE event:', error);
        return null;
    }
}

/**
 * Helper to track progress based on received events
 */
export function calculateProgress(events: SSEEvent[]): {
    orchestratorComplete: boolean;
    flightsComplete: boolean;
    hotelsComplete: boolean;
    activitiesComplete: boolean;
    percentComplete: number;
} {
    const progress = {
        orchestratorComplete: false,
        flightsComplete: false,
        hotelsComplete: false,
        activitiesComplete: false,
        percentComplete: 0
    };

    for (const event of events) {
        switch (event.type) {
            case 'orchestrator_complete':
                progress.orchestratorComplete = true;
                break;
            case 'search_complete':
                const searchType = (event.data as SearchCompleteData).searchType;
                if (searchType === 'flights') progress.flightsComplete = true;
                if (searchType === 'hotels') progress.hotelsComplete = true;
                if (searchType === 'activities') progress.activitiesComplete = true;
                break;
        }
    }

    // Calculate percentage (4 steps: orchestrator + 3 searches)
    const steps = [
        progress.orchestratorComplete,
        progress.flightsComplete,
        progress.hotelsComplete,
        progress.activitiesComplete
    ];

    const completedSteps = steps.filter(Boolean).length;
    progress.percentComplete = Math.round((completedSteps / steps.length) * 100);

    return progress;
}
