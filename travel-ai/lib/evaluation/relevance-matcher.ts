/**
 * Relevance Matcher
 *
 * Determines which trips are "relevant" to a test query
 * based on defined relevance rules.
 */

import { getQdrantClient, QDRANT_COLLECTIONS } from '../infrastructure/qdrant/client';
import type { TripVectorPayload } from '../domain/vector/repository';
import type { RelevanceRules, TestQuery } from './test-dataset';

export interface TripRecord {
  id: string;
  payload: TripVectorPayload;
}

/**
 * Check if a trip matches the given relevance rules
 */
export function matchesRelevanceRules(
  trip: TripRecord,
  rules: RelevanceRules
): boolean {
  const { payload } = trip;

  // Check destination codes
  if (rules.destinationCodes && rules.destinationCodes.length > 0) {
    if (!rules.destinationCodes.includes(payload.destination)) {
      return false;
    }
  }

  // Check budget categories
  if (rules.budgetCategories && rules.budgetCategories.length > 0) {
    if (!rules.budgetCategories.includes(payload.budget_category as any)) {
      return false;
    }
  }

  // Check min duration
  if (rules.minDuration !== undefined) {
    if (payload.stay_duration < rules.minDuration) {
      return false;
    }
  }

  // Check max duration
  if (rules.maxDuration !== undefined) {
    if (payload.stay_duration > rules.maxDuration) {
      return false;
    }
  }

  // Check keywords (OR logic - at least one keyword must match)
  if (rules.keywords && rules.keywords.length > 0) {
    const summaryLower = payload.summary_text.toLowerCase();
    const hasKeyword = rules.keywords.some((kw) =>
      summaryLower.includes(kw.toLowerCase())
    );
    if (!hasKeyword) {
      return false;
    }
  }

  return true;
}

/**
 * Fetch all trips from Qdrant
 */
export async function fetchAllTrips(): Promise<TripRecord[]> {
  const client = getQdrantClient();
  const collection = QDRANT_COLLECTIONS.USER_TRIPS;

  const allTrips: TripRecord[] = [];
  let offset: string | number | null = null;

  while (true) {
    const result = await client.scroll(collection, {
      limit: 100,
      offset: offset ?? undefined,
      with_payload: true,
      with_vector: false,
    });

    for (const point of result.points) {
      allTrips.push({
        id: point.id as string,
        payload: point.payload as unknown as TripVectorPayload,
      });
    }

    if (!result.next_page_offset) break;
    offset = result.next_page_offset;
  }

  return allTrips;
}

/**
 * Find relevant trip IDs for a test query based on its relevance rules
 */
export function findRelevantTrips(
  testQuery: TestQuery,
  allTrips: TripRecord[]
): string[] {
  // If no rules defined, return empty (query can't be evaluated)
  if (!testQuery.relevanceRules) {
    return [];
  }

  const matchingTrips = allTrips.filter((trip) =>
    matchesRelevanceRules(trip, testQuery.relevanceRules!)
  );

  // Return up to 10 relevant trip IDs
  return matchingTrips.slice(0, 10).map((t) => t.id);
}

/**
 * Populate relevantTripIds for all test queries
 */
export async function populateRelevantTripIds(
  testQueries: TestQuery[]
): Promise<{ populated: number; empty: number }> {
  const allTrips = await fetchAllTrips();

  let populated = 0;
  let empty = 0;

  for (const query of testQueries) {
    const relevantIds = findRelevantTrips(query, allTrips);
    query.relevantTripIds = relevantIds;

    if (relevantIds.length > 0) {
      populated++;
    } else {
      empty++;
    }
  }

  return { populated, empty };
}

/**
 * Get a summary of matches for debugging
 */
export async function getMatchSummary(
  testQueries: TestQuery[]
): Promise<
  Array<{
    queryId: string;
    query: string;
    matchCount: number;
    sampleMatches: string[];
  }>
> {
  const allTrips = await fetchAllTrips();
  const summary: Array<{
    queryId: string;
    query: string;
    matchCount: number;
    sampleMatches: string[];
  }> = [];

  for (const testQuery of testQueries) {
    const relevantTrips = allTrips.filter(
      (trip) =>
        testQuery.relevanceRules &&
        matchesRelevanceRules(trip, testQuery.relevanceRules)
    );

    summary.push({
      queryId: testQuery.id,
      query: testQuery.query,
      matchCount: relevantTrips.length,
      sampleMatches: relevantTrips.slice(0, 3).map(
        (t) => `${t.payload.title} (${t.payload.destination})`
      ),
    });
  }

  return summary;
}
