/**
 * Application Layer - Search Trips Use Case
 *
 * Clean Architecture: Use Case orchestrates semantic search
 */

import type { IVectorRepository, VectorSearchFilter } from '@/lib/domain/vector/repository';
import type { IEmbeddingsService } from '@/lib/domain/embeddings/service';
import type {
  IRetrievalService,
  SemanticSearchQuery,
  RetrievalResult,
} from '@/lib/domain/retrieval/service';

/**
 * Search Trips Use Case
 *
 * Orchestrates:
 * 1. Generate embedding from natural language query
 * 2. Search Qdrant for similar trips
 * 3. Return enriched results
 */
export class SearchTripsUseCase implements IRetrievalService {
  constructor(
    private vectorRepository: IVectorRepository,
    private embeddingsService: IEmbeddingsService
  ) {}

  async searchTrips(query: SemanticSearchQuery): Promise<RetrievalResult[]> {
    console.log(`🔍 SearchTripsUseCase: Searching for "${query.query}"`);

    try {
      // Step 1: Generate embedding from query
      console.log('1️⃣ Generating query embedding...');
      const queryEmbedding = await this.embeddingsService.generate(query.query);

      // Step 2: Build search filter (all fields optional)
      const filter: VectorSearchFilter = {
        user_id: query.userId, // Optional - searches all trips if not provided
        destination: query.filters?.destination,
        budget_category: query.filters?.budgetCategory,
      };

      // Step 3: Search Qdrant
      console.log('2️⃣ Searching vector database...');
      const searchResults = await this.vectorRepository.search(
        queryEmbedding,
        filter,
        query.limit || 5
      );

      console.log(`✅ Found ${searchResults.length} results`);

      // Step 4: Transform to RetrievalResult
      return searchResults.map((result) => ({
        tripId: result.payload.trip_id,
        title: result.payload.title,
        destination: result.payload.destination,
        departureCity: result.payload.departure_city,
        departureDate: result.payload.departure_date,
        stayDuration: result.payload.stay_duration,
        numPeople: result.payload.num_people,
        budgetCategory: result.payload.budget_category,
        totalBudget: result.payload.total_budget,
        summaryText: result.payload.summary_text,
        relevanceScore: result.score,
        createdAt: result.payload.created_at,
      }));
    } catch (error) {
      console.error('❌ SearchTripsUseCase: Search failed', error);
      throw error;
    }
  }

  async findSimilarTrips(
    tripId: string,
    userId: string,
    limit: number = 3
  ): Promise<RetrievalResult[]> {
    console.log(`🔍 Finding trips similar to: ${tripId}`);

    try {
      // Step 1: Get the source trip's vector from Qdrant
      console.log('1️⃣ Retrieving source trip vector...');
      const sourcePoint = await this.vectorRepository.getById(tripId);

      if (!sourcePoint) {
        console.warn(`⚠️ Trip ${tripId} not found in vector database`);
        return [];
      }

      // Step 2: Search for similar trips using the source vector
      console.log('2️⃣ Searching for similar trips...');
      const filter = { user_id: userId };
      
      // Request one extra to exclude the source trip
      const searchResults = await this.vectorRepository.search(
        sourcePoint.vector,
        filter,
        limit + 1
      );

      // Step 3: Filter out the source trip and transform results
      const similarTrips = searchResults
        .filter((result) => result.id !== tripId)
        .slice(0, limit)
        .map((result) => ({
          tripId: result.payload.trip_id,
          title: result.payload.title,
          destination: result.payload.destination,
          departureCity: result.payload.departure_city,
          departureDate: result.payload.departure_date,
          stayDuration: result.payload.stay_duration,
          numPeople: result.payload.num_people,
          budgetCategory: result.payload.budget_category,
          totalBudget: result.payload.total_budget,
          summaryText: result.payload.summary_text,
          relevanceScore: result.score,
          createdAt: result.payload.created_at,
        }));

      console.log(`✅ Found ${similarTrips.length} similar trips`);
      return similarTrips;
    } catch (error) {
      console.error('❌ FindSimilarTrips failed', error);
      throw error;
    }
  }
}
