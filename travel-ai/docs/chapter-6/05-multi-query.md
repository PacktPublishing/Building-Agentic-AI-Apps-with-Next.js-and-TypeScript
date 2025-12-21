# Multi-Query Retrieval

## The Problem

A single query might not capture all the ways relevant documents could be described.

**Example:**
```
Query: "affordable Italy trip"

This query might miss documents about:
- "budget-friendly Rome vacation"
- "cheap Florence getaway"
- "economical Italian adventure"
```

Different phrasings match different documents. **Multi-Query** solves this by searching with multiple variations.

---

## How Multi-Query Works

```
User Query: "affordable Italy trip"
                   │
                   ▼
            ┌─────────────┐
            │ LLM Generate│
            │ Variations  │
            └──────┬──────┘
                   │
      ┌────────────┼────────────┐
      ▼            ▼            ▼
"budget travel  "cheap       "low-cost
 to Italy"      Italian       Rome
                vacation"     Florence"
      │            │            │
      ▼            ▼            ▼
┌──────────┐ ┌──────────┐ ┌──────────┐
│ Search 1 │ │ Search 2 │ │ Search 3 │
└────┬─────┘ └────┬─────┘ └────┬─────┘
     │            │            │
     └────────────┼────────────┘
                  ▼
           ┌───────────┐
           │ RRF Fusion│
           └─────┬─────┘
                 ▼
          Final Results
```

**Key insight**: Search with the original query + N variations, then fuse all results.

---

## Implementation

### Multi-Query Retriever

```typescript
// ai/retrieval/multi-query-retriever.ts

const MULTI_QUERY_SYSTEM_PROMPT = `You are a search query generator for a travel database.
Given a user's travel search query, generate 3 alternative versions that capture
the same intent but use different words or phrasings.

Guidelines:
1. Each variation should search for the same thing but use synonyms or rephrasings
2. Consider different aspects the user might be interested in
3. Keep the same constraints (destination, budget, etc.) if mentioned
4. Vary the level of specificity
5. Use natural search language

Output exactly 3 variations, one per line, with no numbering or bullets.`;

export class MultiQueryRetriever {
  private llm: ChatAnthropic;
  private searchService: IHybridSearchService;
  private numVariations: number;
  private resultsPerQuery: number;

  constructor(
    searchService: IHybridSearchService,
    config: MultiQueryConfig = {}
  ) {
    this.llm = new ChatAnthropic({
      modelName: config.model || 'claude-3-haiku-20240307',
      temperature: 0.5, // Some creativity for variations
    });
    this.searchService = searchService;
    this.numVariations = config.numVariations ?? 3;
    this.resultsPerQuery = config.resultsPerQuery ?? 10;
  }

  async retrieve(
    query: string,
    options?: HybridSearchOptions
  ): Promise<MultiQueryResult> {
    // Step 1: Generate query variations
    const variations = await this.generateVariations(query);
    const allQueries = [query, ...variations];

    // Step 2: Search in parallel
    const searchPromises = allQueries.map((q) =>
      this.searchService.search(q, {
        ...options,
        limit: this.resultsPerQuery,
      })
    );

    const searchResults = await Promise.all(searchPromises);

    // Step 3: Build results map (for analysis)
    const resultsByQuery = new Map<string, HybridSearchResult[]>();
    allQueries.forEach((q, i) => {
      resultsByQuery.set(q, searchResults[i]);
    });

    // Step 4: Fuse results using RRF
    const rankedLists: RankedItem[][] = searchResults.map((results) =>
      results.map((result, rank) => ({
        id: result.id,
        rank: rank + 1,
        score: result.score,
        payload: result.payload,
        source: 'semantic' as const,
      }))
    );

    const fusedResults = fuseWithRRF(rankedLists, { k: 60 });

    return {
      originalQuery: query,
      queryVariations: variations,
      results: fusedResults.slice(0, options?.limit || 10),
      resultsByQuery,
    };
  }

  private async generateVariations(query: string): Promise<string[]> {
    const response = await this.llm.invoke([
      new SystemMessage(MULTI_QUERY_SYSTEM_PROMPT),
      new HumanMessage(
        `Generate ${this.numVariations} alternative search queries for:\n\n"${query}"`
      ),
    ]);

    const content =
      typeof response.content === 'string' ? response.content : '';

    // Parse variations (one per line)
    const variations = content
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && line !== query)
      .slice(0, this.numVariations);

    return variations;
  }
}
```

### Result Interface

```typescript
export interface MultiQueryResult {
  /** Original query */
  originalQuery: string;
  /** Generated query variations */
  queryVariations: string[];
  /** Fused search results */
  results: HybridSearchResult[];
  /** Results per query variation (for analysis) */
  resultsByQuery: Map<string, HybridSearchResult[]>;
}
```

---

## Usage

### Basic Usage

```typescript
import { MultiQueryRetriever } from '@/ai/retrieval/multi-query-retriever';
import { HybridSearchService } from '@/lib/infrastructure/search/hybrid-search.service';

const searchService = new HybridSearchService(vectorRepo, embeddings);
const multiQuery = new MultiQueryRetriever(searchService);

const result = await multiQuery.retrieve('affordable Italy trip', {
  limit: 5,
});

console.log('Original:', result.originalQuery);
console.log('Variations:', result.queryVariations);
console.log('Results:', result.results.length);
```

