/**
 * Test Advanced RAG Pipeline
 *
 * Tests the complete advanced RAG pipeline with all features.
 *
 * Usage: pnpm tsx scripts/test-advanced-rag.ts
 */

import { config } from '../config';
import { QdrantVectorRepository } from '../lib/infrastructure/qdrant/vector-repository';
import { OpenAIEmbeddingsService } from '../lib/infrastructure/embeddings/openai-service';
import { HybridSearchService } from '../lib/infrastructure/search/hybrid-search.service';
import { createReranker } from '../lib/infrastructure/reranking';
import { AdvancedRAGPipeline } from '../ai/retrieval/advanced-rag-pipeline';
import { SelfQueryParser } from '../ai/retrieval/self-query-parser';
import { QueryRewriter } from '../ai/retrieval/query-rewriter';
import { QueryExpander } from '../ai/retrieval/query-expander';

const TEST_QUERIES = [
  'cheap beach vacation in Spain',
  'luxury romantic trip to Paris',
  'budget adventure in Portugal',
  'week-long cultural tour of Italy',
  'family-friendly trip under 3000 euros',
];

async function testSelfQuery() {
  console.log('\n📋 Testing Self-Query Parser');
  console.log('═'.repeat(50));

  const parser = new SelfQueryParser();

  for (const query of TEST_QUERIES.slice(0, 3)) {
    console.log(`\nQuery: "${query}"`);
    const result = await parser.parse(query);
    console.log(`  Semantic: "${result.semanticQuery}"`);
    console.log(`  Filters:`, result.filters);
    console.log(`  Confidence: ${result.confidence}`);
  }
}

async function testQueryRewriting() {
  console.log('\n✏️ Testing Query Rewriter');
  console.log('═'.repeat(50));

  const rewriter = new QueryRewriter();

  const shortQueries = ['cheap rome', 'beach spain', 'paris honeymoon'];

  for (const query of shortQueries) {
    console.log(`\nQuery: "${query}"`);
    const result = await rewriter.rewrite(query);
    console.log(`  Rewritten: "${result.rewrittenQuery}"`);
    console.log(`  Modified: ${result.wasModified}`);
  }
}

async function testQueryExpansion() {
  console.log('\n📝 Testing Query Expander');
  console.log('═'.repeat(50));

  const expander = new QueryExpander();

  for (const query of TEST_QUERIES.slice(0, 3)) {
    console.log(`\nQuery: "${query}"`);
    const result = expander.expand(query);
    console.log(`  Added terms: [${result.expandedTerms.join(', ')}]`);
    console.log(`  Expanded: "${result.expandedQuery}"`);
  }
}

async function testHybridSearch() {
  console.log('\n🔍 Testing Hybrid Search');
  console.log('═'.repeat(50));

  const vectorRepo = new QdrantVectorRepository();
  const embeddingsService = new OpenAIEmbeddingsService();
  const hybridSearch = new HybridSearchService(vectorRepo, embeddingsService);

  // Rebuild BM25 index
  console.log('\nRebuilding BM25 index...');
  await hybridSearch.rebuildIndex();

  const query = 'beach vacation in Spain';
  console.log(`\nSearching: "${query}"`);

  const results = await hybridSearch.search(query, { limit: 5 });

  console.log(`\nResults (${results.length}):`);
  for (const result of results) {
    console.log(`  - ${result.payload.title}`);
    console.log(`    Destination: ${result.payload.destination}`);
    console.log(`    Scores: semantic=${result.scores.semantic.toFixed(3)}, lexical=${result.scores.lexical.toFixed(3)}, rrf=${result.scores.rrf.toFixed(3)}`);
  }
}

async function testFullPipeline() {
  console.log('\n🚀 Testing Full Advanced RAG Pipeline');
  console.log('═'.repeat(50));

  // Initialize services
  const vectorRepo = new QdrantVectorRepository();
  const embeddingsService = new OpenAIEmbeddingsService();
  const hybridSearch = new HybridSearchService(vectorRepo, embeddingsService);
  const reranker = createReranker();

  // Rebuild index
  console.log('\nInitializing...');
  await hybridSearch.rebuildIndex();

  // Create pipeline
  const pipeline = new AdvancedRAGPipeline(
    hybridSearch,
    {
      enableSelfQuery: true,
      enableQueryRewriting: true,
      enableQueryExpansion: true,
      enableMultiQuery: false, // Keep off for speed
      enableReranking: true,
      limit: 5,
    },
    reranker,
    embeddingsService
  );

  // Test queries
  for (const query of TEST_QUERIES.slice(0, 2)) {
    console.log(`\n${'─'.repeat(50)}`);
    console.log(`Query: "${query}"`);
    console.log('─'.repeat(50));

    const result = await pipeline.retrieve(query);

    console.log(`\nStages executed: ${result.stagesExecuted.join(' → ')}`);
    console.log(`Execution time: ${result.executionTimeMs}ms`);

    if (result.selfQuery) {
      console.log(`\nSelf-Query:`);
      console.log(`  Semantic: "${result.selfQuery.semanticQuery}"`);
      console.log(`  Filters:`, result.selfQuery.filters);
    }

    if (result.rewrittenQuery) {
      console.log(`\nRewritten: "${result.rewrittenQuery}"`);
    }

    console.log(`\nResults (${result.results.length}):`);
    for (const r of result.results) {
      console.log(`  - ${r.payload.title} (${r.payload.destination})`);
      console.log(`    Budget: €${r.payload.total_budget} (${r.payload.budget_category})`);
      console.log(`    Score: ${r.score.toFixed(3)}`);
    }
  }
}

async function main() {
  console.log('🧪 Advanced RAG Pipeline Tests');
  console.log('═'.repeat(50));
  console.log(`Using model: ${config.model_name}`);

  try {
    // Test individual components
    await testSelfQuery();
    await testQueryRewriting();
    await testQueryExpansion();

    // Test hybrid search
    await testHybridSearch();

    // Test full pipeline
    await testFullPipeline();

    console.log('\n' + '═'.repeat(50));
    console.log('✅ All tests completed!');
    console.log('═'.repeat(50));
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

main();
