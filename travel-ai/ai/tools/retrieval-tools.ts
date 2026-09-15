/**
 * Retrieval Tools
 * 
 * Semantic search tools for trip discovery and recommendations
 */

import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { SearchTripsUseCase } from "@/lib/application/use-cases/search-trips.use-case";
import { QdrantVectorRepository } from "@/lib/infrastructure/qdrant/vector-repository";
import { OpenAIEmbeddingsService } from "@/lib/infrastructure/embeddings/openai-service";

// Lazy initialization of the search use case
let searchTripsUseCaseInstance: SearchTripsUseCase | null = null;

export interface RetrievalAuthContext {
    userId: string;
    scope?: 'private' | 'public';
}

function getSearchTripsUseCase(): SearchTripsUseCase {
    if (!searchTripsUseCaseInstance) {
        const vectorRepository = new QdrantVectorRepository();
        const embeddingsService = new OpenAIEmbeddingsService();
        searchTripsUseCaseInstance = new SearchTripsUseCase(vectorRepository, embeddingsService);
    }
    return searchTripsUseCaseInstance;
}

/**
 * Semantic search tool - search trips using natural language
 */
export const searchTripsTool = new DynamicStructuredTool({
    name: "search_trips",
    description: "Search through all saved trips using natural language. Use this to find trip inspiration, discover destinations, or find trips matching specific criteria. Searches across ALL trips in the database for maximum discovery.",
    schema: z.object({
        query: z.string().describe("Natural language search query (e.g., 'beach vacation in Europe', 'budget trip to Asia', 'week-long city break', 'romantic getaway')"),
        scope: z.enum(['private', 'public']).default('private').describe('Search scope. Private requires a verified userId; public is reserved for the explicit public catalogue.'),
        userId: z.string().optional().describe("Ignored for authorization; use createSearchTripsTool with a verified server context"),
        destination: z.string().optional().describe("Optional: filter by specific destination (IATA code like 'CDG', 'DUB')"),
        budgetCategory: z.enum(['economy', 'standard', 'premium']).optional().describe("Optional: filter by budget category"),
        limit: z.number().optional().default(5).describe("Maximum number of results to return (default: 5)"),
    }),
    func: async ({ query, scope, destination, budgetCategory, limit }) => {
        try {
            const searchUseCase = getSearchTripsUseCase();
            if (scope !== 'public') throw new Error('Verified authentication context required');
            const results = await searchUseCase.searchTrips({
                query,
                scope,
                filters: { destination, budgetCategory },
                limit,
            });
            return JSON.stringify({
                success: true,
                count: results.length,
                trips: results.map(r => ({
                    tripId: r.tripId,
                    title: r.title,
                    destination: r.destination,
                    departureCity: r.departureCity,
                    departureDate: r.departureDate,
                    stayDuration: r.stayDuration,
                    budget: r.totalBudget,
                    budgetCategory: r.budgetCategory,
                    relevanceScore: r.relevanceScore,
                    summary: r.summaryText,
                })),
            });
        } catch (error) {
            return JSON.stringify({
                success: false,
                error: 'Search failed',
            });
        }
    }
});

/** Build a private search tool with identity captured from a verified session. */
export function createSearchTripsTool(context: RetrievalAuthContext): DynamicStructuredTool {
    return new DynamicStructuredTool({
        name: 'search_private_trips',
        description: 'Search the authenticated user’s private trips.',
        schema: z.object({
            query: z.string(),
            destination: z.string().optional(),
            budgetCategory: z.enum(['economy', 'standard', 'premium']).optional(),
            limit: z.number().int().positive().max(100).default(5),
        }),
        func: async ({ query, destination, budgetCategory, limit }) => {
            const results = await getSearchTripsUseCase().searchTrips({
                query, userId: context.userId, scope: context.scope ?? 'private',
                filters: { destination, budgetCategory }, limit,
            });
            return JSON.stringify({ success: true, count: results.length, trips: results });
        },
    });
}

/** Session-bound variant: identity is resolved per invocation on the server. */
export function createSearchTripsToolFromSession(
    resolveSession: () => Promise<RetrievalAuthContext | null>,
): DynamicStructuredTool {
    return new DynamicStructuredTool({
        name: 'search_session_trips',
        description: 'Search trips using the currently authenticated server session.',
        schema: z.object({ query: z.string(), destination: z.string().optional(), budgetCategory: z.enum(['economy', 'standard', 'premium']).optional(), limit: z.number().int().positive().max(100).default(5) }),
        func: async ({ query, destination, budgetCategory, limit }) => {
            const context = await resolveSession();
            if (!context?.userId) return JSON.stringify({ success: false, error: 'Authentication required' });
            const results = await getSearchTripsUseCase().searchTrips({ query, userId: context.userId, scope: context.scope ?? 'private', filters: { destination, budgetCategory }, limit });
            return JSON.stringify({ success: true, count: results.length, trips: results });
        },
    });
}

/**
 * Find similar trips tool - find trips similar to a given trip
 */
export const findSimilarTripsTool = new DynamicStructuredTool({
    name: "find_similar_trips",
    description: "Find trips similar to a specific trip. Use this to recommend trips based on a trip the user liked or to find patterns in their travel history.",
    schema: z.object({
        tripId: z.string().describe("The ID of the trip to find similar trips for"),
        userId: z.string().describe("The user's ID"),
        limit: z.number().optional().default(3).describe("Maximum number of similar trips to return (default: 3)"),
    }),
    func: async ({ tripId, limit }) => {
        try {
            throw new Error('Verified authentication context required');
            /* istanbul ignore next */
            const results = await getSearchTripsUseCase().findSimilarTrips(tripId, '', limit);
            return JSON.stringify({
                success: true,
                sourceTripId: tripId,
                count: results.length,
                similarTrips: results.map(r => ({
                    tripId: r.tripId,
                    title: r.title,
                    destination: r.destination,
                    departureCity: r.departureCity,
                    departureDate: r.departureDate,
                    stayDuration: r.stayDuration,
                    budget: r.totalBudget,
                    similarityScore: r.relevanceScore,
                    summary: r.summaryText,
                })),
            });
        } catch (error) {
            return JSON.stringify({
                success: false,
                error: 'Unable to find similar trips',
            });
        }
    }
});

export function createFindSimilarTripsTool(context: RetrievalAuthContext): DynamicStructuredTool {
    return new DynamicStructuredTool({
        name: 'find_similar_private_trips',
        description: 'Find trips similar to a trip owned by the authenticated user.',
        schema: z.object({ tripId: z.string(), limit: z.number().int().positive().max(100).default(3) }),
        func: async ({ tripId, limit }) => JSON.stringify({
            success: true,
            sourceTripId: tripId,
            similarTrips: await getSearchTripsUseCase().findSimilarTrips(tripId, context.userId, limit),
        }),
    });
}
