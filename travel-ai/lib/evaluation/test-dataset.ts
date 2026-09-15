/**
 * Test Dataset for RAG Evaluation
 *
 * Curated queries with expected results for evaluating
 * the quality of retrieval.
 */

/**
 * A test query with expected results
 */
export interface TestQuery {
  /** Version of the reviewed judgments/rules used for this query. */
  judgmentVersion?: string;
  /** Whether relevance is reviewed or heuristic diagnostic-only. */
  judgmentSource?: 'reviewed' | 'heuristic';
  /** Unique ID for this test case */
  id: string;
  /** Natural language query */
  query: string;
  /** IDs of trips that are relevant to this query */
  relevantTripIds: string[];
  /** Expected filters to be extracted (for self-query testing) */
  expectedFilters?: {
    destination?: string;
    budget_category?: 'economy' | 'standard' | 'premium';
    min_duration?: number;
    max_duration?: number;
  };
  /** Query category for analysis */
  category: 'destination' | 'budget' | 'activity' | 'duration' | 'complex';
  /** Difficulty level */
  difficulty: 'easy' | 'medium' | 'hard';
  /** Relevance rules for automatic matching */
  relevanceRules?: RelevanceRules;
}

/**
 * Rules to determine if a trip is relevant to a query
 */
export interface RelevanceRules {
  /** Destination codes that match (e.g., ['CDG', 'ORY'] for Paris) */
  destinationCodes?: string[];
  /** Budget categories that match */
  budgetCategories?: ('economy' | 'standard' | 'premium')[];
  /** Minimum trip duration */
  minDuration?: number;
  /** Maximum trip duration */
  maxDuration?: number;
  /** Keywords that should appear in summary_text (OR logic) */
  keywords?: string[];
}

/**
 * Test dataset for RAG evaluation
 *
 * Each query has relevanceRules that define what makes a trip "relevant".
 * The evaluator uses these rules to dynamically match trips from Qdrant.
 */
