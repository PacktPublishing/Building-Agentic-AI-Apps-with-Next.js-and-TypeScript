/**
 * Multi-Query Retriever
 *
 * Generates multiple query variations and searches in parallel,
 * then fuses results using RRF for better recall.
 */

import { ChatAnthropic } from '@langchain/anthropic';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { config } from '@/config';
import type { IHybridSearchService } from '@/lib/domain/search/hybrid-search.interface';
import type { HybridSearchResult, HybridSearchOptions } from '@/lib/domain/search/types';
import { fuseWithRRF } from '@/lib/infrastructure/search/rrf';
import type { RankedItem } from '@/lib/domain/search/types';

/**
 * Multi-query result
 */
export interface MultiQueryResult {
  /** Original query */
  originalQuery: string;
  /** Generated query variations */
  queryVariations: string[];
  /** Fused search results */
  results: HybridSearchResult[];
  /** Results per query variation (for analysis) */
  resultsByQuery: Map<string, HybridSearchResult[]>;
}

const MULTI_QUERY_SYSTEM_PROMPT = `You are a search query generator for a travel database.
Given a user's travel search query, generate 3 alternative versions that capture
the same intent but use different words or phrasings.

Guidelines:
1. Each variation should search for the same thing but use synonyms or rephrasings
2. Consider different aspects the user might be interested in
3. Keep the same constraints (destination, budget, etc.) if mentioned
4. Vary the level of specificity
5. Use natural search language

Output exactly 3 variations, one per line, with no numbering or bullets.`;

/**
 * Multi-Query Retriever Configuration
 */
interface MultiQueryConfig {
  /** Model for query generation */
  model?: string;
  /** Number of query variations to generate */
  numVariations?: number;
  /** Number of results per query */
  resultsPerQuery?: number;
}

/**
 * Multi-Query Retriever
 *
 * Improves recall by searching with multiple query variations.
 * Different phrasings can match different documents, and RRF
 * fusion combines the results intelligently.
 */
export class MultiQueryRetriever {
  private llm: ChatAnthropic;
  private searchService: IHybridSearchService;
  private numVariations: number;
  private resultsPerQuery: number;

  constructor(
    searchService: IHybridSearchService,
    multiQueryConfig: MultiQueryConfig = {}
  ) {
    this.llm = new ChatAnthropic({
      modelName: multiQueryConfig.model || 'claude-3-haiku-20240307',
      temperature: 0.5, // Some creativity for variations
      anthropicApiKey: config.anthropic_api_key,
    });
    this.searchService = searchService;
    this.numVariations = multiQueryConfig.numVariations ?? 3;
    this.resultsPerQuery = multiQueryConfig.resultsPerQuery ?? 10;
  }

  /**
   * Search with multiple query variations
   */
  async retrieve(
    query: string,
    options?: HybridSearchOptions
  ): Promise<MultiQueryResult> {
    console.log(`🔄 MultiQueryRetriever: Generating variations for "${query}"`);

    try {
      // Step 1: Generate query variations
      const variations = await this.generateVariations(query);
      const allQueries = [query, ...variations];

      console.log(`📝 Generated ${variations.length} variations`);

      // Step 2: Search in parallel
      const searchPromises = allQueries.map((q) =>
        this.searchService.search(q, {
          ...options,
          limit: this.resultsPerQuery,
        })
      );

      const searchResults = await Promise.all(searchPromises);

      // Step 3: Build results map
      const resultsByQuery = new Map<string, HybridSearchResult[]>();
      allQueries.forEach((q, i) => {
        resultsByQuery.set(q, searchResults[i]);
      });

      // Step 4: Fuse results using RRF
      const rankedLists: RankedItem[][] = searchResults.map((results, queryIndex) =>
        results.map((result, rank) => ({
          id: result.id,
          rank: rank + 1,
          score: result.score,
          payload: result.payload,
          source: 'semantic' as const, // All from hybrid search
        }))
      );

      const fusedResults = fuseWithRRF(rankedLists, { k: 60 });

      console.log(
        `✅ MultiQueryRetriever: ${fusedResults.length} unique results from ${allQueries.length} queries`
      );

      return {
        originalQuery: query,
        queryVariations: variations,
        results: fusedResults.slice(0, options?.limit || 10),
        resultsByQuery,
      };
    } catch (error) {
      console.error('❌ MultiQueryRetriever: Retrieval failed', error);
      // Fallback to single query search
      const results = await this.searchService.search(query, options);
      return {
        originalQuery: query,
        queryVariations: [],
        results,
        resultsByQuery: new Map([[query, results]]),
      };
    }
  }

  /**
   * Generate query variations using LLM
   */
  private async generateVariations(query: string): Promise<string[]> {
    try {
      const response = await this.llm.invoke([
        new SystemMessage(MULTI_QUERY_SYSTEM_PROMPT),
        new HumanMessage(
          `Generate ${this.numVariations} alternative search queries for:\n\n"${query}"`
        ),
      ]);

      const content =
        typeof response.content === 'string' ? response.content : '';

      // Parse variations (one per line)
      const variations = content
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0 && line !== query)
        .slice(0, this.numVariations);

      return variations;
    } catch (error) {
      console.error('❌ MultiQueryRetriever: Variation generation failed', error);
      return [];
    }
  }

  /**
   * Generate variations without searching (for testing/preview)
   */
  async previewVariations(query: string): Promise<string[]> {
    return this.generateVariations(query);
  }
}