### Analyzing Results by Query

```typescript
// See which documents came from which query
for (const [query, results] of result.resultsByQuery) {
  console.log(`\nQuery: "${query}"`);
  console.log(`  Found ${results.length} results`);
  results.slice(0, 3).forEach((r, i) => {
    console.log(`  ${i + 1}. ${r.payload.destination}`);
  });
}
```

### Preview Variations (Without Searching)

```typescript
// Just see what variations would be generated
const variations = await multiQuery.previewVariations('romantic Paris weekend');

console.log('Generated variations:');
variations.forEach((v, i) => console.log(`  ${i + 1}. ${v}`));

// Output:
// 1. "couples getaway in Paris for a short trip"
// 2. "romantic French capital weekend escape"
// 3. "love-themed Paris 2-3 day vacation"
```

---

## Example: Query Variations

### Example 1: Budget Query

```
Original: "cheap beach vacation"

Variations:
1. "budget-friendly coastal getaway"
2. "affordable seaside trip"
3. "economical beach holiday"
```

### Example 2: Activity Query

```
Original: "hiking in the mountains"

Variations:
1. "mountain trekking adventure"
2. "alpine hiking trails trip"
3. "outdoor mountaineering vacation"
```

### Example 3: Complex Query

```
Original: "romantic trip to Paris with fine dining"

Variations:
1. "couples getaway in Paris with gourmet restaurants"
2. "honeymoon in French capital with Michelin dining"
3. "love trip to Paris featuring culinary experiences"
```

---

## Why RRF for Fusion?

Multi-Query produces multiple ranked lists. RRF is ideal because:

| Challenge | RRF Solution |
|-----------|--------------|
| Different scores per query | Uses ranks, not scores |
| Same doc in multiple lists | Accumulates scores |
| Different result sets | Only counts appearances |

### Fusion Example

Document "Trip to Rome" appears:
- Rank 1 in "affordable Italy trip" results
- Rank 3 in "budget-friendly Rome vacation" results
- Not found in "cheap Florence getaway" results

```
RRF = 1/(60+1) + 1/(60+3)
    = 0.0164 + 0.0159
    = 0.0323
```

This document ranks higher than one appearing in only one list.

---

## Configuration Options

```typescript
interface MultiQueryConfig {
  /** Model for query generation */
  model?: string;           // Default: 'claude-3-haiku-20240307'

  /** Number of query variations to generate */
  numVariations?: number;   // Default: 3

  /** Number of results per query */
  resultsPerQuery?: number; // Default: 10
}
```

### Tuning Tips

| Parameter | Low Value | High Value |
|-----------|-----------|------------|
| numVariations | Faster, less recall | More recall, slower |
| resultsPerQuery | Fewer candidates | More candidates to fuse |

---

## Integration with Pipeline

```typescript
// In the Advanced RAG Pipeline

async retrieve(query: string): Promise<PipelineResult> {
  // ... self-query, rewriting steps ...

  // Use multi-query if enabled
  if (this.config.enableMultiQuery && this.multiQueryRetriever) {
    const multiResult = await this.multiQueryRetriever.retrieve(
      processedQuery,
      { limit: 20, filters }
    );

    // Use fused results for reranking
    searchResults = multiResult.results;

    // Log variations for debugging
    console.log('Query variations:', multiResult.queryVariations);
  } else {
    searchResults = await this.hybridSearch.search(processedQuery, {
      limit: 20,
      filters,
    });
  }

  // ... reranking step ...
}
```

---

## Performance Considerations

### Parallel Execution

All query variations are searched in parallel:

```typescript
// This runs N searches concurrently
const searchPromises = allQueries.map((q) =>
  this.searchService.search(q, options)
);
const searchResults = await Promise.all(searchPromises);
```

### Cost Analysis

| Component | Cost/Query |
|-----------|------------|
| LLM (generate variations) | ~$0.0001 (Haiku) |
| N parallel searches | N × search cost |
| RRF fusion | Negligible |

### When to Use Multi-Query

**Use when:**
- Recall is important (don't miss relevant docs)
- Queries are short or ambiguous
- Users use varying vocabulary

**Skip when:**
- Queries are already specific
- Latency is critical
- Cost optimization needed

---

## Comparison: With vs Without

### Without Multi-Query

```
Query: "affordable Rome trip"
→ Found 5 results about Rome

Missed:
- "Budget vacation to Italian capital"
- "Cheap Roma getaway" (different spelling)
```

### With Multi-Query

```
Original: "affordable Rome trip"
Variation 1: "budget-friendly Italian capital vacation"
Variation 2: "cheap Roma getaway"
Variation 3: "economical trip to Rome Italy"

→ Found 12 unique results (fused from 4 searches)
→ Better coverage of relevant documents
```

---

## Key Takeaways

1. **Multi-Query improves recall** by searching with query variations
2. **LLM generates variations** capturing different phrasings
3. **Parallel search** keeps latency reasonable
4. **RRF fusion** intelligently combines results
5. **Best for** short/ambiguous queries where recall matters
6. **Trade-off**: More API calls for better coverage