export const TEST_QUERIES: TestQuery[] = [
  // Destination queries
  {
    id: 'dest-1',
    query: 'Trip to Paris',
    relevantTripIds: [], // Populated dynamically from relevanceRules
    expectedFilters: { destination: 'Paris' },
    category: 'destination',
    difficulty: 'easy',
    relevanceRules: {
      destinationCodes: ['CDG'],
    },
  },
  {
    id: 'dest-2',
    query: 'Beach vacation in Spain',
    relevantTripIds: [],
    expectedFilters: { destination: 'Spain' },
    category: 'destination',
    difficulty: 'easy',
    relevanceRules: {
      destinationCodes: ['BCN', 'MAD', 'AGP', 'SVQ', 'PMI'],
      keywords: ['beach'],
    },
  },
  {
    id: 'dest-3',
    query: 'Italian cultural experience',
    relevantTripIds: [],
    expectedFilters: { destination: 'Italy' },
    category: 'destination',
    difficulty: 'medium',
    relevanceRules: {
      destinationCodes: ['FCO', 'MXP', 'VCE', 'FLR', 'NAP'],
      keywords: ['culture'],
    },
  },

  // Budget queries
  {
    id: 'budget-1',
    query: 'Cheap weekend getaway',
    relevantTripIds: [],
    expectedFilters: { budget_category: 'economy', max_duration: 3 },
    category: 'budget',
    difficulty: 'easy',
    relevanceRules: {
      budgetCategories: ['economy'],
      maxDuration: 4,
    },
  },
  {
    id: 'budget-2',
    query: 'Luxury vacation under 5000 euros',
    relevantTripIds: [],
    expectedFilters: { budget_category: 'premium' },
    category: 'budget',
    difficulty: 'medium',
    relevanceRules: {
      budgetCategories: ['premium'],
    },
  },
  {
    id: 'budget-3',
    query: 'Budget-friendly family trip',
    relevantTripIds: [],
    expectedFilters: { budget_category: 'economy' },
    category: 'budget',
    difficulty: 'medium',
    relevanceRules: {
      budgetCategories: ['economy'],
    },
  },

  // Activity queries
  {
    id: 'activity-1',
    query: 'Hiking and outdoor adventure',
    relevantTripIds: [],
    category: 'activity',
    difficulty: 'easy',
    relevanceRules: {
      keywords: ['outdoor', 'nature', 'hiking'],
    },
  },
  {
    id: 'activity-2',
    query: 'Romantic honeymoon trip',
    relevantTripIds: [],
    category: 'activity',
    difficulty: 'easy',
    relevanceRules: {
      keywords: ['romance', 'romantic'],
    },
  },
  {
    id: 'activity-3',
    query: 'Food and wine tasting tour',
    relevantTripIds: [],
    category: 'activity',
    difficulty: 'medium',
    relevanceRules: {
      keywords: ['food', 'wine'],
    },
  },

  // Duration queries
  {
    id: 'duration-1',
    query: 'Week-long vacation',
    relevantTripIds: [],
    expectedFilters: { min_duration: 7 },
    category: 'duration',
    difficulty: 'easy',
    relevanceRules: {
      minDuration: 7,
      maxDuration: 10,
    },
  },
  {
    id: 'duration-2',
    query: 'Short 3-day city break',
    relevantTripIds: [],
    expectedFilters: { max_duration: 3 },
    category: 'duration',
    difficulty: 'easy',
    relevanceRules: {
      maxDuration: 4,
    },
  },

  // Complex queries (multiple criteria)
  {
    id: 'complex-1',
    query: 'Affordable beach vacation in Greece for a week',
    relevantTripIds: [],
    expectedFilters: {
      destination: 'Greece',
      budget_category: 'economy',
      min_duration: 7,
    },
    category: 'complex',
    difficulty: 'hard',
    relevanceRules: {
      destinationCodes: ['ATH', 'SKG'],
      budgetCategories: ['economy'],
      minDuration: 7,
    },
  },
  {
    id: 'complex-2',
    query: 'Luxury romantic getaway to Paris with fine dining',
    relevantTripIds: [],
    expectedFilters: {
      destination: 'Paris',
      budget_category: 'premium',
    },
    category: 'complex',
    difficulty: 'hard',
    relevanceRules: {
      destinationCodes: ['CDG'],
      budgetCategories: ['premium'],
    },
  },
  {
    id: 'complex-3',
    query: 'Budget adventure trip to Portugal with hiking',
    relevantTripIds: [],
    expectedFilters: {
      destination: 'Portugal',
      budget_category: 'economy',
    },
    category: 'complex',
    difficulty: 'hard',
    relevanceRules: {
      destinationCodes: ['LIS', 'OPO'],
      budgetCategories: ['economy'],
    },
  },
  {
    id: 'complex-4',
    query: 'Family-friendly trip to Barcelona with beaches and museums',
    relevantTripIds: [],
    expectedFilters: {
      destination: 'Barcelona',
    },
    category: 'complex',
    difficulty: 'hard',
    relevanceRules: {
      destinationCodes: ['BCN'],
      keywords: ['beach', 'culture'],
    },
  },
  {
    id: 'complex-5',
    query: 'Premium spa retreat in Austria for relaxation',
    relevantTripIds: [],
    expectedFilters: {
      destination: 'Austria',
      budget_category: 'premium',
    },
    category: 'complex',
    difficulty: 'hard',
    relevanceRules: {
      destinationCodes: ['VIE'],
      budgetCategories: ['premium'],
    },
  },
];

/**
 * Get test queries by category
 */
export function getQueriesByCategory(category: TestQuery['category']): TestQuery[] {
  return TEST_QUERIES.filter((q) => q.category === category);
}

/**
 * Get test queries by difficulty
 */
export function getQueriesByDifficulty(difficulty: TestQuery['difficulty']): TestQuery[] {
  return TEST_QUERIES.filter((q) => q.difficulty === difficulty);
}

/**
 * Update relevant trip IDs for a test query
 * (Used after populating the database)
 */
export function setRelevantTripIds(queryId: string, tripIds: string[]): void {
  const query = TEST_QUERIES.find((q) => q.id === queryId);
  if (query) {
    query.relevantTripIds = tripIds;
  }
}
