/**
 * Domain Layer - Retrieval Service Interface
 *
 * Clean Architecture: Domain defines the contract for semantic search
 */

import type { VectorSearchResult } from '../vector/repository';

/**
 * Search query for semantic retrieval
 */
export interface SemanticSearchQuery {
  query: string;
  userId?: string;
  /** Private is the safe default; public must be explicitly requested. */
  scope?: 'private' | 'public';
  filters?: {
    destination?: string;
    budgetCategory?: 'economy' | 'standard' | 'premium';
    minBudget?: number;
    maxBudget?: number;
  };
  limit?: number;
}

/**
 * Enriched search result with trip details
 */
export interface RetrievalResult {
  tripId: string;
  title: string;
  destination: string;
  departureCity: string;
  departureDate: string;
  stayDuration: number;
  numPeople: number;
  budgetCategory: string;
  totalBudget: number;
  summaryText: string;
  relevanceScore: number;
  createdAt: string;
}

/**
 * Retrieval Service Interface (Port)
 */
export interface IRetrievalService {
  /**
   * Search trips using semantic similarity
   */
  searchTrips(query: SemanticSearchQuery): Promise<RetrievalResult[]>;

  /**
   * Find similar trips to a given trip
   */
  findSimilarTrips(tripId: string, userId: string, limit?: number): Promise<RetrievalResult[]>;
}
