/**
 * Domain Layer - Search Types
 *
 * Types for hybrid search (lexical + semantic)
 */

import type { TripVectorPayload, VectorSearchFilter } from '../vector/repository';

/**
 * Result from hybrid search combining BM25 and vector scores
 */
export interface HybridSearchResult {
  id: string;
  payload: TripVectorPayload;
  /** Combined score after fusion (0-1, higher is better) */
  score: number;
  /** Individual scores for analysis */
  scores: {
    semantic: number;
    lexical: number;
    rrf: number;
  };
}

/**
 * Configuration for Reciprocal Rank Fusion
 */
export interface RRFConfig {
  /** Constant k for RRF formula: 1/(k + rank). Default: 60 */
  k: number;
}

/**
 * Options for hybrid search
 */
export interface HybridSearchOptions {
  /** Weight for semantic vs lexical (0-1). 0.7 = 70% semantic, 30% lexical */
  alpha?: number;
  /** Maximum results to return */
  limit?: number;
  /** Optional filters */
  filters?: VectorSearchFilter;
  /** RRF configuration */
  rrfConfig?: Partial<RRFConfig>;
}

/**
 * Lexical search result (BM25)
 */
export interface LexicalSearchResult {
  id: string;
  score: number;
  payload: TripVectorPayload;
}

/**
 * Semantic search result (Vector)
 */
export interface SemanticSearchResult {
  id: string;
  score: number;
  payload: TripVectorPayload;
}

/**
 * Ranked item for RRF fusion
 */
export interface RankedItem {
  id: string;
  rank: number;
  score: number;
  payload: TripVectorPayload;
  source: 'semantic' | 'lexical';
}
