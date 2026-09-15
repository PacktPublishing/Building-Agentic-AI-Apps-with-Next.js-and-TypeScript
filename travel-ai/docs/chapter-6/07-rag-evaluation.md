# RAG Evaluation & Metrics

## Why Evaluate RAG?

Without evaluation, you're flying blind:

- Is my retrieval actually finding relevant documents?
- Are results ranked correctly?
- Is hybrid search better than vector-only?
- Did reranking help or hurt?

**Evaluation answers**: "Is my RAG system working well, and where can I improve?"

---

## Two Types of Metrics

### 1. Retrieval Metrics
Measure how well documents are **found and ranked**.

| Metric | What it measures |
|--------|------------------|
| **Precision@K** | % of top-K results that are relevant |
| **Recall@K** | % of relevant docs found in top-K |
| **MRR** | Position of first relevant result |
| **NDCG** | Quality of ranking order |
| **Hit Rate** | Did we find ANY relevant doc? |

### 2. Generation Metrics (LLM-as-Judge)
Measure the **quality of generated responses**.

| Metric | What it measures |
|--------|------------------|
| **Faithfulness** | Is the answer grounded in retrieved docs? |
| **Relevance** | Does the answer address the query? |
| **Context Precision** | Are retrieved docs relevant to query? |

---

## Retrieval Metrics Implementation

### Data Structures

```typescript
// lib/evaluation/metrics.ts

export interface EvalRetrievalResult {
  id: string;
  score: number;
  isRelevant?: boolean;
}

export interface RetrievalMetrics {
  /** Precision at K - ratio of relevant docs in top K */
  precisionAtK: number;
  /** Recall at K - ratio of relevant docs retrieved */
  recallAtK: number;
  /** Mean Reciprocal Rank - inverse of first relevant doc position */
  mrr: number;
  /** Normalized Discounted Cumulative Gain */
  ndcg: number;
  /** Hit Rate - whether any relevant doc was found */
  hitRate: number;
  /** K value used */
  k: number;
}
```

### Precision@K

**Formula**: `Precision@K = (# relevant in top K) / K`

```typescript
export function precisionAtK(
  results: EvalRetrievalResult[],
  relevantIds: Set<string>,
  k: number
): number {
  const topK = results.slice(0, k);
  const relevantInTopK = topK.filter((r) => relevantIds.has(r.id)).length;
  return relevantInTopK / k;
}
```

**Example**:
```
Top 5 results: [Doc1, Doc2, Doc3, Doc4, Doc5]
Relevant:      [Doc1,       Doc3            ]

Precision@5 = 2/5 = 0.4 (40%)
```

---

### Recall@K

**Formula**: `Recall@K = (# relevant in top K) / (total # relevant)`

```typescript
export function recallAtK(
  results: EvalRetrievalResult[],
  relevantIds: Set<string>,
  k: number
): number {
  if (relevantIds.size === 0) return 0;

  const topK = results.slice(0, k);
  const relevantInTopK = topK.filter((r) => relevantIds.has(r.id)).length;
  return relevantInTopK / relevantIds.size;
}
```

**Example**:
```
All relevant docs: [Doc1, Doc3, Doc7, Doc9] (4 total)
Found in top 5:    [Doc1, Doc3]             (2 found)

Recall@5 = 2/4 = 0.5 (50%)
```

---

### Mean Reciprocal Rank (MRR)

**Formula**: `MRR = 1 / (position of first relevant result)`

```typescript
export function meanReciprocalRank(
  results: EvalRetrievalResult[],
  relevantIds: Set<string>
): number {
  for (let i = 0; i < results.length; i++) {
    if (relevantIds.has(results[i].id)) {
      return 1 / (i + 1);
    }
  }
  return 0;
}
```

**Examples**:
```
First relevant at position 1: MRR = 1/1 = 1.0
First relevant at position 2: MRR = 1/2 = 0.5
First relevant at position 5: MRR = 1/5 = 0.2
No relevant found:            MRR = 0
```

**Interpretation**: Higher MRR = relevant results appear earlier.

---

### NDCG (Normalized Discounted Cumulative Gain)

**Formula**: `NDCG = DCG / IDCG`

Rewards relevant documents appearing higher in the ranking.

