/**
 * Show Search Results
 *
 * Displays actual search results for test queries to see what the system returns.
 *
 * Usage: pnpm tsx scripts/show-search-results.ts
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { QdrantVectorRepository } from '../lib/infrastructure/qdrant/vector-repository';
import { OpenAIEmbeddingsService } from '../lib/infrastructure/embeddings/openai-service';
import { HybridSearchService } from '../lib/infrastructure/search/hybrid-search.service';

const TEST_QUERIES = [
  'Trip to Paris',
  'Beach vacation in Spain',
  'Cheap weekend getaway',
  'Luxury romantic trip',
  'Italian cultural experience',
  'Family-friendly trip to Barcelona',
];

async function main() {
  console.log('🔍 Search Results Viewer');
  console.log('═'.repeat(60));

  // Initialize services
  const vectorRepo = new QdrantVectorRepository();
  const embeddingsService = new OpenAIEmbeddingsService();
  const hybridSearch = new HybridSearchService(vectorRepo, embeddingsService);

  // Rebuild BM25 index
  console.log('\n📊 Rebuilding BM25 index...');
  await hybridSearch.rebuildIndex();

  // Test each query
  for (const query of TEST_QUERIES) {
    console.log('\n' + '─'.repeat(60));
    console.log(`🔎 Query: "${query}"`);
    console.log('─'.repeat(60));

    const results = await hybridSearch.search(query, { limit: 5 });

    if (results.length === 0) {
      console.log('  No results found.');
      continue;
    }

    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      console.log(`\n  ${i + 1}. ${r.payload.title}`);
      console.log(`     📍 Destination: ${r.payload.destination}`);
      console.log(`     ✈️  From: ${r.payload.departure_city}`);
      console.log(`     📅 Duration: ${r.payload.stay_duration} days`);
      console.log(`     👥 People: ${r.payload.num_people}`);
      console.log(`     💰 Budget: €${r.payload.total_budget} (${r.payload.budget_category})`);
      console.log(`     📊 Scores: semantic=${r.scores.semantic.toFixed(3)}, lexical=${r.scores.lexical.toFixed(3)}, rrf=${r.scores.rrf.toFixed(4)}`);
    }
  }

  console.log('\n' + '═'.repeat(60));
  console.log('✅ Done!');
}

main().catch(console.error);
