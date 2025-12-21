/**
 * Infrastructure Layer - Hybrid Search Service
 *
 * Combines BM25 lexical search with vector semantic search
 * using Reciprocal Rank Fusion (RRF) for optimal results.
 */

import type { IHybridSearchService } from '@/lib/domain/search/hybrid-search.interface';
import type {
  HybridSearchOptions,
  HybridSearchResult,
  RankedItem,
} from '@/lib/domain/search/types';
import type {
  IVectorRepository,
  TripVectorPayload,
  VectorSearchFilter,
} from '@/lib/domain/vector/repository';
import type { IEmbeddingsService } from '@/lib/domain/embeddings/service';

import { BM25Index } from './bm25-index';
import { fuseWithRRF, normalizeBM25Scores } from './rrf';

/**
 * Default configuration
 */
const DEFAULT_OPTIONS: Required<Omit<HybridSearchOptions, 'filters'>> = {
  alpha: 0.7, // 70% semantic, 30% lexical
  limit: 10,
  rrfConfig: { k: 60 },
};

/**
 * Hybrid Search Service Implementation
 *
 * Combines:
 * - BM25 (lexical): Exact keyword matching, good for specific terms
 * - Vector (semantic): Meaning-based similarity, good for concepts
 *
 * Uses RRF to combine rankings from both sources.
 */
export class HybridSearchService implements IHybridSearchService {
  private bm25Index: BM25Index;
  private indexInitialized: boolean = false;

  constructor(
    private vectorRepository: IVectorRepository,
    private embeddingsService: IEmbeddingsService
  ) {
    this.bm25Index = new BM25Index();
  }

  /**
   * Perform hybrid search
   */
  async search(
    query: string,
    options: HybridSearchOptions = {}
  ): Promise<HybridSearchResult[]> {
    const { alpha, limit, rrfConfig } = { ...DEFAULT_OPTIONS, ...options };
    const filters = options.filters;

    console.log(`🔍 HybridSearch: "${query}" (alpha=${alpha}, limit=${limit})`);

    // Determine how many results to fetch from each source
    // Fetch more than needed for better fusion
    const fetchLimit = Math.max(limit * 3, 20);

    // Run semantic and lexical search in parallel
    const [semanticResults, lexicalResults] = await Promise.all([
      this.semanticSearch(query, fetchLimit, filters),
      this.lexicalSearch(query, fetchLimit, filters),
    ]);

    console.log(
      `  Semantic: ${semanticResults.length} results, Lexical: ${lexicalResults.length} results`
    );

    // Convert to ranked items for RRF
    const semanticRanked: RankedItem[] = semanticResults.map((result, index) => ({
      id: result.id,
      rank: index + 1, // 1-indexed rank
      score: result.score,
      payload: result.payload,
      source: 'semantic' as const,
    }));

    const lexicalRanked: RankedItem[] = lexicalResults.map((result, index) => ({
      id: result.id,
      rank: index + 1,
      score: result.normalizedScore,
      payload: result.payload,
      source: 'lexical' as const,
    }));

    // Fuse results using RRF
    const fusedResults = fuseWithRRF([semanticRanked, lexicalRanked], rrfConfig);

    console.log(`  Fused: ${fusedResults.length} unique results`);

    // Return top results
    return fusedResults.slice(0, limit);
  }

  /**
   * Semantic search using vector embeddings
   */
  private async semanticSearch(
    query: string,
    limit: number,
    filters?: VectorSearchFilter
  ): Promise<Array<{ id: string; score: number; payload: TripVectorPayload }>> {
    try {
      // Generate query embedding
      const queryEmbedding = await this.embeddingsService.generate(query);

      // Search vector database
      const results = await this.vectorRepository.search(
        queryEmbedding,
        filters || {},
        limit
      );

      return results.map((r) => ({
        id: r.id,
        score: r.score,
        payload: r.payload,
      }));
    } catch (error) {
      console.error('Semantic search failed:', error);
      return [];
    }
  }

  /**
   * Lexical search using BM25
   */
  private lexicalSearch(
    query: string,
    limit: number,
    filters?: VectorSearchFilter
  ): Array<{ id: string; score: number; normalizedScore: number; payload: TripVectorPayload }> {
    // Build filter function from VectorSearchFilter
    const filterFn = filters
      ? (payload: TripVectorPayload) => {
          if (filters.user_id && payload.user_id !== filters.user_id) return false;
          if (filters.destination && payload.destination !== filters.destination)
            return false;
          if (
            filters.budget_category &&
            payload.budget_category !== filters.budget_category
          )
            return false;
          return true;
        }
      : undefined;

    // Search BM25 index
    const results = this.bm25Index.search(query, limit, filterFn);

    // Normalize scores to 0-1 range
    const scores = results.map((r) => r.score);
    const normalizedScores = normalizeBM25Scores(scores);

    return results.map((result, index) => ({
      id: result.id,
      score: result.score,
      normalizedScore: normalizedScores[index] || 0,
      payload: result.payload,
    }));
  }

  /**
   * Rebuild the BM25 index from Qdrant data
   */
  async rebuildIndex(): Promise<void> {
    console.log('🔄 Rebuilding BM25 index from Qdrant...');

    try {
      // Clear existing index
      this.bm25Index.clear();

      // Fetch all documents from Qdrant using scroll
      // Note: In production, you might want to paginate this
      const queryVector = await this.embeddingsService.generate('trip travel');

      // Get a large batch of documents
      const results = await this.vectorRepository.search(queryVector, {}, 1000);

      // Add each document to BM25 index
      for (const result of results) {
        this.bm25Index.add(
          result.id,
          result.payload.summary_text,
          result.payload
        );
      }

      this.indexInitialized = true;
      const stats = this.bm25Index.getStats();
      console.log(
        `✅ BM25 index rebuilt: ${stats.documentCount} docs, ${stats.uniqueTerms} terms`
      );
    } catch (error) {
      console.error('❌ Failed to rebuild BM25 index:', error);
      throw error;
    }
  }

  /**
   * Add a document to the BM25 index
   */
  addToIndex(id: string, text: string, payload: Record<string, unknown>): void {
    this.bm25Index.add(id, text, payload as TripVectorPayload);
  }

  /**
   * Remove a document from the BM25 index
   */
  removeFromIndex(id: string): void {
    this.bm25Index.remove(id);
  }

  /**
   * Check if the index is initialized
   */
  isIndexReady(): boolean {
    return this.indexInitialized && this.bm25Index.size() > 0;
  }

  /**
   * Get index statistics
   */
  getIndexStats(): { documentCount: number; uniqueTerms: number; averageDocLength: number } {
    return this.bm25Index.getStats();
  }
}