```typescript
export function ndcg(
  results: EvalRetrievalResult[],
  relevantIds: Set<string>,
  k: number
): number {
  // Calculate DCG (Discounted Cumulative Gain)
  let dcg = 0;
  const topK = results.slice(0, k);

  for (let i = 0; i < topK.length; i++) {
    const relevance = relevantIds.has(topK[i].id) ? 1 : 0;
    // DCG formula: rel_i / log2(i + 2)
    dcg += relevance / Math.log2(i + 2);
  }

  // Calculate IDCG (Ideal DCG - all relevant at top)
  const idealRelevance = Array(Math.min(relevantIds.size, k)).fill(1);
  let idcg = 0;
  for (let i = 0; i < idealRelevance.length; i++) {
    idcg += idealRelevance[i] / Math.log2(i + 2);
  }

  if (idcg === 0) return 0;
  return dcg / idcg;
}
```

**Example**:
```
Results: [Relevant, NotRel, Relevant, NotRel, NotRel]

DCG = 1/log2(2) + 0/log2(3) + 1/log2(4) + 0/log2(5) + 0/log2(6)
    = 1.0 + 0 + 0.5 + 0 + 0
    = 1.5

Ideal (all relevant at top): [Relevant, Relevant, ...]
IDCG = 1/log2(2) + 1/log2(3) = 1.0 + 0.63 = 1.63

NDCG = 1.5 / 1.63 = 0.92
```

---

### Hit Rate

**Formula**: `1 if any relevant doc in top K, else 0`

```typescript
export function hitRate(
  results: EvalRetrievalResult[],
  relevantIds: Set<string>,
  k: number
): number {
  const topK = results.slice(0, k);
  return topK.some((r) => relevantIds.has(r.id)) ? 1 : 0;
}
```

**Interpretation**: What percentage of queries found at least one relevant result?

---

### Calculate All Metrics

```typescript
export function calculateRetrievalMetrics(
  results: EvalRetrievalResult[],
  relevantIds: Set<string>,
  k: number
): RetrievalMetrics {
  return {
    precisionAtK: precisionAtK(results, relevantIds, k),
    recallAtK: recallAtK(results, relevantIds, k),
    mrr: meanReciprocalRank(results, relevantIds),
    ndcg: ndcg(results, relevantIds, k),
    hitRate: hitRate(results, relevantIds, k),
    k,
  };
}
```

---

## Test Dataset

### Structure

```typescript
// lib/evaluation/test-dataset.ts

export interface TestQuery {
  /** Unique ID for this test case */
  id: string;
  /** Natural language query */
  query: string;
  /** IDs of trips that are relevant to this query */
  relevantTripIds: string[];
  /** Expected filters (for self-query testing) */
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
}
```

### Example Test Queries

```typescript
export const TEST_QUERIES: TestQuery[] = [
  // Destination queries
  {
    id: 'dest-1',
    query: 'Trip to Paris',
    relevantTripIds: ['trip-paris-1', 'trip-paris-2'],
    expectedFilters: { destination: 'Paris' },
    category: 'destination',
    difficulty: 'easy',
  },
  {
    id: 'dest-2',
    query: 'Beach vacation in Spain',
    relevantTripIds: ['trip-barcelona-1', 'trip-malaga-1'],
    expectedFilters: { destination: 'Spain' },
    category: 'destination',
    difficulty: 'easy',
  },

  // Budget queries
  {
    id: 'budget-1',
    query: 'Cheap weekend getaway',
    relevantTripIds: ['trip-economy-1', 'trip-economy-2'],
    expectedFilters: { budget_category: 'economy', max_duration: 3 },
    category: 'budget',
    difficulty: 'easy',
  },
  {
    id: 'budget-2',
    query: 'Luxury vacation under 5000 euros',
    relevantTripIds: ['trip-premium-1'],
    expectedFilters: { budget_category: 'premium' },
    category: 'budget',
    difficulty: 'medium',
  },

  // Complex queries (multiple criteria)
  {
    id: 'complex-1',
    query: 'Affordable beach vacation in Greece for a week',
    relevantTripIds: ['trip-greece-beach-economy'],
    expectedFilters: {
      destination: 'Greece',
      budget_category: 'economy',
      min_duration: 7,
    },
    category: 'complex',
    difficulty: 'hard',
  },
];
```

### Helper Functions

