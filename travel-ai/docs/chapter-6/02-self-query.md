# Self-Query: Automatic Filter Extraction

## The Problem

Users write natural language queries that mix **what they want** with **constraints**:

```
"cheap beach vacation in Spain under 2000€"
```

This query contains:
- **Semantic intent**: "beach vacation"
- **Structured filters**: destination=Spain, budget_max=2000, budget_category=economy

If we send the entire query to vector search, it tries to match "2000€" semantically, which doesn't make sense.

---

## The Solution: Self-Query

Self-Query uses an LLM to parse the natural language query and extract:

1. **Semantic query** → sent to vector search
2. **Structured filters** → applied as metadata filters

```
User Query: "cheap beach vacation in Spain under 2000€"
                           │
                           ▼
                    ┌─────────────┐
                    │ LLM Parser  │
                    └──────┬──────┘
                           │
              ┌────────────┴────────────┐
              ▼                         ▼
      Semantic Query              Structured Filters
    "beach vacation"           {
                                 destination: "Spain",
                                 budget_max: 2000,
                                 budget_category: "economy"
                               }
```

---

## Implementation

### Step 1: Define the Filter Schema

```typescript
// ai/retrieval/self-query-parser.ts

export interface ExtractedFilters {
  destination?: string;
  budget_min?: number;
  budget_max?: number;
  budget_category?: 'economy' | 'standard' | 'premium';
  min_duration?: number;
  max_duration?: number;
  departure_city?: string;
  num_people?: number;
}

export interface SelfQueryResult {
  semanticQuery: string;
  filters: ExtractedFilters;
  confidence: number;
  originalQuery: string;
}
```

### Step 2: Create the Prompt

```typescript
// ai/retrieval/prompts/self-query.prompt.ts

export const SELF_QUERY_SYSTEM_PROMPT = `You are a query parser for a travel search system.
Your job is to analyze user queries and extract:
1. The semantic search query (what the user wants to find conceptually)
2. Structured filters (specific constraints that can be applied to metadata)

Available metadata fields for filtering:
- destination: string (country or city name)
- budget_min: number (minimum budget in euros)
- budget_max: number (maximum budget in euros)
- budget_category: "economy" | "standard" | "premium"
- min_duration: number (minimum trip duration in days)
- max_duration: number (maximum trip duration in days)
- departure_city: string (city of departure)
- num_people: number (number of travelers)

Rules:
1. Extract ONLY filters that are explicitly mentioned or strongly implied
2. The semantic query should capture the conceptual intent
3. Convert relative terms to filters:
   - "cheap", "budget", "affordable" → budget_category: "economy"
   - "luxury", "premium" → budget_category: "premium"
   - "short trip", "weekend" → max_duration: 3-4
4. Normalize destination names (e.g., "España" → "Spain")

Respond with valid JSON only.`;

export const SELF_QUERY_USER_TEMPLATE = `Parse this travel search query:

Query: "{query}"

Respond with JSON:
{
  "semanticQuery": "the conceptual search query",
  "filters": { ... },
  "confidence": 0.0-1.0
}`;
```

### Step 3: Build the Parser

```typescript
// ai/retrieval/self-query-parser.ts

import { ChatAnthropic } from '@langchain/anthropic';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';

export class SelfQueryParser {
  private llm: ChatAnthropic;
  private cache: Map<string, SelfQueryResult> = new Map();

  constructor() {
    this.llm = new ChatAnthropic({
      modelName: 'claude-3-haiku-20240307',  // Fast & cheap for parsing
      temperature: 0,  // Deterministic output
    });
  }

  async parse(query: string): Promise<SelfQueryResult> {
    // Check cache first
    const cached = this.cache.get(query.toLowerCase());
    if (cached) return cached;

    // Prepare prompt
    const userPrompt = SELF_QUERY_USER_TEMPLATE.replace('{query}', query);

    // Call LLM
    const response = await this.llm.invoke([
      new SystemMessage(SELF_QUERY_SYSTEM_PROMPT),
      new HumanMessage(userPrompt),
    ]);

    // Parse JSON response
    const parsed = this.parseJsonResponse(response.content as string);

    const result: SelfQueryResult = {
      semanticQuery: parsed.semanticQuery || query,
      filters: this.validateFilters(parsed.filters || {}),
      confidence: parsed.confidence ?? 0.8,
      originalQuery: query,
    };

    // Cache result
    this.cache.set(query.toLowerCase(), result);

    return result;
  }

  private validateFilters(filters: Partial<ExtractedFilters>): ExtractedFilters {
    const validated: ExtractedFilters = {};

    if (filters.destination && typeof filters.destination === 'string') {
      validated.destination = filters.destination.trim();
    }

    if (filters.budget_max && typeof filters.budget_max === 'number') {
      validated.budget_max = filters.budget_max;
    }

    if (filters.budget_category &&
        ['economy', 'standard', 'premium'].includes(filters.budget_category)) {
      validated.budget_category = filters.budget_category;
    }

    // ... validate other fields

    return validated;
  }
}
```

