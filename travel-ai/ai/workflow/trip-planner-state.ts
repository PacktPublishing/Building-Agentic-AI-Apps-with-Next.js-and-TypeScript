import { Annotation } from "@langchain/langgraph";

// ==================== INPUT TYPES ====================

/**
 * Budget category types
 */
export type BudgetCategory = 'economy' | 'standard' | 'premium';

/**
 * Trip form input from the user
 */
export interface TripFormInput {
    numPeople: number;
    departureCity: string;  // City name or IATA code (e.g., "Paris" or "PAR")
    arrivalCity: string;    // City name or IATA code (e.g., "New York" or "NYC")
    departureDate: string;  // ISO date string
    stayDuration: number;   // Days
    budgetCategory: BudgetCategory;  // User-selected budget level
    numRooms: number;       // Number of hotel rooms needed
    userId: string;
}

// ==================== ORCHESTRATOR TYPES ====================

/**
 * Budget breakdown per category
 */
export interface BudgetBreakdown {
    flightBudgetPerPerson: number;
    hotelBudgetPerNight: number;
    activityBudgetPerDay: number;
    totalEstimated: number;
}

/**
 * Search criteria determined by orchestrator
 */
export interface SearchCriteria {
    flightClass: 'economy' | 'premium_economy' | 'business';
    maxStops: number;
    hotelStars: number;  // 3, 4, or 5
    activityTypes: string[];  // e.g., ["cultural", "outdoor", "food"]
}

/**
 * Decisions made by orchestrator node
 */
export interface OrchestratorDecisions {
    budget: BudgetBreakdown;
    criteria: SearchCriteria;
    analysisComplete: boolean;
}

// ==================== SEARCH RESULT TYPES ====================

export type SearchStatus = 'pending' | 'searching' | 'completed' | 'error';

/**
 * Generic search result structure
 */
export interface SearchResult<T> {
    status: SearchStatus;
    data: T[] | null;
    error: string | null;
}

/**
 * Flight search results
 */
export interface FlightSearchResult extends SearchResult<any> {
    searchType: 'flights';
}

/**
 * Hotel search results
 */
export interface HotelSearchResult extends SearchResult<any> {
    searchType: 'hotels';
}

/**
 * Activity search results
 */
export interface ActivitySearchResult extends SearchResult<any> {
    searchType: 'activities';
}

// ==================== STATE DEFINITION ====================

/**
 * Complete workflow state using Annotation.Root
 * This is the single source of truth for the entire workflow
 */
export const TripPlannerStateAnnotation = Annotation.Root({
    // Input from user
    formInput: Annotation<TripFormInput | null>({
        reducer: (prev, next) => next ?? prev,
        default: () => null
    }),

    // Orchestrator decisions
    orchestratorDecisions: Annotation<OrchestratorDecisions | null>({
        reducer: (prev, next) => next ?? prev,
        default: () => null
    }),

    // Search results
    flightResults: Annotation<FlightSearchResult>({
        reducer: (prev, next) => ({ ...prev, ...next }),
        default: () => ({
            searchType: 'flights' as const,
            status: 'pending' as SearchStatus,
            data: null,
            error: null
        })
    }),

    hotelResults: Annotation<HotelSearchResult>({
        reducer: (prev, next) => ({ ...prev, ...next }),
        default: () => ({
            searchType: 'hotels' as const,
            status: 'pending' as SearchStatus,
            data: null,
            error: null
        })
    }),

    activityResults: Annotation<ActivitySearchResult>({
        reducer: (prev, next) => ({ ...prev, ...next }),
        default: () => ({
            searchType: 'activities' as const,
            status: 'pending' as SearchStatus,
            data: null,
            error: null
        })
    }),

    // Persistence
    tripId: Annotation<string | null>({
        reducer: (prev, next) => next ?? prev,
        default: () => null
    }),

    threadId: Annotation<string>({
        reducer: (prev, next) => next ?? prev,
        default: () => ''
    }),

    // Error tracking
    errors: Annotation<string[]>({
        reducer: (prev, next) => [...prev, ...next],
        default: () => []
    }),

    // Control flow
    nextStep: Annotation<string>({
        reducer: (prev, next) => next ?? prev,
        default: () => 'orchestrator'
    })
});

/**
 * Type alias for the state
 */
export type TripPlannerState = typeof TripPlannerStateAnnotation.State;

// ==================== HELPER FUNCTIONS ====================

/**
 * Calculate return date from departure + duration
 */
export function calculateReturnDate(departureDate: string, stayDuration: number): string {
    const date = new Date(departureDate);
    date.setDate(date.getDate() + stayDuration);
    return date.toISOString().split('T')[0];
}

/**
 * Format city code to full uppercase
 */
export function formatCityCode(code: string): string {
    return code.trim().toUpperCase();
}

/**
 * Validate IATA code format (3 letters)
 */
export function isValidIATACode(code: string): boolean {
    return /^[A-Z]{3}$/.test(code.toUpperCase());
}

/**
 * Create initial state from form input
 */
export function createInitialState(
    formInput: TripFormInput,
    threadId: string
): Partial<TripPlannerState> {
    return {
        formInput,
        threadId,
        nextStep: 'orchestrator',
        errors: []
    };
}
