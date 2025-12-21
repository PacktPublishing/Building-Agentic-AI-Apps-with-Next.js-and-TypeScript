/**
 * RAG Evaluator
 *
 * Runs evaluation of RAG pipeline against test dataset
 * and computes metrics.
 */

import { ChatAnthropic } from '@langchain/anthropic';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { config } from '@/config';
import type { IHybridSearchService } from '@/lib/domain/search/hybrid-search.interface';
import type { TestQuery } from './test-dataset';
import {
  calculateRetrievalMetrics,
  averageMetrics,
  formatMetrics,
  type RetrievalMetrics,
  type EvalRetrievalResult,
} from './metrics';
import {
  populateRelevantTripIds,
  fetchAllTrips,
  findRelevantTrips,
  type TripRecord,
} from './relevance-matcher';

/**
 * Evaluation result for a single query
 */
export interface QueryEvalResult {
  query: TestQuery;
  retrievedIds: string[];
  metrics: RetrievalMetrics;
  executionTimeMs: number;
}

/**
 * Overall evaluation results
 */
export interface EvaluationResults {
  /** Individual query results */
  queryResults: QueryEvalResult[];
  /** Aggregate metrics */
  aggregateMetrics: RetrievalMetrics;
  /** Metrics by category */
  metricsByCategory: Record<string, RetrievalMetrics>;
  /** Metrics by difficulty */
  metricsByDifficulty: Record<string, RetrievalMetrics>;
  /** Total evaluation time */
  totalTimeMs: number;
  /** Timestamp */
  timestamp: string;
}

/**
 * LLM-as-Judge result for generation quality
 */
export interface GenerationEvalResult {
  /** Faithfulness score (0-1) - is the answer grounded in retrieved docs? */
  faithfulness: number;
  /** Relevance score (0-1) - does the answer address the query? */
  relevance: number;
  /** Context precision (0-1) - are retrieved docs relevant? */
  contextPrecision: number;
  /** Explanation from LLM judge */
  explanation: string;
}

/**
 * Evaluator configuration
 */
interface EvaluatorConfig {
  /** K value for metrics */
  k?: number;
  /** Whether to run LLM-based generation evaluation */
  evaluateGeneration?: boolean;
  /** Model for LLM judge */
  judgeModel?: string;
}

const LLM_JUDGE_PROMPT = `You are an evaluation judge for a travel search system.
Evaluate the quality of the search results and any generated response.

Score each dimension from 0.0 to 1.0:
1. Faithfulness: Is the response accurate and grounded in the retrieved documents?
2. Relevance: Does the response address the user's query?
3. Context Precision: Are the retrieved documents relevant to the query?

Respond in JSON format:
{
  "faithfulness": 0.0-1.0,
  "relevance": 0.0-1.0,
  "contextPrecision": 0.0-1.0,
  "explanation": "Brief explanation of scores"
}`;

/**
 * RAG Evaluator
 *
 * Evaluates RAG pipeline quality using:
 * 1. Retrieval metrics (Precision, Recall, MRR, NDCG)
 * 2. LLM-as-Judge for generation quality
 */
export class RAGEvaluator {
  private searchService: IHybridSearchService;
  private llmJudge: ChatAnthropic;
  private k: number;
  private shouldEvaluateGeneration: boolean;
  private allTrips: TripRecord[] | null = null;

  constructor(
    searchService: IHybridSearchService,
    evalConfig: EvaluatorConfig = {}
  ) {
    this.searchService = searchService;
    this.k = evalConfig.k ?? 5;
    this.shouldEvaluateGeneration = evalConfig.evaluateGeneration ?? false;

    this.llmJudge = new ChatAnthropic({
      modelName: evalConfig.judgeModel || 'claude-3-haiku-20240307',
      temperature: 0,
      anthropicApiKey: config.anthropic_api_key,
    });
  }

  /**
   * Load all trips from Qdrant (for relevance matching)
   */
  async loadTrips(): Promise<void> {
    if (this.allTrips === null) {
      console.log('📦 Loading trips from Qdrant for relevance matching...');
      this.allTrips = await fetchAllTrips();
      console.log(`   Found ${this.allTrips.length} trips\n`);
    }
  }

