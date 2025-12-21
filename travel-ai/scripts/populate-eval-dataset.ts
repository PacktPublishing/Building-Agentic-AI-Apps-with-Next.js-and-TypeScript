/**
 * Populate Evaluation Dataset
 *
 * This script queries Qdrant to find trips that match each test query's criteria,
 * then updates the test dataset with real trip IDs for accurate evaluation.
 *
 * Usage: pnpm tsx scripts/populate-eval-dataset.ts
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { getQdrantClient, QDRANT_COLLECTIONS } from '../lib/infrastructure/qdrant/client';
import type { TripVectorPayload } from '../lib/domain/vector/repository';

// Define what makes a trip "relevant" for each test query
interface RelevanceRule {
  queryId: string;
  query: string;
  // Filter conditions
  destinationCodes?: string[];
  destinationNames?: string[];
  budgetCategory?: ('economy' | 'standard' | 'premium')[];
  minDuration?: number;
  maxDuration?: number;
  // Keywords that should appear in summary_text
  keywords?: string[];
}

// Map test queries to relevance rules
const RELEVANCE_RULES: RelevanceRule[] = [
  // Destination queries
  {
    queryId: 'dest-1',
    query: 'Trip to Paris',
    destinationCodes: ['CDG'],
    destinationNames: ['Paris'],
  },
  {
    queryId: 'dest-2',
    query: 'Beach vacation in Spain',
    destinationCodes: ['BCN', 'MAD', 'AGP', 'SVQ', 'PMI'],
    keywords: ['beach'],
  },
  {
    queryId: 'dest-3',
    query: 'Italian cultural experience',
    destinationCodes: ['FCO', 'MXP', 'VCE', 'FLR', 'NAP'],
    keywords: ['culture'],
  },

  // Budget queries
  {
    queryId: 'budget-1',
    query: 'Cheap weekend getaway',
    budgetCategory: ['economy'],
    maxDuration: 4,
  },
  {
    queryId: 'budget-2',
    query: 'Luxury vacation under 5000 euros',
    budgetCategory: ['premium'],
  },
  {
    queryId: 'budget-3',
    query: 'Budget-friendly family trip',
    budgetCategory: ['economy'],
  },

  // Activity queries
  {
    queryId: 'activity-1',
    query: 'Hiking and outdoor adventure',
    keywords: ['outdoor', 'nature', 'hiking'],
  },
  {
    queryId: 'activity-2',
    query: 'Romantic honeymoon trip',
    keywords: ['romance', 'romantic'],
  },
  {
    queryId: 'activity-3',
    query: 'Food and wine tasting tour',
    keywords: ['food', 'wine'],
  },

  // Duration queries
  {
    queryId: 'duration-1',
    query: 'Week-long vacation',
    minDuration: 7,
    maxDuration: 10,
  },
  {
    queryId: 'duration-2',
    query: 'Short 3-day city break',
    maxDuration: 4,
  },

  // Complex queries
  {
    queryId: 'complex-1',
    query: 'Affordable beach vacation in Greece for a week',
    destinationCodes: ['ATH', 'SKG'],
    budgetCategory: ['economy'],
    minDuration: 7,
    keywords: ['beach'],
  },
  {
    queryId: 'complex-2',
    query: 'Luxury romantic getaway to Paris with fine dining',
    destinationCodes: ['CDG'],
    budgetCategory: ['premium'],
    keywords: ['romance', 'food'],
  },
  {
    queryId: 'complex-3',
    query: 'Budget adventure trip to Portugal with hiking',
    destinationCodes: ['LIS', 'OPO'],
    budgetCategory: ['economy'],
    keywords: ['outdoor', 'nature'],
  },
  {
    queryId: 'complex-4',
    query: 'Family-friendly trip to Barcelona with beaches and museums',
    destinationCodes: ['BCN'],
    keywords: ['beach', 'culture'],
  },
  {
    queryId: 'complex-5',
    query: 'Premium spa retreat in Austria for relaxation',
    destinationCodes: ['VIE'],
    budgetCategory: ['premium'],
  },
];

async function fetchAllTrips(): Promise<Array<{ id: string; payload: TripVectorPayload }>> {
  const client = getQdrantClient();
  const collection = QDRANT_COLLECTIONS.USER_TRIPS;

  // Scroll through all points
  const allTrips: Array<{ id: string; payload: TripVectorPayload }> = [];
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

function matchesRule(
  trip: { id: string; payload: TripVectorPayload },
  rule: RelevanceRule
): boolean {
  const { payload } = trip;

  // Check destination codes
  if (rule.destinationCodes && rule.destinationCodes.length > 0) {
    if (!rule.destinationCodes.includes(payload.destination)) {
      return false;
    }
  }

  // Check budget category
  if (rule.budgetCategory && rule.budgetCategory.length > 0) {
    if (!rule.budgetCategory.includes(payload.budget_category as any)) {
      return false;
    }
  }

  // Check min duration
  if (rule.minDuration !== undefined) {
    if (payload.stay_duration < rule.minDuration) {
      return false;
    }
  }

  // Check max duration
  if (rule.maxDuration !== undefined) {
    if (payload.stay_duration > rule.maxDuration) {
      return false;
    }
  }

  // Check keywords in summary_text
  if (rule.keywords && rule.keywords.length > 0) {
    const summaryLower = payload.summary_text.toLowerCase();
    const hasKeyword = rule.keywords.some((kw) =>
      summaryLower.includes(kw.toLowerCase())
    );
    if (!hasKeyword) {
      return false;
    }
  }

  return true;
}

async function main() {
  console.log('🔍 Populate Evaluation Dataset');
  console.log('═'.repeat(50));

  // Fetch all trips from Qdrant
  console.log('\n📦 Fetching all trips from Qdrant...');
  const allTrips = await fetchAllTrips();
  console.log(`   Found ${allTrips.length} trips\n`);

  if (allTrips.length === 0) {
    console.log('❌ No trips found! Run seed-trips.ts first.');
    process.exit(1);
  }

  // Show sample of trips for debugging
  console.log('📋 Sample trips:');
  for (const trip of allTrips.slice(0, 3)) {
    console.log(`   - ${trip.payload.title} (${trip.payload.destination})`);
    console.log(`     Budget: ${trip.payload.budget_category}, Duration: ${trip.payload.stay_duration} days`);
  }

  // Match trips to each query rule
  console.log('\n🎯 Matching trips to test queries...\n');

  const results: Record<string, string[]> = {};
  let totalMatches = 0;

  for (const rule of RELEVANCE_RULES) {
    const matchingTrips = allTrips.filter((trip) => matchesRule(trip, rule));
    const tripIds = matchingTrips.map((t) => t.id);

    results[rule.queryId] = tripIds;
    totalMatches += tripIds.length;

    const status = tripIds.length > 0 ? '✅' : '⚠️';
    console.log(`${status} ${rule.queryId}: "${rule.query}"`);
    console.log(`   Matches: ${tripIds.length}`);

    if (tripIds.length > 0 && tripIds.length <= 3) {
      for (const trip of matchingTrips) {
        console.log(`   - ${trip.payload.title} (${trip.payload.destination})`);
      }
    }
  }

  // Generate the updated test dataset code
  console.log('\n' + '═'.repeat(50));
  console.log('📝 Generated relevantTripIds:');
  console.log('═'.repeat(50));
  console.log('\n// Copy this to lib/evaluation/test-dataset.ts\n');
  console.log('export const RELEVANT_TRIP_IDS: Record<string, string[]> = {');
  for (const [queryId, tripIds] of Object.entries(results)) {
    if (tripIds.length > 0) {
      // Limit to 5 trips per query for reasonable expectations
      const limitedIds = tripIds.slice(0, 5);
      console.log(`  '${queryId}': ${JSON.stringify(limitedIds)},`);
    } else {
      console.log(`  '${queryId}': [], // No matches found`);
    }
  }
  console.log('};');

  // Summary
  console.log('\n' + '═'.repeat(50));
  console.log('📊 Summary');
  console.log('═'.repeat(50));
  console.log(`Total queries: ${RELEVANCE_RULES.length}`);
  console.log(`Queries with matches: ${Object.values(results).filter((ids) => ids.length > 0).length}`);
  console.log(`Total trip matches: ${totalMatches}`);

  // Check for queries with no matches
  const noMatches = RELEVANCE_RULES.filter((r) => results[r.queryId].length === 0);
  if (noMatches.length > 0) {
    console.log('\n⚠️  Queries with no matches:');
    for (const rule of noMatches) {
      console.log(`   - ${rule.queryId}: "${rule.query}"`);
    }
    console.log('\n   Consider relaxing the relevance rules or seeding more diverse data.');
  }
}

main().catch(console.error);
