# Query Enhancement: Rewriting, Expansion, and HyDE

## The Problem

User queries are often:
- **Too short**: "cheap rome"
- **Ambiguous**: "nice trip"
- **Missing context**: "beach" (beach what? where?)

These queries produce suboptimal embeddings and poor retrieval results.

---

## Three Techniques

| Technique | What it does | When to use |
|-----------|--------------|-------------|
| **Query Rewriting** | Reformulates short/ambiguous queries | Short queries < 20 chars |
| **Query Expansion** | Adds synonyms and related terms | Lexical search (BM25) |
| **HyDE** | Generates hypothetical document | Complex semantic queries |

---

## 1. Query Rewriting

### Concept

Use an LLM to expand a short query into a more descriptive search query.

```
"cheap rome" → "budget-friendly trip to Rome, Italy with affordable hotels and activities"
```

### Implementation

```typescript
// ai/retrieval/query-rewriter.ts

const REWRITE_SYSTEM_PROMPT = `You are a search query optimizer for a travel search system.
Rewrite short or ambiguous queries into more descriptive search queries.

Guidelines:
1. Expand abbreviations ("NYC" → "New York City")
2. Add relevant context for vague queries
3. Clarify travel-related terms
4. Keep the original intent
5. Aim for 1-2 sentences

Respond with ONLY the rewritten query.`;

export class QueryRewriter {
  private llm: ChatAnthropic;
  private minLengthToRewrite: number;

  constructor(config: { minLengthToRewrite?: number } = {}) {
    this.llm = new ChatAnthropic({
      modelName: 'claude-3-haiku-20240307',
      temperature: 0.3,  // Slight creativity for expansion
    });
    this.minLengthToRewrite = config.minLengthToRewrite ?? 20;
  }

  async rewrite(query: string): Promise<QueryRewriteResult> {
    // Skip if already descriptive
    if (query.length >= this.minLengthToRewrite && this.isDescriptive(query)) {
      return {
        originalQuery: query,
        rewrittenQuery: query,
        wasModified: false,
      };
    }

    const response = await this.llm.invoke([
      new SystemMessage(REWRITE_SYSTEM_PROMPT),
      new HumanMessage(`Rewrite: "${query}"`),
    ]);

    const rewritten = response.content as string;

    return {
      originalQuery: query,
      rewrittenQuery: rewritten.trim(),
      wasModified: rewritten.toLowerCase() !== query.toLowerCase(),
    };
  }

  private isDescriptive(query: string): boolean {
    const words = query.split(/\s+/).filter(w => w.length > 2);
    return words.length >= 5;
  }
}
```

### Examples

```typescript
const rewriter = new QueryRewriter();

await rewriter.rewrite('cheap rome');
// → "budget-friendly trip to Rome, Italy with affordable hotels and activities"

await rewriter.rewrite('beach spain');
// → "beach vacation in Spain with seaside resorts and water activities"

await rewriter.rewrite('paris honeymoon');
// → "romantic honeymoon getaway in Paris, France with luxury hotels and fine dining"
```

---

## 2. Query Expansion

### Concept

Add synonyms and related terms to improve lexical (BM25) matching.

```
"cheap beach" → "cheap beach budget affordable economical coastal seaside ocean"
```

### Implementation

```typescript
// ai/retrieval/query-expander.ts

const TRAVEL_SYNONYMS: Record<string, string[]> = {
  // Budget terms
  cheap: ['budget', 'affordable', 'economical', 'low-cost', 'inexpensive'],
  luxury: ['premium', 'high-end', 'upscale', 'deluxe', 'five-star'],

  // Trip types
  beach: ['coastal', 'seaside', 'ocean', 'beachfront', 'tropical'],
  romantic: ['honeymoon', 'couples', 'intimate', 'getaway'],
  adventure: ['exciting', 'thrill', 'extreme', 'outdoor'],
  cultural: ['heritage', 'historical', 'museum', 'art'],

  // Duration
  weekend: ['short', 'quick', 'brief', '2-day', '3-day'],

  // Activities
  hiking: ['trekking', 'walking', 'trails', 'mountains'],
  food: ['culinary', 'gastronomy', 'cuisine', 'dining'],
};

const DESTINATION_ALIASES: Record<string, string[]> = {
  paris: ['france', 'french'],
  rome: ['italy', 'italian', 'roma'],
  barcelona: ['spain', 'spanish', 'catalonia'],
};

export class QueryExpander {
  private maxSynonymsPerTerm: number;

  constructor(config: { maxSynonymsPerTerm?: number } = {}) {
    this.maxSynonymsPerTerm = config.maxSynonymsPerTerm ?? 3;
  }

  expand(query: string): QueryExpansionResult {
    const words = query.toLowerCase().split(/\s+/);
    const expandedTerms: string[] = [];

    for (const word of words) {
      // Check travel synonyms
      if (TRAVEL_SYNONYMS[word]) {
        expandedTerms.push(
          ...TRAVEL_SYNONYMS[word].slice(0, this.maxSynonymsPerTerm)
        );
      }

      // Check destination aliases
      if (DESTINATION_ALIASES[word]) {
        expandedTerms.push(
          ...DESTINATION_ALIASES[word].slice(0, this.maxSynonymsPerTerm)
        );
      }
    }

    // Remove duplicates and terms already in query
    const uniqueTerms = [...new Set(expandedTerms)]
      .filter(term => !query.toLowerCase().includes(term));

    return {
      originalQuery: query,
      expandedTerms: uniqueTerms,
      expandedQuery: uniqueTerms.length > 0
        ? `${query} ${uniqueTerms.join(' ')}`
        : query,
    };
  }
}
```

### Examples

