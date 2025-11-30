'use client';

import { useState, useCallback, useRef } from 'react';
import type {
    SSEEvent,
    OrchestratorCompleteData,
    SearchCompleteData,
    WorkflowCompleteData
} from '@/ai/workflow/trip-planner-streaming';

// ==================== TYPES ====================

export interface TripFormInput {
    numPeople: number;
    departureCity: string;
    arrivalCity: string;
    departureDate: string;
    stayDuration: number;
    budgetCategory?: 'economy' | 'standard' | 'premium';
    numRooms?: number;
    userId: string;
}

export interface TripPlannerProgress {
    // Completion flags
    orchestratorComplete: boolean;
    flightsComplete: boolean;
    hotelsComplete: boolean;
    activitiesComplete: boolean;

    // Input data (for saving)
    formInput: TripFormInput | null;
    threadId: string | null;

    // Data from each stage
    estimatedBudget: OrchestratorCompleteData['estimatedBudget'] | null;
    criteria: OrchestratorCompleteData['criteria'] | null;
    flightResults: any[] | null;
    hotelResults: any[] | null;
    activityResults: any[] | null;

    // Progress tracking
    percentComplete: number;
    currentStep: string;
}

export interface UseTripPlannerStreamReturn {
    // State
    isPlanning: boolean;
    progress: TripPlannerProgress;
    error: string | null;
    allComplete: boolean;

    // Actions
    startPlanning: (formInput: TripFormInput) => Promise<void>;
    resetPlanning: () => void;
}

// ==================== INITIAL STATE ====================

const initialProgress: TripPlannerProgress = {
    orchestratorComplete: false,
    flightsComplete: false,
    hotelsComplete: false,
    activitiesComplete: false,
    formInput: null,
    threadId: null,
    estimatedBudget: null,
    criteria: null,
    flightResults: null,
    hotelResults: null,
    activityResults: null,
    percentComplete: 0,
    currentStep: 'waiting'
};

// ==================== HOOK ====================

