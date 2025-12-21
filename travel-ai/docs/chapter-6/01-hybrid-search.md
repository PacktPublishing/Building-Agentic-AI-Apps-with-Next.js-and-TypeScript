# Hybrid Search: Combining Lexical and Semantic Search

## The Problem with Single Search Methods

Traditional search systems face a fundamental trade-off:

| Method | Strengths | Weaknesses |
|--------|-----------|------------|
| **Lexical (BM25)** | Exact keyword matching, fast | Misses synonyms and semantic meaning |
| **Semantic (Vector)** | Understands meaning and context | Can miss exact terms, expensive |

**Example:**
- Query: "cheap beach vacation in Spain"
- Lexical finds: documents containing "cheap", "beach", "vacation", "Spain"
- Semantic finds: documents about "affordable coastal trips in Barcelona"

Neither alone is perfect. **Hybrid Search** combines both.

---

## How Hybrid Search Works

```
User Query
    │
    ├──────────────────┬──────────────────┐
    ▼                  ▼                  │
┌─────────────┐  ┌─────────────┐          │
│   BM25      │  │   Vector    │          │
│  (Lexical)  │  │ (Semantic)  │          │
└──────┬──────┘  └──────┬──────┘          │
       │                │                 │
       ▼                ▼                 │
   Ranked List 1   Ranked List 2         │
       │                │                 │
       └────────┬───────┘                 │
                ▼                         │
        ┌───────────────┐                 │
        │  RRF Fusion   │ ◄───────────────┘
        └───────┬───────┘
                ▼
         Final Results
```

---

## BM25: The Lexical Component

BM25 (Best Matching 25) is a probabilistic ranking function based on term frequency.

### Formula

```
score(D, Q) = Σ IDF(qi) × (f(qi, D) × (k1 + 1)) / (f(qi, D) + k1 × (1 - b + b × |D|/avgdl))
```

Where:
- `f(qi, D)` = frequency of term qi in document D
- `|D|` = document length
- `avgdl` = average document length
- `k1` = term frequency saturation (typically 1.2)
- `b` = length normalization (typically 0.75)

### Implementation in Travel-AI

```typescript
// lib/infrastructure/search/bm25-index.ts

export class BM25Index {
  private documents: Map<string, IndexedDocument> = new Map();
  private documentFrequency: Map<string, number> = new Map();
  private averageDocLength: number = 0;
  private config: BM25Config;

  constructor(config: Partial<BM25Config> = {}) {
    this.config = {
      k1: config.k1 ?? 1.2,  // Term frequency saturation
      b: config.b ?? 0.75,   // Length normalization
    };
  }

  /**
   * Tokenize text into terms
   */
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')  // Remove punctuation
      .split(/\s+/)              // Split on whitespace
      .filter((term) => term.length > 1);  // Remove single chars
  }

  /**
   * Calculate BM25 score for a query against a document
   */
  private calculateBM25Score(queryTerms: string[], doc: IndexedDocument): number {
    const N = this.documents.size;
    const { k1, b } = this.config;

    let score = 0;

    for (const term of queryTerms) {
      const tf = doc.termFrequencies.get(term) || 0;
      if (tf === 0) continue;

      const df = this.documentFrequency.get(term) || 0;

      // IDF component
      const idf = Math.log((N - df + 0.5) / (df + 0.5) + 1);

      // TF component with length normalization
      const tfNormalized =
        (tf * (k1 + 1)) /
        (tf + k1 * (1 - b + b * (doc.length / this.averageDocLength)));

      score += idf * tfNormalized;
    }

    return score;
  }

  /**
   * Search the index
   */
  search(query: string, limit: number = 10): LexicalSearchResult[] {
    const queryTerms = this.tokenize(query);
    const results: LexicalSearchResult[] = [];

    for (const doc of this.documents.values()) {
      const score = this.calculateBM25Score(queryTerms, doc);
      if (score > 0) {
        results.push({ id: doc.id, score, payload: doc.payload });
      }
    }

    return results.sort((a, b) => b.score - a.score).slice(0, limit);
  }
}
```

---

## Reciprocal Rank Fusion (RRF)

RRF combines rankings from multiple sources without requiring score normalization.

### Formula

```
RRF(d) = Σ 1 / (k + rank_i(d))
```

Where:
- `k` = constant (typically 60)
- `rank_i(d)` = rank of document d in list i (1-indexed)

### Why RRF?

| Problem | RRF Solution |
|---------|--------------|
| Different score scales | Uses ranks, not scores |
| Missing documents | Only adds score for lists where doc appears |
| Bias towards one method | Equal weighting by default |

### Implementation

