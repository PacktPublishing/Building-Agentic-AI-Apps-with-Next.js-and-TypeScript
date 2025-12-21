/**
 * Application Layer - Hybrid Search Trips Use Case
 *
 * Clean Architecture: Use Case orchestrates hybrid search
 * combining lexical (BM25) and semantic (vector) search
 */

import type { IHybridSearchService } from '@/lib/domain/search/hybrid-search.interface';
import type { HybridSearchOptions, HybridSearchResult } from '@/lib/domain/search/types';
import type { RetrievalResult } from '@/lib/domain/retrieval/service';

/**
 * Extended retrieval result with hybrid search details
 */
export interface HybridRetrievalResult extends RetrievalResult {
  /** Detailed scores from hybrid search */
  hybridScores: {
    semantic: number;
    lexical: number;
    rrf: number;
  };
}

/**
 * Hybrid Search Trips Use Case
 *
 * Orchestrates hybrid search and transforms results
 * into domain-friendly format.
 */
export class HybridSearchTripsUseCase {
  constructor(private hybridSearchService: IHybridSearchService) {}

  /**
   * Search trips using hybrid search
   *
   * @param query - Natural language search query
   * @param options - Search options
   * @returns Enriched retrieval results
   */
  async searchTrips(
    query: string,
    options?: HybridSearchOptions
  ): Promise<HybridRetrievalResult[]> {
    console.log(`🔍 HybridSearchTripsUseCase: Searching for "${query}"`);

    try {
      // Perform hybrid search
      const hybridResults = await this.hybridSearchService.search(query, options);

      console.log(`✅ Found ${hybridResults.length} results via hybrid search`);

      // Transform to domain result format
      return this.transformResults(hybridResults);
    } catch (error) {
      console.error('❌ HybridSearchTripsUseCase: Search failed', error);
      throw error;
    }
  }

  /**
   * Ensure the search index is ready
   */
  async ensureIndexReady(): Promise<void> {
    await this.hybridSearchService.rebuildIndex();
  }

  /**
   * Transform hybrid search results to retrieval results
   */
  private transformResults(results: HybridSearchResult[]): HybridRetrievalResult[] {
    return results.map((result) => ({
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
      hybridScores: {
        semantic: result.scores.semantic,
        lexical: result.scores.lexical,
        rrf: result.scores.rrf,
      },
    }));
  }
}
