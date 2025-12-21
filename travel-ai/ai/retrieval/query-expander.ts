/**
 * Query Expander
 *
 * Expands search queries with synonyms and related terms
 * to improve recall in both lexical and semantic search.
 */

/**
 * Travel domain synonyms and related terms
 */
const TRAVEL_SYNONYMS: Record<string, string[]> = {
  // Budget terms
  cheap: ['budget', 'affordable', 'economical', 'low-cost', 'inexpensive', 'economy'],
  budget: ['cheap', 'affordable', 'economical', 'low-cost', 'economy'],
  luxury: ['premium', 'high-end', 'upscale', 'deluxe', 'five-star', 'exclusive'],
  premium: ['luxury', 'high-end', 'upscale', 'deluxe'],

  // Trip types
  beach: ['coastal', 'seaside', 'ocean', 'beachfront', 'shore', 'tropical'],
  romantic: ['honeymoon', 'couples', 'love', 'intimate', 'getaway'],
  adventure: ['exciting', 'thrill', 'extreme', 'outdoor', 'expedition'],
  cultural: ['heritage', 'historical', 'museum', 'art', 'tradition'],
  relaxing: ['peaceful', 'calm', 'spa', 'wellness', 'tranquil', 'rest'],
  family: ['kids', 'children', 'family-friendly', 'all-ages'],

  // Duration
  weekend: ['short', 'quick', 'brief', '2-day', '3-day'],
  week: ['7-day', 'seven-day', 'weekly'],
  long: ['extended', 'lengthy', 'prolonged'],

  // Activities
  hiking: ['trekking', 'walking', 'trails', 'mountains'],
  skiing: ['snow', 'winter sports', 'slopes', 'alpine'],
  diving: ['scuba', 'snorkeling', 'underwater', 'marine'],
  food: ['culinary', 'gastronomy', 'cuisine', 'dining', 'foodie'],

  // Accommodation
  hotel: ['accommodation', 'lodging', 'stay', 'resort'],
  hostel: ['backpacker', 'budget accommodation', 'dormitory'],
  villa: ['private', 'house', 'rental', 'vacation home'],
};

/**
 * European destination aliases
 */
const DESTINATION_ALIASES: Record<string, string[]> = {
  paris: ['france', 'french'],
  london: ['uk', 'england', 'british'],
  rome: ['italy', 'italian', 'roma'],
  barcelona: ['spain', 'spanish', 'catalonia'],
  amsterdam: ['netherlands', 'dutch', 'holland'],
  berlin: ['germany', 'german'],
  vienna: ['austria', 'austrian', 'wien'],
  prague: ['czech', 'czechia'],
  lisbon: ['portugal', 'portuguese'],
  athens: ['greece', 'greek'],
};

/**
 * Query expansion result
 */
export interface QueryExpansionResult {
  originalQuery: string;
  expandedTerms: string[];
  expandedQuery: string;
}

/**
 * Query Expander Configuration
 */
interface QueryExpanderConfig {
  /** Maximum number of synonyms to add per term */
  maxSynonymsPerTerm?: number;
  /** Whether to include destination aliases */
  includeDestinations?: boolean;
}

/**
 * Query Expander
 *
 * Expands search queries with domain-specific synonyms
 * to improve retrieval recall.
 */
export class QueryExpander {
  private maxSynonymsPerTerm: number;
  private includeDestinations: boolean;

  constructor(expanderConfig: QueryExpanderConfig = {}) {
    this.maxSynonymsPerTerm = expanderConfig.maxSynonymsPerTerm ?? 3;
    this.includeDestinations = expanderConfig.includeDestinations ?? true;
  }

  /**
   * Expand a query with synonyms
   */
  expand(query: string): QueryExpansionResult {
    const lowerQuery = query.toLowerCase();
    const words = lowerQuery.split(/\s+/);
    const expandedTerms: string[] = [];

    // Find synonyms for each word
    for (const word of words) {
      // Check travel synonyms
      if (TRAVEL_SYNONYMS[word]) {
        const synonyms = TRAVEL_SYNONYMS[word].slice(0, this.maxSynonymsPerTerm);
        expandedTerms.push(...synonyms);
      }

      // Check destination aliases
      if (this.includeDestinations && DESTINATION_ALIASES[word]) {
        const aliases = DESTINATION_ALIASES[word].slice(0, this.maxSynonymsPerTerm);
        expandedTerms.push(...aliases);
      }
    }

    // Remove duplicates and terms already in query
    const uniqueTerms = [...new Set(expandedTerms)].filter(
      (term) => !lowerQuery.includes(term)
    );

    // Build expanded query
    const expandedQuery =
      uniqueTerms.length > 0 ? `${query} ${uniqueTerms.join(' ')}` : query;

    return {
      originalQuery: query,
      expandedTerms: uniqueTerms,
      expandedQuery,
    };
  }

  /**
   * Get all synonyms for a term
   */
  getSynonyms(term: string): string[] {
    const lower = term.toLowerCase();
    return TRAVEL_SYNONYMS[lower] || [];
  }

  /**
   * Get destination aliases
   */
  getDestinationAliases(destination: string): string[] {
    const lower = destination.toLowerCase();
    return DESTINATION_ALIASES[lower] || [];
  }
}