  /**
   * Run evaluation on a set of test queries
   */
  async evaluate(testQueries: TestQuery[]): Promise<EvaluationResults> {
    console.log(`🔍 Starting RAG evaluation on ${testQueries.length} queries\n`);

    // Load trips for relevance matching
    await this.loadTrips();

    // Populate relevantTripIds based on relevance rules
    console.log('🎯 Matching trips to queries based on relevance rules...');
    let queriesWithMatches = 0;
    for (const query of testQueries) {
      if (query.relevanceRules && this.allTrips) {
        query.relevantTripIds = findRelevantTrips(query, this.allTrips);
        if (query.relevantTripIds.length > 0) {
          queriesWithMatches++;
        }
      }
    }
    console.log(`   ${queriesWithMatches}/${testQueries.length} queries have matching trips\n`);

    const startTime = Date.now();
    const queryResults: QueryEvalResult[] = [];

    for (let i = 0; i < testQueries.length; i++) {
      const testQuery = testQueries[i];
      console.log(`[${i + 1}/${testQueries.length}] "${testQuery.query}"`);
      console.log(`  Relevant IDs: ${testQuery.relevantTripIds.length} trips`);

      const result = await this.evaluateQuery(testQuery);
      queryResults.push(result);

      // Show which retrieved IDs matched
      const relevantSet = new Set(testQuery.relevantTripIds);
      const matchedIds = result.retrievedIds.filter((id) => relevantSet.has(id));

      console.log(`  Retrieved: ${result.retrievedIds.length} | Matched: ${matchedIds.length}`);
      console.log(`  P@${this.k}: ${(result.metrics.precisionAtK * 100).toFixed(1)}%`);
      console.log(`  MRR: ${result.metrics.mrr.toFixed(3)} | Hit: ${result.metrics.hitRate > 0 ? 'Yes' : 'No'}`);
    }

    // Calculate aggregate metrics
    const allMetrics = queryResults.map((r) => r.metrics);
    const aggregateMetrics = averageMetrics(allMetrics);

    // Calculate metrics by category
    const metricsByCategory: Record<string, RetrievalMetrics> = {};
    const categories = [...new Set(testQueries.map((q) => q.category))];
    for (const category of categories) {
      const categoryResults = queryResults.filter(
        (r) => r.query.category === category
      );
      metricsByCategory[category] = averageMetrics(
        categoryResults.map((r) => r.metrics)
      );
    }

    // Calculate metrics by difficulty
    const metricsByDifficulty: Record<string, RetrievalMetrics> = {};
    const difficulties = [...new Set(testQueries.map((q) => q.difficulty))];
    for (const difficulty of difficulties) {
      const diffResults = queryResults.filter(
        (r) => r.query.difficulty === difficulty
      );
      metricsByDifficulty[difficulty] = averageMetrics(
        diffResults.map((r) => r.metrics)
      );
    }

    const totalTimeMs = Date.now() - startTime;

    return {
      queryResults,
      aggregateMetrics,
      metricsByCategory,
      metricsByDifficulty,
      totalTimeMs,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Evaluate a single query
   */
  private async evaluateQuery(testQuery: TestQuery): Promise<QueryEvalResult> {
    const startTime = Date.now();

    // Run search
    const results = await this.searchService.search(testQuery.query, {
      limit: this.k * 2, // Get more than K to evaluate ranking
    });

    const retrievedIds = results.map((r) => r.id);

    // Convert to eval format
    const evalResults: EvalRetrievalResult[] = results.map((r) => ({
      id: r.id,
      score: r.score,
    }));

    // Calculate metrics
    const relevantIds = new Set(testQuery.relevantTripIds);
    const metrics = calculateRetrievalMetrics(evalResults, relevantIds, this.k);

    return {
      query: testQuery,
      retrievedIds,
      metrics,
      executionTimeMs: Date.now() - startTime,
    };
  }

  /**
   * Evaluate generation quality using LLM-as-Judge
   */
  async evaluateGeneration(
    query: string,
    retrievedDocs: string[],
    generatedResponse: string
  ): Promise<GenerationEvalResult> {
    try {
      const prompt = `
Query: "${query}"

Retrieved Documents:
${retrievedDocs.map((d, i) => `[${i + 1}] ${d}`).join('\n')}

Generated Response:
${generatedResponse}

Evaluate the quality of this search and response:`;

      const response = await this.llmJudge.invoke([
        new SystemMessage(LLM_JUDGE_PROMPT),
        new HumanMessage(prompt),
      ]);

      const content =
        typeof response.content === 'string' ? response.content : '';

      // Parse JSON response
      const parsed = JSON.parse(content.trim());

      return {
        faithfulness: parsed.faithfulness ?? 0,
        relevance: parsed.relevance ?? 0,
        contextPrecision: parsed.contextPrecision ?? 0,
        explanation: parsed.explanation ?? '',
      };
    } catch (error) {
      console.error('❌ Generation evaluation failed:', error);
      return {
        faithfulness: 0,
        relevance: 0,
        contextPrecision: 0,
        explanation: 'Evaluation failed',
      };
    }
  }

  /**
   * Format evaluation results for display
   */
  formatResults(results: EvaluationResults): string {
    let output = `
=====================================
RAG Evaluation Results
=====================================
Timestamp: ${results.timestamp}
Total Time: ${(results.totalTimeMs / 1000).toFixed(2)}s
Queries Evaluated: ${results.queryResults.length}

${formatMetrics(results.aggregateMetrics)}

By Category:
`;

    for (const [category, metrics] of Object.entries(results.metricsByCategory)) {
      output += `\n  ${category.toUpperCase()}:\n`;
      output += `    P@${metrics.k}: ${(metrics.precisionAtK * 100).toFixed(1)}%`;
      output += ` | MRR: ${metrics.mrr.toFixed(3)}`;
      output += ` | NDCG: ${metrics.ndcg.toFixed(3)}\n`;
    }

    output += `\nBy Difficulty:`;

    for (const [difficulty, metrics] of Object.entries(results.metricsByDifficulty)) {
      output += `\n  ${difficulty.toUpperCase()}:\n`;
      output += `    P@${metrics.k}: ${(metrics.precisionAtK * 100).toFixed(1)}%`;
      output += ` | MRR: ${metrics.mrr.toFixed(3)}`;
      output += ` | NDCG: ${metrics.ndcg.toFixed(3)}\n`;
    }

    return output;
  }
}