---

## Usage Examples

### Example 1: Budget Query

```typescript
const parser = new SelfQueryParser();

const result = await parser.parse('cheap beach vacation in Spain under 2000€');

console.log(result);
// {
//   semanticQuery: "beach vacation",
//   filters: {
//     destination: "Spain",
//     budget_max: 2000,
//     budget_category: "economy"
//   },
//   confidence: 0.95,
//   originalQuery: "cheap beach vacation in Spain under 2000€"
// }
```

### Example 2: Luxury Query

```typescript
const result = await parser.parse('luxury romantic trip to Paris for 2 people');

// {
//   semanticQuery: "romantic trip",
//   filters: {
//     destination: "Paris",
//     budget_category: "premium",
//     num_people: 2
//   },
//   confidence: 0.9
// }
```

### Example 3: Duration Query

```typescript
const result = await parser.parse('week-long cultural tour of Italy');

// {
//   semanticQuery: "cultural tour",
//   filters: {
//     destination: "Italy",
//     min_duration: 7
//   },
//   confidence: 0.85
// }
```

### Example 4: No Filters

```typescript
const result = await parser.parse('adventure travel');

// {
//   semanticQuery: "adventure travel",
//   filters: {},
//   confidence: 0.95
// }
```

---

## Integration with Search

```typescript
// Using Self-Query with Hybrid Search

async function searchWithSelfQuery(userQuery: string) {
  // Step 1: Parse query
  const parser = new SelfQueryParser();
  const { semanticQuery, filters } = await parser.parse(userQuery);

  // Step 2: Convert to search filters
  const searchFilters = {
    destination: filters.destination,
    budget_category: filters.budget_category,
  };

  // Step 3: Search with semantic query + filters
  const results = await hybridSearch.search(semanticQuery, {
    limit: 10,
    filters: searchFilters,
  });

  return results;
}
```

---

## Filter Mapping

The Self-Query parser extracts filters, but your vector DB may have different field names:

```typescript
// Convert ExtractedFilters to VectorSearchFilter
toVectorSearchFilter(filters: ExtractedFilters): VectorSearchFilter {
  return {
    destination: filters.destination,
    budget_category: filters.budget_category,
// Note: budget_min/max require range queries

### Currency contract

Trip payloads and self-query budget predicates are expressed in euros (`EUR`).
The parser rejects another currency explicitly; it never silently compares USD,
GBP or other amounts as if they were euros. Currency conversion requires a
separate, versioned exchange-rate service and is outside this sample.
    // which need special handling in Qdrant
  };
}
```

---

## Best Practices

### 1. Use a Fast Model

Self-Query adds latency. Use a fast model like `claude-3-haiku`:

```typescript
this.llm = new ChatAnthropic({
  modelName: 'claude-3-haiku-20240307',
  temperature: 0,
});
```

### 2. Cache Results

Same queries should return same filters:

```typescript
private cache: Map<string, SelfQueryResult> = new Map();

// Check cache before calling LLM
const cached = this.cache.get(query.toLowerCase());
if (cached) return cached;
```

### 3. Validate Filters

Don't trust LLM output blindly:

```typescript
private validateFilters(filters: any): ExtractedFilters {
  const validated: ExtractedFilters = {};

  // Type check each field
  if (typeof filters.budget_max === 'number' && filters.budget_max > 0) {
    validated.budget_max = filters.budget_max;
  }

  // Enum validation
  if (['economy', 'standard', 'premium'].includes(filters.budget_category)) {
    validated.budget_category = filters.budget_category;
  }

  return validated;
}
```

### 4. Handle Failures Gracefully

If parsing fails, fall back to the original query:

```typescript
try {
  const result = await parser.parse(query);
  return result;
} catch (error) {
  // Fallback: use original query with no filters
  return {
    semanticQuery: query,
    filters: {},
    confidence: 0,
    originalQuery: query,
  };
}
```

---

## Confidence Score

The confidence score indicates how certain the parser is about its extraction:

| Confidence | Meaning |
|------------|---------|
| 0.9 - 1.0 | High confidence, clear filters |
| 0.7 - 0.9 | Moderate confidence, some inference |
| < 0.7 | Low confidence, consider not filtering |

```typescript
// Only apply filters if confidence is high enough
if (result.confidence >= 0.7) {
  searchOptions.filters = result.filters;
}
```

---

## Key Takeaways

1. **Self-Query separates intent from constraints**
2. **Use a fast, cheap model** (Haiku) for parsing
3. **Cache results** to avoid repeated LLM calls
4. **Validate all extracted filters** before using them
5. **Fall back gracefully** when parsing fails
6. **Confidence scores** help decide when to apply filters
