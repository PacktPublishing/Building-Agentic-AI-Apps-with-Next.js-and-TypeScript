/**
 * Domain Layer - Reranker Interface
 *
 * Clean Architecture: Defines contract for reranking services
 */

/**
 * Document to be reranked
 */
export interface RerankDocument {
  id: string;
  text: string;
  metadata?: Record<string, unknown>;
}

/**
 * Result after reranking
 */
export interface RerankResult {
  id: string;
  text: string;
  /** Relevance score from reranker (higher is better) */
  relevanceScore: number;
  /** Original rank before reranking (1-indexed) */
  originalRank: number;
  /** New rank after reranking (1-indexed) */
  newRank: number;
  metadata?: Record<string, unknown>;
}

/**
 * Reranker configuration
 */
export interface RerankOptions {
  /** Number of top documents to return (default: 5) */
  topN?: number;
  /** Minimum relevance score threshold (0-1) */
  minScore?: number;
  /** Whether to return documents below threshold with score 0 */
  includeAll?: boolean;
}

/**
 * Reranker Service Interface
 *
 * Cross-encoders rerank documents by jointly encoding
 * the query and document together, providing more accurate
 * relevance scores than bi-encoders.
 */
export interface IRerankerService {
  /**
   * Rerank documents based on relevance to query
   *
   * @param query - The search query
   * @param documents - Documents to rerank
   * @param options - Reranking options
   * @returns Reranked documents sorted by relevance
   */
  rerank(
    query: string,
    documents: RerankDocument[],
    options?: RerankOptions
  ): Promise<RerankResult[]>;

  /**
   * Get the reranker provider name
   */
  getProviderName(): string;
}
