/**
 * Self-Query Prompt Template
 *
 * Extracts structured filters from natural language queries
 */

export const SELF_QUERY_SYSTEM_PROMPT = `You are a query parser for a travel search system. Your job is to analyze user queries and extract:
1. The semantic search query (what the user wants to find conceptually)
2. Structured filters (specific constraints that can be applied to metadata)

Available metadata fields for filtering:
- destination: string (country or city name, e.g., "Spain", "Paris", "Italy")
- budget_min: number (minimum budget in euros)
- budget_max: number (maximum budget in euros)
- budget_category: "economy" | "standard" | "premium"
- min_duration: number (minimum trip duration in days)
- max_duration: number (maximum trip duration in days)
- departure_city: string (city of departure)
- num_people: number (number of travelers)

Rules:
1. Extract ONLY filters that are explicitly mentioned or strongly implied
2. The semantic query should capture the conceptual intent (e.g., "beach vacation", "cultural trip", "romantic getaway")
3. Convert relative terms to filters:
   - "cheap", "budget", "affordable" → budget_category: "economy"
   - "luxury", "premium", "high-end" → budget_category: "premium"
   - "short trip", "weekend" → max_duration: 3-4
   - "long trip", "extended" → min_duration: 7
4. Normalize destination names to common forms (e.g., "España" → "Spain")
5. If a price is mentioned, use it as budget_max unless "at least" or "minimum" is specified

Respond with valid JSON only, no explanation.`;

export const SELF_QUERY_USER_TEMPLATE = `Parse this travel search query and extract the semantic query and filters:

Query: "{query}"

Respond with JSON in this exact format:
{
  "semanticQuery": "the conceptual search query without filter terms",
  "filters": {
    "destination": "optional string",
    "budget_min": "optional number",
    "budget_max": "optional number",
    "budget_category": "optional: economy|standard|premium",
    "min_duration": "optional number",
    "max_duration": "optional number",
    "departure_city": "optional string",
    "num_people": "optional number"
  },
  "confidence": 0.0-1.0
}

Only include filter fields that were found in the query. Omit fields with no value.`;

/**
 * Example queries and expected outputs for testing/documentation
 */
export const SELF_QUERY_EXAMPLES = [
  {
    query: 'beach vacation in Spain under 2000€',
    expected: {
      semanticQuery: 'beach vacation',
      filters: {
        destination: 'Spain',
        budget_max: 2000,
      },
      confidence: 0.95,
    },
  },
  {
    query: 'luxury romantic trip to Paris for 2 people',
    expected: {
      semanticQuery: 'romantic trip',
      filters: {
        destination: 'Paris',
        budget_category: 'premium',
        num_people: 2,
      },
      confidence: 0.9,
    },
  },
  {
    query: 'cheap weekend getaway from London',
    expected: {
      semanticQuery: 'weekend getaway',
      filters: {
        budget_category: 'economy',
        departure_city: 'London',
        max_duration: 3,
      },
      confidence: 0.85,
    },
  },
  {
    query: 'cultural trip to Italy for at least a week',
    expected: {
      semanticQuery: 'cultural trip',
      filters: {
        destination: 'Italy',
        min_duration: 7,
      },
      confidence: 0.9,
    },
  },
  {
    query: 'adventure travel',
    expected: {
      semanticQuery: 'adventure travel',
      filters: {},
      confidence: 0.95,
    },
  },
];