```typescript
// Get test queries by category
export function getQueriesByCategory(category: TestQuery['category']): TestQuery[] {
  return TEST_QUERIES.filter((q) => q.category === category);
}

// Get test queries by difficulty
export function getQueriesByDifficulty(difficulty: TestQuery['difficulty']): TestQuery[] {
  return TEST_QUERIES.filter((q) => q.difficulty === difficulty);
}
```

---

## RAG Evaluator

### Evaluator Class

```typescript
// lib/evaluation/evaluator.ts

export class RAGEvaluator {
  private searchService: IHybridSearchService;
  private llmJudge: ChatAnthropic;
  private k: number;
  private shouldEvaluateGeneration: boolean;

  constructor(
    searchService: IHybridSearchService,
    config: EvaluatorConfig = {}
  ) {
    this.searchService = searchService;
    this.k = config.k ?? 5;
    this.shouldEvaluateGeneration = config.evaluateGeneration ?? false;

    this.llmJudge = new ChatAnthropic({
      modelName: config.judgeModel || 'claude-3-haiku-20240307',
      temperature: 0,
    });
  }

  async evaluate(testQueries: TestQuery[]): Promise<EvaluationResults> {
    console.log(`Starting RAG evaluation on ${testQueries.length} queries\n`);

    const startTime = Date.now();
    const queryResults: QueryEvalResult[] = [];

    for (let i = 0; i < testQueries.length; i++) {
      const testQuery = testQueries[i];
      console.log(`[${i + 1}/${testQueries.length}] "${testQuery.query}"`);

      const result = await this.evaluateQuery(testQuery);
      queryResults.push(result);

      console.log(`  P@${this.k}: ${(result.metrics.precisionAtK * 100).toFixed(1)}%`);
      console.log(`  MRR: ${result.metrics.mrr.toFixed(3)}`);
    }

    // Calculate aggregate metrics
    const allMetrics = queryResults.map((r) => r.metrics);
    const aggregateMetrics = averageMetrics(allMetrics);

    // Calculate metrics by category
    const metricsByCategory = this.groupMetricsByField(
      queryResults,
      (r) => r.query.category
    );

    // Calculate metrics by difficulty
    const metricsByDifficulty = this.groupMetricsByField(
      queryResults,
      (r) => r.query.difficulty
    );

    return {
      queryResults,
      aggregateMetrics,
      metricsByCategory,
      metricsByDifficulty,
      totalTimeMs: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    };
  }

  private async evaluateQuery(testQuery: TestQuery): Promise<QueryEvalResult> {
    const startTime = Date.now();

    // Run search
    const results = await this.searchService.search(testQuery.query, {
      limit: this.k * 2,
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
}
```

---

## LLM-as-Judge

For evaluating generation quality when you have LLM responses:

```typescript
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

async evaluateGeneration(
  query: string,
  retrievedDocs: string[],
  generatedResponse: string
): Promise<GenerationEvalResult> {
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

  const content = typeof response.content === 'string' ? response.content : '';
  const parsed = JSON.parse(content.trim());

  return {
    faithfulness: parsed.faithfulness ?? 0,
    relevance: parsed.relevance ?? 0,
    contextPrecision: parsed.contextPrecision ?? 0,
    explanation: parsed.explanation ?? '',
  };
}
```

---

## Running Evaluations

### Evaluation Script

```typescript
// scripts/evaluate-rag.ts

async function main() {
  console.log('RAG Evaluation Script');
  console.log('========================\n');

  // Initialize services
  const vectorRepository = new QdrantVectorRepository();
  const embeddingsService = new OpenAIEmbeddingsService();
  const hybridSearchService = new HybridSearchService(
    vectorRepository,
    embeddingsService
  );

  // Rebuild BM25 index
  console.log('Rebuilding BM25 index...');
  await hybridSearchService.rebuildIndex();

  // Create evaluator
  const evaluator = new RAGEvaluator(hybridSearchService, { k: 5 });

  // Run evaluation
  const results = await evaluator.evaluate(TEST_QUERIES);

  // Print results
  console.log(evaluator.formatResults(results));

  // Summary
  const agg = results.aggregateMetrics;

  if (agg.hitRate >= 0.8) {
    console.log('Hit Rate is good - relevant docs are being found');
  } else {
    console.log('Hit Rate is low - consider improving recall');
  }

  if (agg.mrr >= 0.5) {
    console.log('MRR is good - relevant docs appear near the top');
  } else {
    console.log('MRR is low - consider adding reranking');
  }
}

main();
```

