/**
 * RAG Evaluation Script
 *
 * Runs evaluation of the RAG pipeline and outputs metrics.
 * Automatically matches trips from Qdrant based on relevance rules.
 *
 * Usage: pnpm tsx scripts/evaluate-rag.ts [--k=5] [--category=destination]
 */

import * as dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { QdrantVectorRepository } from '../lib/infrastructure/qdrant/vector-repository';
import { OpenAIEmbeddingsService } from '../lib/infrastructure/embeddings/openai-service';
import { HybridSearchService } from '../lib/infrastructure/search/hybrid-search.service';
import { AdvancedRAGPipeline } from '../ai/retrieval/advanced-rag-pipeline';
import { AdvancedPipelineEvaluationAdapter } from '../lib/evaluation/advanced-pipeline-adapter';
import { RAGEvaluator } from '../lib/evaluation/evaluator';
import {
  TEST_QUERIES,
  getQueriesByCategory,
  getQueriesByDifficulty,
} from '../lib/evaluation/test-dataset';

// Parse command line arguments
const args = process.argv.slice(2);
const kArg = args.find((arg) => arg.startsWith('--k='));
const categoryArg = args.find((arg) => arg.startsWith('--category='));
const difficultyArg = args.find((arg) => arg.startsWith('--difficulty='));
const verboseArg = args.includes('--verbose');
const advancedArg = args.includes('--advanced');
const minHitArg = args.find((arg) => arg.startsWith('--min-hit-rate='));
const minMrrArg = args.find((arg) => arg.startsWith('--min-mrr='));

const k = kArg ? parseInt(kArg.split('=')[1], 10) : 5;
const category = categoryArg ? categoryArg.split('=')[1] : undefined;
const difficulty = difficultyArg ? difficultyArg.split('=')[1] : undefined;

async function main() {
  console.log('🔍 RAG Evaluation Script');
  console.log('========================\n');

  // Initialize services
  const vectorRepository = new QdrantVectorRepository();
  const embeddingsService = new OpenAIEmbeddingsService();
  const hybridSearchService = new HybridSearchService(
    vectorRepository,
    embeddingsService
  );

  // Rebuild BM25 index
  console.log('📊 Rebuilding BM25 index...');
  await hybridSearchService.rebuildIndex();
  console.log('');

  // Create evaluator
  const searchService = advancedArg
    ? new AdvancedPipelineEvaluationAdapter(new AdvancedRAGPipeline(hybridSearchService, { limit: k }))
    : hybridSearchService;
  const evaluator = new RAGEvaluator(searchService, { k });

  // Select test queries
  let testQueries = TEST_QUERIES;

  if (category) {
    testQueries = getQueriesByCategory(category as any);
    console.log(`📋 Filtering by category: ${category}`);
  }

  if (difficulty) {
    testQueries = testQueries.filter((q) => q.difficulty === difficulty);
    console.log(`📋 Filtering by difficulty: ${difficulty}`);
  }

  console.log(`📋 Running ${advancedArg ? 'advanced pipeline' : 'hybrid baseline'} evaluation on ${testQueries.length} queries (K=${k})\n`);
  console.log('📚 Judgment mode: heuristic diagnostics from relevanceRules (not reviewed labels)');

  // Note: relevantTripIds are now populated automatically by the evaluator
  // based on relevanceRules defined in test-dataset.ts

  try {
    // Run evaluation
    const results = await evaluator.evaluate(testQueries);

    // Print results
    console.log(evaluator.formatResults(results));

    // Summary
    console.log('\n=====================================');
    console.log('Key Takeaways:');
    console.log('=====================================');

    const agg = results.aggregateMetrics;
    if (agg.hitRate >= 0.8) {
      console.log('✅ Hit Rate is good - relevant docs are being found');
    } else {
      console.log('⚠️  Hit Rate is low - consider improving recall');
    }

    if (agg.mrr >= 0.5) {
      console.log('✅ MRR is good - relevant docs appear near the top');
    } else {
      console.log('⚠️  MRR is low - consider adding reranking');
    }

    if (agg.precisionAtK >= 0.5) {
      console.log('✅ Precision is good - results are mostly relevant');
    } else {
      console.log('⚠️  Precision is low - consider better filtering');
    }

    const minHit = minHitArg ? Number(minHitArg.split('=')[1]) : undefined;
    const minMrr = minMrrArg ? Number(minMrrArg.split('=')[1]) : undefined;
    if ((minHit !== undefined && agg.hitRate < minHit) || (minMrr !== undefined && agg.mrr < minMrr)) {
      console.error('❌ Evaluation regression threshold failed');
      process.exitCode = 2;
    }

    console.log('\n💡 Tips for improvement:');
    console.log('   - Seed more diverse trip data (pnpm tsx scripts/seed-trips.ts --count=50)');
    console.log('   - Adjust relevance rules in lib/evaluation/test-dataset.ts');
    console.log('   - Try different alpha values for hybrid search');
    console.log('   - Enable reranking for better precision');
    console.log('   - Use query expansion for better recall');
  } catch (error) {
    console.error('❌ Evaluation failed:', error);
    process.exit(1);
  }
}

main();
