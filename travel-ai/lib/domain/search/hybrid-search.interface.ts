/**
 * Domain Layer - Hybrid Search Interface
 *
 * Clean Architecture: Defines contract for hybrid search operations
 */

import type { HybridSearchOptions, HybridSearchResult } from './types';

/**
 * Hybrid Search Service Interface
 *
 * Combines lexical (BM25) and semantic (vector) search
 * using Reciprocal Rank Fusion (RRF)
 */
export interface IHybridSearchService {
  /**
   * Perform hybrid search combining BM25 and vector search
   *
   * @param query - Natural language search query
   * @param options - Search configuration
   * @returns Combined and ranked results
   */
  search(query: string, options?: HybridSearchOptions): Promise<HybridSearchResult[]>;

  /** Search using a caller-provided embedding (used by HyDE). */
  searchWithVector?(query: string, vector: number[], options?: HybridSearchOptions): Promise<HybridSearchResult[]>;

  /**
   * Rebuild the BM25 index from current data
   * Should be called after significant data changes
   */
  rebuildIndex(): Promise<void>;

  /**
   * Add a document to the BM25 index
   */
  addToIndex(id: string, text: string, payload: Record<string, unknown>): void;

  /**
   * Remove a document from the BM25 index
   */
  removeFromIndex(id: string): void;
}
