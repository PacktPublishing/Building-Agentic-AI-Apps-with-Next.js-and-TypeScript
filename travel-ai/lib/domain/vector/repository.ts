/**
 * Domain Layer - Vector Repository Interface
 *
 * Clean Architecture: Domain layer defines contracts
 * for vector database operations
 */

/**
 * Trip vector payload for Qdrant
 */
export interface TripVectorPayload extends Record<string, unknown> {
  trip_id: string;
  user_id: string;
  title: string;
  destination: string;
  departure_city: string;
  departure_date: string;
  stay_duration: number;
  num_people: number;
  budget_category: 'economy' | 'standard' | 'premium';
  total_budget: number;
  summary_text: string;
  num_flights: number;
  num_hotels: number;
  num_activities: number;
  status: string;
  created_at: string;
  thread_id: string;
}

/**
 * Search filter for vector search
 */
export interface VectorSearchFilter {
  user_id?: string;
  destination?: string | string[];
  budget_category?: 'economy' | 'standard' | 'premium';
  budget_min?: number;
  budget_max?: number;
  min_duration?: number;
  max_duration?: number;
  departure_city?: string;
  num_people?: number;
}

/**
 * Search result from vector DB
 */
export interface VectorSearchResult {
  id: string;
  score: number;
  payload: TripVectorPayload;
}

/**
 * Point with vector data
 */
export interface VectorPoint {
  id: string;
  vector: number[];
  payload: TripVectorPayload;
}

/**
 * Vector Repository Interface (Port)
 * Implementation will be in Infrastructure layer
 */
export interface IVectorRepository {
  /**
   * Upsert trip vector to Qdrant
   */
  upsert(tripId: string, vector: number[], payload: TripVectorPayload): Promise<void>;

  /**
   * Get a point by ID (includes vector)
   */
  getById(tripId: string): Promise<VectorPoint | null>;

  /**
   * Search trips by semantic similarity
   */
  search(
    queryVector: number[],
    filter: VectorSearchFilter,
    limit?: number
  ): Promise<VectorSearchResult[]>;

  /** Return a complete corpus snapshot for secondary-index rebuilds. */
  listAll?(): Promise<VectorSearchResult[]>;

  /**
   * Delete trip vector
   */
  delete(tripId: string): Promise<void>;
}
