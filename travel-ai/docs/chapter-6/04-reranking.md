# Reranking with Cross-Encoders

## The Problem

Initial retrieval (BM25 + Vector) returns many candidates, but they're not always in the best order.

**Why?**
- Bi-encoders (used in vector search) encode query and documents **separately**
- They can't capture fine-grained interactions between query and document
- They optimize for speed, not precision

---

## Bi-Encoders vs Cross-Encoders

### Bi-Encoder (Vector Search)

```
Query: "romantic Paris trip"    Document: "5-day Paris getaway..."
         │                                    │
         ▼                                    ▼
    ┌─────────┐                         ┌─────────┐
    │ Encoder │                         │ Encoder │
    └────┬────┘                         └────┬────┘
         │                                    │
         ▼                                    ▼
   Query Embedding              Document Embedding
   [0.1, 0.3, ...]              [0.2, 0.4, ...]
         │                                    │
         └──────────────┬─────────────────────┘
                        ▼
                Cosine Similarity
```

**Pros**: Fast (encode once, compare many)
**Cons**: Limited interaction modeling

### Cross-Encoder (Reranker)

```
Query: "romantic Paris trip"  +  Document: "5-day Paris getaway..."
                    │
                    ▼
            ┌──────────────┐
            │ Cross-Encoder │
            │   (BERT-like) │
            └──────┬───────┘
                   │
                   ▼
            Relevance Score: 0.92
```

**Pros**: High accuracy (sees both together)
**Cons**: Slow (must run for each query-document pair)

---

## The Reranking Pattern

```
Query
  │
  ▼
┌────────────────┐
│ Initial Search │  ← Fast (Hybrid Search)
│   (Top 20-50)  │
└───────┬────────┘
        │
        ▼
┌────────────────┐
│   Reranker     │  ← Accurate (Cross-Encoder)
│   (Top 5-10)   │
└───────┬────────┘
        │
        ▼
   Final Results
```

**Key insight**: Rerank only the top candidates, not the entire database.

---

## Implementation

### Reranker Interface

```typescript
// lib/domain/reranking/reranker.interface.ts

export interface RerankDocument {
  id: string;
  text: string;
  metadata?: Record<string, unknown>;
}

export interface RerankResult {
  id: string;
  text: string;
  relevanceScore: number;  // 0-1, higher is better
  originalRank: number;    // Position before reranking
  newRank: number;         // Position after reranking
  metadata?: Record<string, unknown>;
}

export interface IRerankerService {
  rerank(
    query: string,
    documents: RerankDocument[],
    options?: { topN?: number; minScore?: number }
  ): Promise<RerankResult[]>;
}
```

### Cohere Reranker

Cohere offers a state-of-the-art reranking API:

```typescript
// lib/infrastructure/reranking/cohere-reranker.ts

export class CohereReranker implements IRerankerService {
  private apiKey: string;
  private model: string;
  private endpoint: string;

  constructor(config: { apiKey?: string; model?: string } = {}) {
    this.apiKey = config.apiKey || process.env.COHERE_API_KEY || '';
    this.model = config.model || 'rerank-v3.5';
    this.endpoint = 'https://api.cohere.ai/v1/rerank';
  }

  async rerank(
    query: string,
    documents: RerankDocument[],
    options: { topN?: number } = {}
  ): Promise<RerankResult[]> {
    const { topN = 5 } = options;

    // Call Cohere API
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        query,
        documents: documents.map(d => d.text),
        top_n: topN,
      }),
    });

    const data = await response.json();

    // Map results back to documents
    return data.results.map((result: any, newIndex: number) => ({
      id: documents[result.index].id,
      text: documents[result.index].text,
      relevanceScore: result.relevance_score,
      originalRank: result.index + 1,
      newRank: newIndex + 1,
      metadata: documents[result.index].metadata,
    }));
  }
}
```

### LLM-based Reranker (Fallback)

When Cohere isn't available, use Claude:

```typescript
// lib/infrastructure/reranking/llm-reranker.ts

const RERANK_SYSTEM_PROMPT = `You are a relevance scorer for a travel search system.
Score how relevant the trip is to the query from 0.0 to 1.0.

- 1.0 = Perfect match
- 0.7-0.9 = Very relevant
- 0.4-0.6 = Somewhat relevant
- 0.1-0.3 = Weakly relevant
- 0.0 = Not relevant

Respond with ONLY a number.`;

export class LLMReranker implements IRerankerService {
  private llm: ChatAnthropic;

  constructor() {
    this.llm = new ChatAnthropic({
      modelName: 'claude-3-haiku-20240307',
      temperature: 0,
    });
  }

  async rerank(
    query: string,
    documents: RerankDocument[],
    options: { topN?: number } = {}
  ): Promise<RerankResult[]> {
    const { topN = 5 } = options;

    // Score each document in parallel
    const scores = await Promise.all(
      documents.map(doc => this.scoreDocument(query, doc))
    );

    // Combine scores with documents
    const scored = documents.map((doc, i) => ({
      doc,
      score: scores[i],
      originalRank: i + 1,
    }));

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    // Return top N
    return scored.slice(0, topN).map((item, newIndex) => ({
      id: item.doc.id,
      text: item.doc.text,
      relevanceScore: item.score,
      originalRank: item.originalRank,
      newRank: newIndex + 1,
      metadata: item.doc.metadata,
    }));
  }

  private async scoreDocument(
    query: string,
    document: RerankDocument
  ): Promise<number> {
    const response = await this.llm.invoke([
      new SystemMessage(RERANK_SYSTEM_PROMPT),
      new HumanMessage(`Query: "${query}"\n\nTrip: ${document.text}\n\nScore:`),
    ]);

    const score = parseFloat(response.content as string);
    return isNaN(score) ? 0.5 : Math.max(0, Math.min(1, score));
  }
}
```