export function useTripPlannerStream(): UseTripPlannerStreamReturn {
    const [isPlanning, setIsPlanning] = useState(false);
    const [progress, setProgress] = useState<TripPlannerProgress>(initialProgress);
    const [error, setError] = useState<string | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    // Calculate if all steps are complete (no auto_save - user saves manually)
    const allComplete =
        progress.orchestratorComplete &&
        progress.flightsComplete &&
        progress.hotelsComplete &&
        progress.activitiesComplete;

    /**
     * Start the trip planning workflow
     */
    const startPlanning = useCallback(async (formInput: TripFormInput) => {
        // Generate a unique thread ID for this planning session
        const threadId = `trip-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

        // Reset state and store formInput + threadId for later saving
        setIsPlanning(true);
        setProgress({
            ...initialProgress,
            formInput,
            threadId,
            currentStep: 'Starting...'
        });
        setError(null);

        // Create abort controller for cleanup
        abortControllerRef.current = new AbortController();

        try {
            // POST to API endpoint
            const response = await fetch('/api/trips/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ ...formInput, threadId }),
                signal: abortControllerRef.current.signal
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to start trip planning');
            }

            // Check if response is SSE
            if (!response.body) {
                throw new Error('No response body');
            }

            // Read SSE stream
            await consumeSSEStream(response.body, (event) => {
                handleSSEEvent(event, setProgress, setError, setIsPlanning);
            });

        } catch (err) {
            // Ignore abort errors
            if (err instanceof Error && err.name === 'AbortError') {
                console.log('Trip planning aborted');
                return;
            }

            console.error('Error starting trip planning:', err);
            setError(err instanceof Error ? err.message : String(err));
            setIsPlanning(false);
        }
    }, []);

    /**
     * Reset the planning state
     */
    const resetPlanning = useCallback(() => {
        // Abort ongoing request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }

        setIsPlanning(false);
        setProgress(initialProgress);
        setError(null);
    }, []);

    return {
        isPlanning,
        progress,
        error,
        allComplete,
        startPlanning,
        resetPlanning
    };
}

// ==================== SSE STREAM CONSUMPTION ====================

/**
 * Consume SSE stream and parse events
 */
async function consumeSSEStream(
    body: ReadableStream<Uint8Array>,
    onEvent: (event: SSEEvent) => void
): Promise<void> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
        while (true) {
            const { done, value } = await reader.read();

            if (done) {
                break;
            }

            // Decode chunk
            buffer += decoder.decode(value, { stream: true });

            // Split by double newline (SSE event boundary)
            const lines = buffer.split('\n\n');

            // Keep last incomplete line in buffer
            buffer = lines.pop() || '';

            // Process complete events
            for (const line of lines) {
                if (!line.trim()) continue;

                // Parse SSE event
                const event = parseSSELine(line);
                if (event) {
                    onEvent(event);
                }
            }
        }
    } finally {
        reader.releaseLock();
    }
}

/**
 * Parse SSE line into event object
 */
function parseSSELine(line: string): SSEEvent | null {
    try {
        // Remove "data: " prefix
        const jsonString = line.replace(/^data:\s*/, '').trim();

        if (!jsonString) {
            return null;
        }

        return JSON.parse(jsonString) as SSEEvent;
    } catch (error) {
        console.error('Failed to parse SSE event:', error);
        return null;
    }
}

// ==================== EVENT HANDLERS ====================

/**
 * Handle incoming SSE event and update progress
 */
function handleSSEEvent(
    event: SSEEvent,
    setProgress: React.Dispatch<React.SetStateAction<TripPlannerProgress>>,
    setError: React.Dispatch<React.SetStateAction<string | null>>,
    setIsPlanning: React.Dispatch<React.SetStateAction<boolean>>
): void {
    console.log('📨 Received SSE event:', event.type, event.data);

    switch (event.type) {
        case 'workflow_start':
            setProgress(prev => ({
                ...prev,
                currentStep: 'Starting workflow...'
            }));
            break;

        case 'orchestrator_complete':
            const orchestratorData = event.data as OrchestratorCompleteData;
            setProgress(prev => ({
                ...prev,
                orchestratorComplete: true,
                estimatedBudget: orchestratorData.estimatedBudget,
                criteria: orchestratorData.criteria,
                percentComplete: 20,
                currentStep: 'Searching for flights, hotels, and activities...'
            }));
            break;

        case 'search_start':
            // Optional: Update current step to show which search is starting
            const searchType = event.data.searchType;
            setProgress(prev => ({
                ...prev,
                currentStep: `Searching for ${searchType}...`
            }));
            break;

        case 'search_complete':
            const searchData = event.data as SearchCompleteData;
            setProgress(prev => {
                const updates: Partial<TripPlannerProgress> = {};

                // Safely access props with optional chaining
                const props = searchData.props || {};

                if (searchData.searchType === 'flights') {
                    updates.flightsComplete = true;
                    updates.flightResults = props.flights || [];
                } else if (searchData.searchType === 'hotels') {
                    updates.hotelsComplete = true;
                    updates.hotelResults = props.hotels || [];
                } else if (searchData.searchType === 'activities') {
                    updates.activitiesComplete = true;
                    updates.activityResults = props.activities || [];
                }

                // Calculate new percentage
                const completedSearches = [
                    prev.flightsComplete || searchData.searchType === 'flights',
                    prev.hotelsComplete || searchData.searchType === 'hotels',
                    prev.activitiesComplete || searchData.searchType === 'activities'
                ].filter(Boolean).length;

                updates.percentComplete = 20 + (completedSearches * 26); // 20-98%

                // Mark as complete when all searches done
                if (completedSearches === 3) {
                    updates.percentComplete = 100;
                    updates.currentStep = 'Search complete! Review your results.';
                }

                return { ...prev, ...updates };
            });
            break;

        case 'workflow_complete':
            const completeData = event.data as WorkflowCompleteData;
            setProgress(prev => ({
                ...prev,
                percentComplete: 100,
                currentStep: completeData.success ? 'Complete!' : 'Completed with errors'
            }));

            if (completeData.hasErrors && completeData.errors.length > 0) {
                setError(completeData.errors.join(', '));
            }

            setIsPlanning(false);
            break;

        case 'error':
            const errorData = event.data;
            setError(errorData.error || 'An error occurred');
            setIsPlanning(false);
            break;
    }
}