```typescript
const expander = new QueryExpander();

expander.expand('cheap beach vacation in Spain');
// {
//   originalQuery: "cheap beach vacation in Spain",
//   expandedTerms: ["budget", "affordable", "economical", "coastal", "seaside", "ocean"],
//   expandedQuery: "cheap beach vacation in Spain budget affordable economical coastal seaside ocean"
// }

expander.expand('luxury romantic trip to Paris');
// {
//   expandedTerms: ["premium", "high-end", "upscale", "honeymoon", "couples", "love", "france", "french"],
//   expandedQuery: "luxury romantic trip to Paris premium high-end upscale honeymoon couples love france french"
// }
```

---

## 3. HyDE (Hypothetical Document Embeddings)

### Concept

Instead of embedding the query directly, we:
1. Generate a **hypothetical document** that would answer the query
2. Embed that document
3. Search using the document's embedding

### Why HyDE Works

Documents are more similar to other documents than they are to short queries.

```
Query: "romantic Paris getaway"
         ↓
HyDE Document: "A 5-day romantic trip to Paris for couples, including
               Eiffel Tower dinner, Seine river cruise, boutique hotel
               in Le Marais, budget around €3000..."
         ↓
Embedding of HyDE document → Search
```

### Implementation

```typescript
// ai/retrieval/hyde-generator.ts

const HYDE_SYSTEM_PROMPT = `You are a travel content writer.
Given a search query, write a detailed trip description that would perfectly match.

Include:
- Destination details
- Duration and timing
- Type of activities
- Accommodation style
- Budget range (if implied)
- Who the trip is suitable for

Write 2-3 paragraphs, natural and descriptive.`;

export class HyDEGenerator {
  private llm: ChatAnthropic;
  private embeddingsService: IEmbeddingsService;

  constructor(embeddingsService: IEmbeddingsService) {
    this.llm = new ChatAnthropic({
      modelName: 'claude-3-haiku-20240307',
      temperature: 0.7,  // Creative for document generation
    });
    this.embeddingsService = embeddingsService;
  }

  async generate(query: string): Promise<HyDEResult> {
    // Step 1: Generate hypothetical document
    const response = await this.llm.invoke([
      new SystemMessage(HYDE_SYSTEM_PROMPT),
      new HumanMessage(`Write a trip description for: "${query}"`),
    ]);

    const hypotheticalDocument = response.content as string;

    // Step 2: Embed the hypothetical document
    const embedding = await this.embeddingsService.generate(hypotheticalDocument);

    return {
      originalQuery: query,
      hypotheticalDocument,
      embedding,
    };
  }
}
```

### Example

```typescript
const hyde = new HyDEGenerator(embeddingsService);

const result = await hyde.generate('romantic Paris getaway');

console.log(result.hypotheticalDocument);
// "Discover the magic of Paris with this enchanting 5-day romantic
// getaway designed for couples. Stay in a charming boutique hotel in
// the heart of Le Marais, wake up to fresh croissants from the local
// boulangerie, and spend your days exploring iconic landmarks like
// the Eiffel Tower and Montmartre. Enjoy a sunset Seine river cruise,
// indulge in fine French cuisine at intimate bistros, and create
// unforgettable memories in the City of Light. This premium experience
// is perfect for honeymooners or couples celebrating anniversaries,
// with a budget of approximately €3,500 for two."

// The embedding of this rich document will match similar trip descriptions
// better than the short query "romantic Paris getaway"
```

---

## Combining Techniques

### The Query Enhancement Pipeline

```
User Query: "cheap rome"
         │
         ▼
┌─────────────────┐
│ Query Rewriting │ → "budget-friendly trip to Rome with affordable hotels"
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Query Expansion │ → Adds: "italy italian budget economical low-cost"
└────────┬────────┘
         │
         ▼
    Enhanced Query → Used for BM25 search
```

### When to Use Each

| Technique | Latency | Cost | Best For |
|-----------|---------|------|----------|
| Rewriting | ~500ms | LLM call | Short/ambiguous queries |
| Expansion | <1ms | None | Improving recall |
| HyDE | ~1s | LLM call | Complex semantic queries |

### Implementation

```typescript
// Combine rewriting and expansion
async function enhanceQuery(query: string): Promise<string> {
  // Step 1: Rewrite if short
  const rewriter = new QueryRewriter();
  const { rewrittenQuery } = await rewriter.rewrite(query);

  // Step 2: Expand with synonyms
  const expander = new QueryExpander();
  const { expandedQuery } = expander.expand(rewrittenQuery);

  return expandedQuery;
}

// Usage
const enhanced = await enhanceQuery('cheap rome');
// "budget-friendly trip to Rome Italy with affordable hotels budget economical low-cost italy italian roma"
```

---

## Performance Considerations

### 1. Rewriting Adds Latency

Only rewrite short queries:

```typescript
if (query.length < 20) {
  query = await rewriter.rewrite(query);
}
```

### 2. Expansion is Free

Query expansion is in-memory, use it always:

```typescript
const expanded = expander.expand(query);  // ~1ms
```

### 3. HyDE is Expensive

Use HyDE only for complex queries where standard search fails:

```typescript
// Try standard search first
let results = await search(query);

// If poor results, try HyDE
if (results.length < 3 || results[0].score < 0.5) {
  const hyde = await hydeGenerator.generate(query);
  results = await searchWithEmbedding(hyde.embedding);
}
```

---

## Key Takeaways

1. **Query Rewriting** improves short/ambiguous queries with LLM
2. **Query Expansion** adds synonyms for better BM25 recall (free)
3. **HyDE** generates hypothetical documents for better semantic matching
4. **Combine techniques** based on query characteristics
5. **Balance latency vs quality** - not all queries need all enhancements