```typescript
// lib/infrastructure/search/rrf.ts

const DEFAULT_K = 60;

/**
 * Fuse multiple ranked lists using Reciprocal Rank Fusion
 */
export function fuseWithRRF(
  rankedLists: RankedItem[][],
  config: Partial<RRFConfig> = {}
): HybridSearchResult[] {
  const k = config.k ?? DEFAULT_K;

  // Map to accumulate scores
  const scoreMap = new Map<string, {
    rrfScore: number;
    semanticScore: number;
    lexicalScore: number;
    payload: TripVectorPayload;
  }>();

  // Process each ranked list
  for (const rankedList of rankedLists) {
    for (const item of rankedList) {
      const existing = scoreMap.get(item.id);

      if (existing) {
        // Add to existing RRF score
        existing.rrfScore += 1 / (k + item.rank);

        // Update source-specific scores
        if (item.source === 'semantic') {
          existing.semanticScore = Math.max(existing.semanticScore, item.score);
        } else {
          existing.lexicalScore = Math.max(existing.lexicalScore, item.score);
        }
      } else {
        // First appearance
        scoreMap.set(item.id, {
          rrfScore: 1 / (k + item.rank),
          semanticScore: item.source === 'semantic' ? item.score : 0,
          lexicalScore: item.source === 'lexical' ? item.score : 0,
          payload: item.payload,
        });
      }
    }
  }

  // Sort by RRF score (descending)
  return Array.from(scoreMap.entries())
    .map(([id, data]) => ({
      id,
      payload: data.payload,
      score: data.rrfScore,
      scores: {
        semantic: data.semanticScore,
        lexical: data.lexicalScore,
        rrf: data.rrfScore,
      },
    }))
    .sort((a, b) => b.score - a.score);
}
```

### Example Calculation

Document "Trip to Barcelona" appears:
- Rank 2 in semantic results
- Rank 1 in lexical results

```
RRF = 1/(60+2) + 1/(60+1)
    = 1/62 + 1/61
    = 0.0161 + 0.0164
    = 0.0325
```

---

## The Hybrid Search Service

```typescript
// lib/infrastructure/search/hybrid-search.service.ts

export class HybridSearchService implements IHybridSearchService {
  private bm25Index: BM25Index;

  constructor(
    private vectorRepository: IVectorRepository,
    private embeddingsService: IEmbeddingsService
  ) {
    this.bm25Index = new BM25Index();
  }

  async search(
    query: string,
    options: HybridSearchOptions = {}
  ): Promise<HybridSearchResult[]> {
    const { alpha = 0.7, limit = 10 } = options;
    const fetchLimit = Math.max(limit * 3, 20);

    // Run both searches in parallel
    const [semanticResults, lexicalResults] = await Promise.all([
      this.semanticSearch(query, fetchLimit, options.filters),
      this.lexicalSearch(query, fetchLimit, options.filters),
    ]);

    // Convert to ranked items
    const semanticRanked: RankedItem[] = semanticResults.map((r, i) => ({
      id: r.id,
      rank: i + 1,
      score: r.score,
      payload: r.payload,
      source: 'semantic' as const,
    }));

    const lexicalRanked: RankedItem[] = lexicalResults.map((r, i) => ({
      id: r.id,
      rank: i + 1,
      score: r.normalizedScore,
      payload: r.payload,
      source: 'lexical' as const,
    }));

    // Fuse results using RRF
    const fusedResults = fuseWithRRF([semanticRanked, lexicalRanked]);

    return fusedResults.slice(0, limit);
  }

  async rebuildIndex(): Promise<void> {
    // Fetch documents from Qdrant and populate BM25 index
    const queryVector = await this.embeddingsService.generate('trip travel');
    const results = await this.vectorRepository.search(queryVector, {}, 1000);

    this.bm25Index.clear();
    for (const result of results) {
      this.bm25Index.add(result.id, result.payload.summary_text, result.payload);
    }
  }
}
```

---

## Usage Example

```typescript
import { HybridSearchService } from '@/lib/infrastructure/search';
import { QdrantVectorRepository } from '@/lib/infrastructure/qdrant/vector-repository';
import { OpenAIEmbeddingsService } from '@/lib/infrastructure/embeddings/openai-service';

// Initialize
const vectorRepo = new QdrantVectorRepository();
const embeddings = new OpenAIEmbeddingsService();
const hybridSearch = new HybridSearchService(vectorRepo, embeddings);

// Rebuild BM25 index (do this once at startup)
await hybridSearch.rebuildIndex();

// Search
const results = await hybridSearch.search('beach vacation in Spain', {
  limit: 5,
  alpha: 0.7,  // 70% semantic, 30% lexical weight
});

// Results include both scores
for (const result of results) {
  console.log(`${result.payload.title}`);
  console.log(`  Semantic: ${result.scores.semantic}`);
  console.log(`  Lexical: ${result.scores.lexical}`);
  console.log(`  RRF: ${result.scores.rrf}`);
}
```

---

## When to Use Hybrid Search

| Use Case | Recommendation |
|----------|----------------|
| Exact product names/codes | High lexical weight (alpha < 0.5) |
| Conceptual queries | High semantic weight (alpha > 0.7) |
| Mixed queries | Balanced (alpha = 0.5-0.7) |
| Unknown query types | Default alpha = 0.7 works well |

---

## Key Takeaways

1. **BM25** excels at exact keyword matching
2. **Vector search** understands semantic meaning
3. **RRF** combines rankings without score normalization
4. **Hybrid search** gets the best of both worlds
5. The **alpha parameter** lets you tune the balance