### Factory Function

```typescript
// lib/infrastructure/reranking/index.ts

export function createReranker(): IRerankerService {
  if (process.env.COHERE_API_KEY) {
    console.log('Using Cohere Reranker');
    return new CohereReranker();
  }

  console.log('Using LLM Reranker (Cohere not configured)');
  return new LLMReranker();
}
```

---

## Usage

### Basic Usage

```typescript
import { createReranker } from '@/lib/infrastructure/reranking';

const reranker = createReranker();

// Get initial results from hybrid search
const initialResults = await hybridSearch.search('romantic Paris trip', {
  limit: 20,  // Fetch more for reranking
});

// Prepare documents for reranking
const documents = initialResults.map(r => ({
  id: r.id,
  text: r.payload.summary_text,
  metadata: r.payload,
}));

// Rerank
const reranked = await reranker.rerank('romantic Paris trip', documents, {
  topN: 5,
});

// See how positions changed
for (const result of reranked) {
  console.log(`${result.id}: ${result.originalRank} → ${result.newRank}`);
  console.log(`  Score: ${result.relevanceScore}`);
}
```

### With Pipeline

```typescript
// In the Advanced RAG Pipeline

async retrieve(query: string): Promise<PipelineResult> {
  // ... self-query, rewriting, etc.

  // Step 4: Initial search (get more than needed)
  const searchResults = await this.hybridSearch.search(processedQuery, {
    limit: 20,  // Fetch 20 for reranking
  });

  // Step 5: Rerank to get final top 5
  if (this.config.enableReranking && this.reranker) {
    const documents = searchResults.map(r => ({
      id: r.id,
      text: r.payload.summary_text,
      metadata: r.payload,
    }));

    const reranked = await this.reranker.rerank(
      selfQuery.semanticQuery,  // Use semantic query for reranking
      documents,
      { topN: 5 }
    );

    // Map back to HybridSearchResult format
    return reranked.map(r => ({
      ...searchResults.find(s => s.id === r.id)!,
      score: r.relevanceScore,
    }));
  }

  return searchResults.slice(0, 5);
}
```

---

## Comparison: Cohere vs LLM

| Aspect | Cohere | LLM (Claude) |
|--------|--------|--------------|
| **Speed** | ~200ms for 20 docs | ~2-3s for 20 docs |
| **Cost** | ~$0.001/query | Included in Claude usage |
| **Accuracy** | Optimized for reranking | Good, but not specialized |
| **Setup** | Requires API key | Uses existing Claude key |

### When to Use Each

- **Cohere**: Production, high-volume, speed-critical
- **LLM**: Development, low-volume, no additional API key

---

## Best Practices

### 1. Rerank Enough Candidates

```typescript
// Too few - might miss good results
const initial = await search(query, { limit: 5 });  // ❌

// Better - rerank from larger pool
const initial = await search(query, { limit: 20 });  // ✅
const final = await reranker.rerank(query, initial, { topN: 5 });
```

### 2. Use Semantic Query for Reranking

```typescript
// If using self-query, rerank with the semantic part
const { semanticQuery, filters } = await parser.parse(userQuery);

const results = await search(semanticQuery, { filters, limit: 20 });
const reranked = await reranker.rerank(semanticQuery, results);  // ✅
```

### 3. Set Minimum Score Threshold

```typescript
const reranked = await reranker.rerank(query, documents, {
  topN: 10,
  minScore: 0.3,  // Filter out low-relevance results
});
```

### 4. Handle Reranker Failures

```typescript
try {
  return await reranker.rerank(query, documents);
} catch (error) {
  console.error('Reranking failed, using initial results');
  return documents.slice(0, 5).map((d, i) => ({
    ...d,
    relevanceScore: 1 - i * 0.1,  // Fake scores
    originalRank: i + 1,
    newRank: i + 1,
  }));
}
```

---

## Impact Example

### Before Reranking

```
Query: "family-friendly Barcelona trip"

1. Trip to Barcelona (BCN) - 2 people, premium     ← Not family
2. Trip to Barcelona (BCN) - 3 people, standard   ← Maybe family
3. Trip to Madrid (MAD) - 4 people, economy       ← Wrong city
4. Trip to Barcelona (BCN) - 4 people, economy    ← Good match!
5. Trip to Lisbon (LIS) - 2 people, standard      ← Wrong city
```

### After Reranking

```
Query: "family-friendly Barcelona trip"

1. Trip to Barcelona (BCN) - 4 people, economy    ← Best match
2. Trip to Barcelona (BCN) - 3 people, standard   ← Good match
3. Trip to Barcelona (BCN) - 2 people, premium    ← OK match
4. Trip to Madrid (MAD) - 4 people, economy       ← Demoted
5. Trip to Lisbon (LIS) - 2 people, standard      ← Demoted
```

---

## Key Takeaways

1. **Reranking improves precision** by using more accurate cross-encoders
2. **Two-stage retrieval**: fast initial search → accurate reranking
3. **Cohere** is fast and accurate, **LLM** is a good fallback
4. **Rerank more than you need** to find the best results
5. **Use semantic query** (not the full user query with filters)