### Running

```bash
cd travel-ai
pnpm tsx scripts/evaluate-rag.ts

# With options
pnpm tsx scripts/evaluate-rag.ts --k=10
pnpm tsx scripts/evaluate-rag.ts --category=destination
pnpm tsx scripts/evaluate-rag.ts --difficulty=hard
```

---

## Interpreting Results

### Sample Output

```
=====================================
RAG Evaluation Results
=====================================
Timestamp: 2024-03-15T10:30:00.000Z
Total Time: 12.45s
Queries Evaluated: 16

Retrieval Metrics (K=5):
  Precision@5: 45.0%
  Recall@5:    62.5%
  MRR:         0.678
  NDCG:        0.712
  Hit Rate:    87.5%

By Category:

  DESTINATION:
    P@5: 60.0% | MRR: 0.833 | NDCG: 0.856

  BUDGET:
    P@5: 40.0% | MRR: 0.556 | NDCG: 0.623

  COMPLEX:
    P@5: 30.0% | MRR: 0.467 | NDCG: 0.534

By Difficulty:

  EASY:
    P@5: 55.0% | MRR: 0.778 | NDCG: 0.812

  MEDIUM:
    P@5: 40.0% | MRR: 0.611 | NDCG: 0.689

  HARD:
    P@5: 25.0% | MRR: 0.389 | NDCG: 0.456
```

### What the Numbers Mean

| Metric | Good | Needs Work |
|--------|------|------------|
| Precision@5 | > 50% | < 30% |
| Recall@5 | > 70% | < 50% |
| MRR | > 0.6 | < 0.4 |
| NDCG | > 0.7 | < 0.5 |
| Hit Rate | > 80% | < 60% |

---

## Improvement Strategies

Based on evaluation results:

| Problem | Suggested Fix |
|---------|---------------|
| Low Hit Rate | Improve recall: multi-query, query expansion |
| Low MRR | Add reranking to push relevant docs up |
| Low Precision | Better filtering, self-query |
| Hard queries fail | Query rewriting, HyDE |
| Budget queries weak | Improve self-query filter extraction |

---

## A/B Testing Different Configurations

```typescript
async function compareConfigurations() {
  const configs = [
    { name: 'Vector Only', enableBM25: false, enableReranking: false },
    { name: 'Hybrid Search', enableBM25: true, enableReranking: false },
    { name: 'Hybrid + Reranking', enableBM25: true, enableReranking: true },
    { name: 'Full Pipeline', enableBM25: true, enableReranking: true, enableMultiQuery: true },
  ];

  for (const config of configs) {
    const pipeline = new AdvancedRAGPipeline(config);
    const evaluator = new RAGEvaluator(pipeline);

    const results = await evaluator.evaluate(TEST_QUERIES);

    console.log(`\n${config.name}:`);
    console.log(`  MRR: ${results.aggregateMetrics.mrr.toFixed(3)}`);
    console.log(`  P@5: ${(results.aggregateMetrics.precisionAtK * 100).toFixed(1)}%`);
  }
}
```

---

## Key Takeaways

1. **Measure before optimizing** - know your baseline
2. **Precision vs Recall** - often a trade-off
3. **MRR matters** - users care about top results
4. **Segment by difficulty** - easy queries should work well
5. **LLM-as-Judge** - for evaluating generated responses
6. **A/B test configurations** - compare different setups
7. **Track over time** - regression testing

## Reproducible evaluation contract

Run `pnpm evaluate:rag --k=5` for the hybrid baseline, or add `--advanced` to
evaluate the actual `AdvancedRAGPipeline`. Add `--min-hit-rate=0.8` or
`--min-mrr=0.5` in CI to fail on a configured regression. `--category` and
`--difficulty` are intersected when both are supplied.

The bundled `relevanceRules` are heuristic diagnostics and are not a reviewed
ground-truth judgment set. Reports must label them as heuristic, retain all
matching positives, and keep the dataset/corpus version alongside results.
Retrieval metrics (precision, recall, MRR, NDCG and hit rate) are separate from
the optional paid LLM-as-judge generation scores.

For latency comparisons, use `benchmarkRetrieval` with the same fixed query set
and report the selected configuration and result counts. Timing is local
diagnostic evidence only; provider cost and quality require separately budgeted
live evaluation.
