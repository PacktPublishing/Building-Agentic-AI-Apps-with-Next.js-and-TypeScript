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
        userId: z.string().optional().describe("Optional: filter to only this user's trips"),
        destination: z.string().optional().describe("Optional: filter by specific destination (IATA code like 'CDG', 'DUB')"),
        budgetCategory: z.enum(['economy', 'standard', 'premium']).optional().describe("Optional: filter by budget category"),
        limit: z.number().optional().default(5).describe("Maximum number of results to return (default: 5)"),
    }),
    func: async ({ query, userId, destination, budgetCategory, limit }) => {
        try {
            const searchUseCase = getSearchTripsUseCase();
            const results = await searchUseCase.searchTrips({
                query,
                userId,
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
                error: error instanceof Error ? error.message : 'Search failed',
            });
        }
    }
});

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
    func: async ({ tripId, userId, limit }) => {
        try {
            const searchUseCase = getSearchTripsUseCase();
            const results = await searchUseCase.findSimilarTrips(tripId, userId, limit);
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
                error: error instanceof Error ? error.message : 'Failed to find similar trips',
            });
        }
    }
});
