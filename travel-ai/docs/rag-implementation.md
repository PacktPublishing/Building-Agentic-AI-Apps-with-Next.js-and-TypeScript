# RAG Implementation Guide - From Zero to Semantic Search

> **Objective**: This guide teaches developers the concepts and implementation of a complete RAG (Retrieval-Augmented Generation) system.

---

## Table of Contents

1. [What is RAG?](#1-what-is-rag)
2. [Embeddings - The Heart of the System](#2-embeddings---the-heart-of-the-system)
3. [Ingestion - Storing Vector Data](#3-ingestion---storing-vector-data)
4. [Retrieval - Semantic Search](#4-retrieval---semantic-search)
5. [The Agent - Using RAG in an LLM](#5-the-agent---using-rag-in-an-llm)
6. [Complete Implementation](#6-complete-implementation)

---

## 1. What is RAG?

### The Problem with LLMs

LLMs (GPT-4, Claude, etc.) have a **fundamental limitation**: they only know what they were trained on. They cannot:

- Access your private data (user trips)
- Know recent information
- Answer questions about specific domains not covered in training

### The Solution: RAG

**RAG = Retrieval-Augmented Generation**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│   User question: "Show me trips similar to Lisbon"                          │
│                                                                              │
│                                    │                                         │
│                                    ▼                                         │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  RETRIEVAL: Search in the vector database                           │   │
│   │                                                                      │   │
│   │  "Lisbon" → [0.12, -0.34, 0.56, ...] → Similarity search            │   │
│   │                                        → Top 5 trips found           │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                         │
│                                    ▼                                         │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  AUGMENTATION: Enrich the prompt with retrieved context             │   │
│   │                                                                      │   │
│   │  "Here are the similar trips found:                                  │   │
│   │   - Trip to Barcelona, 7 days, $2500                                │   │
│   │   - Trip to Porto, 5 days, $1800                                    │   │
│   │   Answer the user based on this data."                              │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                         │
│                                    ▼                                         │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  GENERATION: The LLM generates a contextualized response            │   │
│   │                                                                      │   │
│   │  "Based on your trip to Lisbon, I recommend:                         │   │
│   │   1. Barcelona - similar vibe, beaches, architecture...             │   │
│   │   2. Porto - same country, similar culture, similar budget..."      │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Why Not a Simple SQL Search?

```sql
-- ❌ Traditional search: keyword-based
SELECT * FROM trips WHERE destination LIKE '%beach%';
-- Finds NOTHING if the user searches for "seaside vacation"
-- Doesn't understand that "Lisbon" and "Porto" are similar
```

```
-- ✅ Semantic search: meaning-based
Query: "romantic getaway Mediterranean"
Finds: Santorini, Amalfi Coast, Barcelona
→ Even if none contain the words "romantic" or "Mediterranean"
```

---

## 2. Embeddings - The Heart of the System

### What is an Embedding?

An **embedding** is a numerical representation of the **meaning** of a text. It's a vector of numbers (typically 1536 dimensions for OpenAI).

```
Text: "7-day trip to Lisbon from Paris for 2 people. Beach, culture, food."
         │
         ▼
Embedding: [0.0234, -0.0891, 0.0456, 0.1234, -0.0567, ... ] (1536 numbers)
```

### Why Does It Work?

Embeddings capture **semantic meaning**. Similar texts have close vectors:

```
"Trip to Lisbon, beach vacation"     → [0.12, -0.34, 0.56, ...]
"Voyage à Lisbonne, plage"           → [0.11, -0.33, 0.55, ...]  ← VERY CLOSE!
"Business trip to Tokyo"             → [-0.45, 0.23, -0.12, ...] ← VERY DIFFERENT
```

### How to Measure Similarity?

We use **cosine similarity** (angle between two vectors):

```
Similarity = 1.0  → Identical
Similarity = 0.9  → Very similar
Similarity = 0.5  → Little relation
Similarity = 0.0  → No relation
```

### Implementation: Embeddings Service

```typescript
// lib/infrastructure/embeddings/openai-service.ts

import OpenAI from 'openai';

export class OpenAIEmbeddingsService implements IEmbeddingsService {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Generates an embedding for a given text
   * 
   * @param text - The text to convert to a vector
   * @returns An array of 1536 numbers representing the meaning of the text
   */
  async generate(text: string): Promise<number[]> {
    const response = await this.client.embeddings.create({
      model: 'text-embedding-3-small',  // 1536 dimensions
      input: text,
    });

    return response.data[0].embedding;
    // Returns: [0.0234, -0.0891, 0.0456, ...] (1536 numbers)
  }
}
```

### Key Points About Embeddings

| Aspect | Detail |
|--------|--------|
| **Model** | `text-embedding-3-small` (OpenAI) - good quality/price ratio |
| **Dimensions** | 1536 numbers per vector |
| **Cost** | ~$0.02 per 1M tokens |
| **Latency** | ~100-200ms per request |
| **Language** | Multilingual (FR, EN, ES, etc. in the same space) |

---

## 3. Ingestion - Storing Vector Data

### The Ingestion Flow

When a user **saves a trip**, we need to:

1. Save structured data (PostgreSQL)
2. Generate a text summary of the trip
3. Convert this summary to an embedding
4. Store the embedding + metadata in Qdrant

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         INGESTION FLOW                                       │
│                                                                              │
│  Trip confirmed                                                              │
│       │                                                                      │
│       ▼                                                                      │
│  ┌─────────────┐     ┌─────────────────────────────────────────────────┐   │
│  │ PostgreSQL  │     │                    Qdrant                        │   │
│  │             │     │                                                  │   │
│  │ • id        │     │  Point {                                         │   │
│  │ • userId    │     │    id: "trip-uuid",                              │   │
│  │ • flights   │     │    vector: [0.12, -0.34, ...],  // 1536 dims    │   │
│  │ • hotels    │     │    payload: {                                    │   │
│  │ • activities│     │      trip_id: "trip-uuid",                       │   │
│  │ • budget    │     │      destination: "LIS",                         │   │
│  └─────────────┘     │      budget_category: "standard",                │   │
│                      │      summary_text: "7-day trip to Lisbon..."     │   │
│                      │    }                                              │   │
│                      │  }                                                │   │
│                      └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Why Dual Storage?

| PostgreSQL | Qdrant |
|------------|--------|
| Structured data | Semantic search |
| Relations (user → trips) | Vector similarity |
| ACID transactions | Fast approximate search (ANN) |
| Exact queries | "Fuzzy" queries by meaning |

### Implementation: Save Use Case

```typescript
// lib/application/use-cases/save-trip.use-case.ts

export class SaveTripUseCase {
  constructor(
    private tripRepository: ITripRepository,      // PostgreSQL
    private vectorRepository: IVectorRepository,  // Qdrant
    private embeddingsService: IEmbeddingsService // OpenAI
  ) {}

  async execute(data: SaveTripData): Promise<string> {
    console.log('📝 SaveTripUseCase: Starting dual-storage save...');

    // ═══════════════════════════════════════════════════════════════════
    // STEP 1: Save to PostgreSQL (structured data)
    // ═══════════════════════════════════════════════════════════════════
    console.log('1️⃣ Saving to PostgreSQL...');
    const tripId = await this.tripRepository.save(data);
    // → INSERT INTO trips (id, user_id, destination, ...) VALUES (...)

    // ═══════════════════════════════════════════════════════════════════
    // STEP 2: Generate a text summary for the embedding
    // ═══════════════════════════════════════════════════════════════════
    // 
    // WHY? The embedding must capture the "meaning" of the trip.
    // So we create a descriptive text that summarizes all key info.
    //
    console.log('2️⃣ Generating summary text...');
    const summaryText = this.generateSummaryText(data);
    // Example: "7-day trip to LIS from CDG for 2 people. 
    //           Total budget: $2950. Includes 3 flight options: TAP, Iberia.
    //           Hotels: Pestana Palace, Four Seasons. 
    //           Activities: cultural, beach, food."

    // ═══════════════════════════════════════════════════════════════════
    // STEP 3: Convert the summary to an embedding (numeric vector)
    // ═══════════════════════════════════════════════════════════════════
    console.log('3️⃣ Generating embedding...');
    const embedding = await this.embeddingsService.generate(summaryText);
    // → OpenAI API call
    // → Returns: [0.0234, -0.0891, 0.0456, ...] (1536 numbers)
    console.log(`✅ Generated embedding (${embedding.length} dimensions)`);

    // ═══════════════════════════════════════════════════════════════════
    // STEP 4: Build the payload (metadata for filtering)
    // ═══════════════════════════════════════════════════════════════════
    //
    // The payload allows FILTERING results during search.
    // Ex: "Find similar trips BUT only in 'economy'"
    //
    console.log('4️⃣ Building vector payload...');
    const payload: TripVectorPayload = {
      trip_id: tripId,
      user_id: data.userId,
      title: `Trip to ${data.formInput.destinationCity}`,
      destination: data.formInput.destinationCity,        // To filter by destination
      departure_city: data.formInput.departureCity,
      departure_date: data.formInput.departureDate,
      stay_duration: data.formInput.stayDuration,
      num_people: data.formInput.numPeople,
      budget_category: data.formInput.budgetCategory,     // To filter by budget
      total_budget: data.estimatedBudget?.totalEstimated || 0,
      summary_text: summaryText,                          // The original text
      num_flights: data.flights?.length || 0,
      num_hotels: data.hotels?.length || 0,
      num_activities: data.activities?.length || 0,
      status: 'confirmed',
      created_at: new Date().toISOString(),
      thread_id: data.threadId,
    };

    // ═══════════════════════════════════════════════════════════════════
    // STEP 5: Upsert to Qdrant (vector + payload)
    // ═══════════════════════════════════════════════════════════════════
    console.log('5️⃣ Upserting to Qdrant...');
    await this.vectorRepository.upsert(tripId, embedding, payload);
    // → The trip is now searchable by semantic similarity!

    console.log('✅ SaveTripUseCase: Dual-storage save completed!');
    return tripId;
  }

  /**
   * Generates a descriptive text of the trip for the embedding.
   * 
   * IMPORTANT: The quality of this text directly impacts the quality
   * of semantic search. It must be:
   * - Descriptive (not just keywords)
   * - Complete (all important info)
   * - Natural (like a human would describe the trip)
   */
  private generateSummaryText(data: SaveTripData): string {
    const parts = [
      `${data.formInput.stayDuration}-day trip to ${data.formInput.destinationCity}`,
      `from ${data.formInput.departureCity}`,
      `for ${data.formInput.numPeople} people`,
    ];

    if (data.estimatedBudget?.totalEstimated) {
      parts.push(`Total budget: $${data.estimatedBudget.totalEstimated}`);
    }

    if (data.flights?.length) {
      const airlines = data.flights.map(f => f.airline || 'Unknown').join(', ');
      parts.push(`Includes ${data.flights.length} flight option(s): ${airlines}`);
    }

    if (data.hotels?.length) {
      const hotelNames = data.hotels.map(h => h.name).join(', ');
      parts.push(`Hotels: ${hotelNames}`);
    }

    if (data.activities?.length) {
      const activityTypes = [...new Set(data.activities.map(a => a.type))].join(', ');
      parts.push(`Activities: ${activityTypes}`);
    }

    return parts.join('. ') + '.';
  }
}
```

### Implementation: Qdrant Repository

```typescript
// lib/infrastructure/qdrant/vector-repository.ts

import { QdrantClient } from '@qdrant/js-client-rest';

const VECTOR_SIZE = 1536;  // Size of OpenAI embeddings
const COLLECTION_NAME = 'user_trips';

export class QdrantVectorRepository implements IVectorRepository {
  private client: QdrantClient;
  private collectionCreated = false;

  constructor() {
    // Connect to Qdrant cluster (cloud or local)
    this.client = new QdrantClient({
      url: process.env.QDRANT_URL,      // https://xxx.cloud.qdrant.io:6333
      apiKey: process.env.QDRANT_API_KEY,
    });
    console.log('📊 Qdrant client initialized:', process.env.QDRANT_URL);
  }

  /**
   * Ensures the collection exists before any operation.
   * Creates the collection if it doesn't exist.
   */
  private async ensureCollection(): Promise<void> {
    if (this.collectionCreated) return;

    try {
      await this.client.getCollection(COLLECTION_NAME);
      this.collectionCreated = true;
    } catch {
      // Collection doesn't exist, create it
      console.log('📦 Creating Qdrant collection:', COLLECTION_NAME);
      await this.client.createCollection(COLLECTION_NAME, {
        vectors: {
          size: VECTOR_SIZE,    // 1536 dimensions
          distance: 'Cosine',   // Cosine similarity (best for text)
        },
      });
      this.collectionCreated = true;
    }
  }

  /**
   * Inserts or updates a point (vector + payload) in Qdrant.
   * 
   * @param tripId - The unique trip ID (used as point ID)
   * @param vector - The trip embedding (1536 dimensions)
   * @param payload - Metadata for filtering
   */
  async upsert(
    tripId: string, 
    vector: number[], 
    payload: TripVectorPayload
  ): Promise<void> {
    await this.ensureCollection();

    await this.client.upsert(COLLECTION_NAME, {
      wait: true,  // Wait for operation to be confirmed
      points: [
        {
          id: tripId,       // UUID as identifier
          vector: vector,   // [0.12, -0.34, ...] (1536 numbers)
          payload: payload, // Metadata for filtering and display
        }
      ],
    });

    console.log(`✅ Upserted trip vector to Qdrant: ${tripId}`);
  }
}
```

---

## 4. Retrieval - Semantic Search

### How Does Search Work?

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SEARCH FLOW                                          │
│                                                                              │
│  Query: "beach vacation in Europe"                                          │
│       │                                                                      │
│       ▼                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  STEP 1: Generate the query embedding                                │   │
│  │                                                                      │   │
│  │  "beach vacation in Europe" → [0.23, -0.45, 0.12, ...]              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│       │                                                                      │
│       ▼                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  STEP 2: ANN Search (Approximate Nearest Neighbors)                  │   │
│  │                                                                      │   │
│  │  Qdrant compares the query vector with ALL stored vectors            │   │
│  │  and returns the K closest (by cosine similarity)                    │   │
│  │                                                                      │   │
│  │  Query vector ──────┬──────────────────────────────────────────     │   │
│  │                     │                                                │   │
│  │  Trip Lisbon   ●────┼── distance: 0.12 → score: 0.88 ✓ TOP 1        │   │
│  │  Trip Barcelona●────┼── distance: 0.15 → score: 0.85 ✓ TOP 2        │   │
│  │  Trip Tokyo    ●────┼── distance: 0.78 → score: 0.22 ✗              │   │
│  │  Trip Porto    ●────┼── distance: 0.18 → score: 0.82 ✓ TOP 3        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│       │                                                                      │
│       ▼                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  STEP 3: Return results with scores                                  │   │
│  │                                                                      │   │
│  │  [                                                                   │   │
│  │    { trip: "Lisbon", score: 0.88, payload: {...} },                 │   │
│  │    { trip: "Barcelona", score: 0.85, payload: {...} },              │   │
│  │    { trip: "Porto", score: 0.82, payload: {...} },                  │   │
│  │  ]                                                                   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Implementation: Search Method

```typescript
// lib/infrastructure/qdrant/vector-repository.ts (continued)

export class QdrantVectorRepository implements IVectorRepository {
  // ... (constructor and upsert above)

  /**
   * Semantic search with optional filters.
   * 
   * @param queryVector - The embedding of the user query
   * @param filter - Optional filters (user_id, destination, budget)
   * @param limit - Max number of results
   * @returns The most similar trips with their scores
   */
  async search(
    queryVector: number[],
    filter: VectorSearchFilter,
    limit: number = 5
  ): Promise<VectorSearchResult[]> {
    await this.ensureCollection();

    // ═══════════════════════════════════════════════════════════════════
    // Dynamic filter construction
    // ═══════════════════════════════════════════════════════════════════
    // 
    // Filters allow COMBINING semantic search + exact criteria.
    // Ex: "Find trips similar to 'beach' BUT only in 'economy'"
    //
    const mustConditions: any[] = [];

    // Filter by user (optional)
    // If not provided, search ALL trips (discovery)
    if (filter.user_id) {
      mustConditions.push({
        key: 'user_id',
        match: { value: filter.user_id },
      });
    }

    // Filter by destination (optional)
    if (filter.destination) {
      mustConditions.push({
        key: 'destination',
        match: { value: filter.destination },
      });
    }

    // Filter by budget category (optional)
    if (filter.budget_category) {
      mustConditions.push({
        key: 'budget_category',
        match: { value: filter.budget_category },
      });
    }

    // ═══════════════════════════════════════════════════════════════════
    // Build the search query
    // ═══════════════════════════════════════════════════════════════════
    const searchParams: any = {
      vector: queryVector,  // The vector to compare
      limit,                // Max number of results
    };

    // Only add filter if there are conditions
    if (mustConditions.length > 0) {
      searchParams.filter = { must: mustConditions };
    }

    // ═══════════════════════════════════════════════════════════════════
    // Execute the search
    // ═══════════════════════════════════════════════════════════════════
    const searchResult = await this.client.search(COLLECTION_NAME, searchParams);

    // Transform Qdrant results to our format
    return searchResult.map((result) => ({
      id: result.id as string,
      score: result.score,  // Cosine similarity (0.0 - 1.0)
      payload: result.payload as TripVectorPayload,
    }));
  }

  /**
   * Retrieves a point by its ID (with its vector).
   * 
   * Used for "find similar trips": we retrieve the vector of an existing
   * trip and search for similar trips.
   */
  async getById(tripId: string): Promise<VectorPoint | null> {
    await this.ensureCollection();

    const result = await this.client.retrieve(COLLECTION_NAME, {
      ids: [tripId],
      with_vector: true,   // IMPORTANT: include the vector
      with_payload: true,
    });

    if (result.length === 0) return null;

    return {
      id: result[0].id as string,
      vector: result[0].vector as number[],  // The vector for search
      payload: result[0].payload as TripVectorPayload,
    };
  }
}
```

### Implementation: Search Use Case

```typescript
// lib/application/use-cases/search-trips.use-case.ts

export class SearchTripsUseCase implements IRetrievalService {
  constructor(
    private vectorRepository: IVectorRepository,
    private embeddingsService: IEmbeddingsService
  ) {}

  /**
   * Search trips by natural language query.
   * 
   * This is THE heart of the RAG system on the retrieval side.
   */
  async searchTrips(query: SemanticSearchQuery): Promise<RetrievalResult[]> {
    console.log(`🔍 SearchTripsUseCase: Searching for "${query.query}"`);

    try {
      // ═══════════════════════════════════════════════════════════════════
      // STEP 1: Convert the query to an embedding
      // ═══════════════════════════════════════════════════════════════════
      // 
      // The user query is in natural language.
      // We convert it to a vector to compare with stored trips.
      //
      console.log('1️⃣ Generating query embedding...');
      const queryEmbedding = await this.embeddingsService.generate(query.query);
      // "beach vacation in Europe" → [0.23, -0.45, 0.12, ...]

      // ═══════════════════════════════════════════════════════════════════
      // STEP 2: Build filters
      // ═══════════════════════════════════════════════════════════════════
      const filter: VectorSearchFilter = {
        user_id: query.userId,  // Optional: if absent, search everywhere
        destination: query.filters?.destination,
        budget_category: query.filters?.budgetCategory,
      };

      // ═══════════════════════════════════════════════════════════════════
      // STEP 3: Vector search in Qdrant
      // ═══════════════════════════════════════════════════════════════════
      console.log('2️⃣ Searching vector database...');
      const searchResults = await this.vectorRepository.search(
        queryEmbedding,
        filter,
        query.limit || 5
      );

      console.log(`✅ Found ${searchResults.length} results`);

      // ═══════════════════════════════════════════════════════════════════
      // STEP 4: Transform to business results
      // ═══════════════════════════════════════════════════════════════════
      return searchResults.map((result) => ({
        tripId: result.payload.trip_id,
        title: result.payload.title,
        destination: result.payload.destination,
        departureCity: result.payload.departure_city,
        departureDate: result.payload.departure_date,
        stayDuration: result.payload.stay_duration,
        numPeople: result.payload.num_people,
        budgetCategory: result.payload.budget_category,
        totalBudget: result.payload.total_budget,
        summaryText: result.payload.summary_text,
        relevanceScore: result.score,  // Similarity score (0-1)
        createdAt: result.payload.created_at,
      }));
    } catch (error) {
      console.error('❌ SearchTripsUseCase: Search failed', error);
      throw error;
    }
  }

  /**
   * Find trips similar to a given trip.
   * 
   * Use case: "I liked my trip to Lisbon, show me similar trips"
   */
  async findSimilarTrips(
    tripId: string,
    userId: string,
    limit: number = 3
  ): Promise<RetrievalResult[]> {
    console.log(`🔍 Finding trips similar to: ${tripId}`);

    try {
      // ═══════════════════════════════════════════════════════════════════
      // STEP 1: Retrieve the source trip vector
      // ═══════════════════════════════════════════════════════════════════
      // 
      // Instead of generating a new embedding, we REUSE the trip's existing one.
      // This is faster and more accurate.
      //
      console.log('1️⃣ Retrieving source trip vector...');
      const sourcePoint = await this.vectorRepository.getById(tripId);

      if (!sourcePoint) {
        console.warn(`⚠️ Trip ${tripId} not found in vector database`);
        return [];
      }

      // ═══════════════════════════════════════════════════════════════════
      // STEP 2: Search for similar trips with this vector
      // ═══════════════════════════════════════════════════════════════════
      console.log('2️⃣ Searching for similar trips...');
      const filter = { user_id: userId };
      
      // Request one extra result to exclude the source trip
      const searchResults = await this.vectorRepository.search(
        sourcePoint.vector,  // Use the existing vector
        filter,
        limit + 1
      );

      // ═══════════════════════════════════════════════════════════════════
      // STEP 3: Exclude the source trip and format
      // ═══════════════════════════════════════════════════════════════════
      const similarTrips = searchResults
        .filter((result) => result.id !== tripId)  // Exclude the source trip
        .slice(0, limit)
        .map((result) => ({
          tripId: result.payload.trip_id,
          title: result.payload.title,
          destination: result.payload.destination,
          // ... other fields
          relevanceScore: result.score,
        }));

      console.log(`✅ Found ${similarTrips.length} similar trips`);
      return similarTrips;
    } catch (error) {
      console.error('❌ FindSimilarTrips failed', error);
      throw error;
    }
  }
}
```

---

## 5. The Agent - Using RAG in an LLM

### Why Tools?

An LLM agent cannot directly access Qdrant. We give it **tools** that it can call:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         AGENT WITH RAG TOOLS                                 │
│                                                                              │
│  User: "Show me trips similar to my Lisbon trip"                            │
│       │                                                                      │
│       ▼                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  LLM (Claude/GPT) analyzes the request                               │   │
│  │                                                                      │   │
│  │  "The user wants trips similar to Lisbon.                            │   │
│  │   I need to use the 'search_trips' tool with query='Lisbon'"         │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│       │                                                                      │
│       ▼ Tool Call                                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  search_trips({ query: "Lisbon beach culture", limit: 5 })           │   │
│  │       │                                                              │   │
│  │       ▼                                                              │   │
│  │  SearchTripsUseCase.searchTrips()                                    │   │
│  │       │                                                              │   │
│  │       ▼                                                              │   │
│  │  Qdrant: Vector search                                               │   │
│  │       │                                                              │   │
│  │       ▼                                                              │   │
│  │  Results: [Barcelona (0.88), Porto (0.85), Seville (0.82)]          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│       │                                                                      │
│       ▼ Tool Result                                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  LLM generates the response with context                             │   │
│  │                                                                      │   │
│  │  "Based on your trip to Lisbon, here are 3 similar destinations:     │   │
│  │   1. **Barcelona** (88% similar) - Beaches, culture, gastronomy     │   │
│  │   2. **Porto** (85% similar) - Same country, similar vibe           │   │
│  │   3. **Seville** (82% similar) - Architecture, Mediterranean climate"│   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Implementation: Externalized Tools

We extract tools into a dedicated module for reusability:

```typescript
// ai/tools/retrieval-tools.ts

import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { SearchTripsUseCase } from "@/lib/application/use-cases/search-trips.use-case";
import { QdrantVectorRepository } from "@/lib/infrastructure/qdrant/vector-repository";
import { OpenAIEmbeddingsService } from "@/lib/infrastructure/embeddings/openai-service";

// ═══════════════════════════════════════════════════════════════════════════
// Lazy initialization of the use case
// ═══════════════════════════════════════════════════════════════════════════
// We only create the instance when needed (performance)
let searchTripsUseCaseInstance: SearchTripsUseCase | null = null;

function getSearchTripsUseCase(): SearchTripsUseCase {
  if (!searchTripsUseCaseInstance) {
    const vectorRepository = new QdrantVectorRepository();
    const embeddingsService = new OpenAIEmbeddingsService();
    searchTripsUseCaseInstance = new SearchTripsUseCase(
      vectorRepository, 
      embeddingsService
    );
  }
  return searchTripsUseCaseInstance;
}

// ═══════════════════════════════════════════════════════════════════════════
// TOOL 1: Semantic trip search
// ═══════════════════════════════════════════════════════════════════════════
export const searchTripsTool = new DynamicStructuredTool({
  // Tool name (used by the LLM to call it)
  name: "search_trips",
  
  // Description (the LLM uses this to decide WHEN to use this tool)
  description: `Search through all saved trips using natural language. 
    Use this to find trip inspiration, discover destinations, or find trips 
    matching specific criteria. Searches across ALL trips in the database 
    for maximum discovery.`,
  
  // Parameter schema (validated by Zod)
  schema: z.object({
    query: z.string().describe(
      "Natural language search query (e.g., 'beach vacation in Europe', " +
      "'budget trip to Asia', 'week-long city break', 'romantic getaway')"
    ),
    userId: z.string().optional().describe(
      "Optional: filter to only this user's trips"
    ),
    destination: z.string().optional().describe(
      "Optional: filter by specific destination (IATA code like 'CDG', 'DUB')"
    ),
    budgetCategory: z.enum(['economy', 'standard', 'premium']).optional().describe(
      "Optional: filter by budget category"
    ),
    limit: z.number().optional().default(5).describe(
      "Maximum number of results to return (default: 5)"
    ),
  }),
  
  // Function executed when the LLM calls this tool
  func: async ({ query, userId, destination, budgetCategory, limit }) => {
    try {
      const searchUseCase = getSearchTripsUseCase();
      const results = await searchUseCase.searchTrips({
        query,
        userId,
        filters: { destination, budgetCategory },
        limit,
      });
      
      // Return JSON that the LLM can interpret
      return JSON.stringify({
        success: true,
        count: results.length,
        trips: results.map(r => ({
          tripId: r.tripId,
          title: r.title,
          destination: r.destination,
          departureCity: r.departureCity,
          departureDate: r.departureDate,
          stayDuration: r.stayDuration,
          budget: r.totalBudget,
          budgetCategory: r.budgetCategory,
          relevanceScore: r.relevanceScore,
          summary: r.summaryText,
        })),
      });
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Search failed',
      });
    }
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// TOOL 2: Find similar trips
// ═══════════════════════════════════════════════════════════════════════════
export const findSimilarTripsTool = new DynamicStructuredTool({
  name: "find_similar_trips",
  
  description: `Find trips similar to a specific trip. 
    Use this to recommend trips based on a trip the user liked 
    or to find patterns in their travel history.`,
  
  schema: z.object({
    tripId: z.string().describe("The ID of the trip to find similar trips for"),
    userId: z.string().describe("The user's ID"),
    limit: z.number().optional().default(3).describe(
      "Maximum number of similar trips to return (default: 3)"
    ),
  }),
  
  func: async ({ tripId, userId, limit }) => {
    try {
      const searchUseCase = getSearchTripsUseCase();
      const results = await searchUseCase.findSimilarTrips(tripId, userId, limit);
      
      return JSON.stringify({
        success: true,
        sourceTripId: tripId,
        count: results.length,
        similarTrips: results.map(r => ({
          tripId: r.tripId,
          title: r.title,
          destination: r.destination,
          departureCity: r.departureCity,
          departureDate: r.departureDate,
          stayDuration: r.stayDuration,
          budget: r.totalBudget,
          similarityScore: r.relevanceScore,
          summary: r.summaryText,
        })),
      });
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to find similar trips',
      });
    }
  }
});
```

### Tools Index

```typescript
// ai/tools/index.ts

export { getMcpClient, getMcpTools, closeMcpClient } from "./mcp-client";
export { getCurrentDateTool } from "./date-tool";
export { searchTripsTool, findSimilarTripsTool } from "./retrieval-tools";

/**
 * Retrieves all available tools (MCP + custom)
 */
export async function getAllTools(): Promise<DynamicStructuredTool[]> {
  const mcpTools = await getMcpTools();  // Amadeus tools (flights, hotels, etc.)
  
  const customTools = [
    getCurrentDateTool,      // Current date
    searchTripsTool,         // Semantic search
    findSimilarTripsTool,    // Similar trips
  ];
  
  return [...mcpTools, ...customTools];
}
```

### Simplified Agent

```typescript
// ai/agents/agent.ts

import { getAllTools } from "../tools";

class TravelAssistantAgent {
  async initialize(): Promise<void> {
    // Load ALL tools from the externalized module
    this.tools = await getAllTools();

    // Create the agent with tools
    this.graph = createAgent({
      model: this.model,
      tools: this.tools,
      checkpointer: this.memory,
      systemPrompt: TRAVEL_ASSISTANT_PROMPT
    });

    console.log(`Agent initialized with ${this.tools.length} tools`);
    // Output: "Agent initialized with 11 tools"
  }
}
```

---

## 6. Summary and Final Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         COMPLETE RAG ARCHITECTURE                            │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        PHASE 1: INGESTION                            │   │
│  │                                                                      │   │
│  │  Confirmed trip → Text summary → OpenAI Embedding → Qdrant          │   │
│  │                                                                      │   │
│  │  "7-day trip to Lisbon..."  →  [0.12, -0.34, ...]  →  Stored point  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        PHASE 2: RETRIEVAL                            │   │
│  │                                                                      │   │
│  │  User query → Embedding → ANN Search → Top K results                │   │
│  │                                                                      │   │
│  │  "beach vacation"  →  [0.23, -0.45, ...]  →  [Lisbon, Barcelona...] │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        PHASE 3: GENERATION                           │   │
│  │                                                                      │   │
│  │  LLM + Retrieved context → Enriched and personalized response       │   │
│  │                                                                      │   │
│  │  "Based on your preferences, I recommend Barcelona (88% match)..."  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### File Structure

```
lib/
├── domain/                          # Interfaces (Ports)
│   ├── embeddings/service.ts        # IEmbeddingsService
│   ├── vector/repository.ts         # IVectorRepository
│   └── retrieval/service.ts         # IRetrievalService
│
├── infrastructure/                  # Implementations (Adapters)
│   ├── embeddings/openai-service.ts # OpenAIEmbeddingsService
│   └── qdrant/vector-repository.ts  # QdrantVectorRepository
│
└── application/use-cases/           # Orchestration
    ├── save-trip.use-case.ts        # Ingestion (dual storage)
    └── search-trips.use-case.ts     # Retrieval (semantic search)

ai/
└── tools/                           # Tools for the agent
    ├── index.ts                     # Central export
    ├── mcp-client.ts                # MCP Client (Amadeus)
    ├── date-tool.ts                 # Date tool
    └── retrieval-tools.ts           # search_trips, find_similar_trips
```

---

## 7. Key Takeaways

### 🎯 Fundamental Concepts

| Concept | Explanation |
|---------|-------------|
| **Embedding** | Numerical representation of text meaning (1536 dimensions) |
| **Cosine similarity** | Measure of angle between two vectors (0 = different, 1 = identical) |
| **ANN (Approximate Nearest Neighbors)** | Fast search algorithm in vector space |
| **Payload** | Metadata stored with the vector for filtering |

### 🔄 The RAG Flow in 3 Steps

1. **RETRIEVAL**: Convert query to vector → Search for K nearest
2. **AUGMENTATION**: Enrich the LLM prompt with found context
3. **GENERATION**: The LLM generates a response based on context

### 💡 Best Practices

| Practice | Why |
|----------|-----|
| **Dual storage** | PostgreSQL for ACID, Qdrant for semantics |
| **Rich text summary** | Embedding quality depends on text quality |
| **Payload filters** | Combine semantic search + exact criteria |
| **Lazy initialization** | Only create services when needed |
| **Externalized tools** | Reusability between agents |

### ⚠️ Pitfalls to Avoid

| Pitfall | Solution |
|---------|----------|
| Text too short for embedding | Generate a complete descriptive summary |
| Forgetting to create collection | Use `ensureCollection()` |
| Searching only own trips | Make `user_id` optional for discovery |
| Returning source trip in "similar" | Filter by ID and request `limit + 1` |

### 📊 Typical Metrics

| Metric | Value |
|--------|-------|
| Embedding latency | ~100-200ms |
| Qdrant search latency | ~50-100ms |
| Embedding cost (1M tokens) | ~$0.02 |
| Vector dimensions | 1536 (OpenAI) |

---

## 8. Seed Script - Synthetic Data Generation

### Why a Seed Script?

To test and demonstrate a RAG system, you need data. Rather than manually creating hundreds of trips via the UI, we use a **seed script** that:

1. **Generates realistic synthetic data**
2. **Creates embeddings** via OpenAI
3. **Inserts directly into Qdrant** (bypasses PostgreSQL for speed)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        SEED SCRIPT WORKFLOW                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                  │
│   │   Generate   │───▶│   Generate   │───▶│   Upsert to  │                  │
│   │ Synthetic    │    │  Embedding   │    │    Qdrant    │                  │
│   │    Data      │    │   (OpenAI)   │    │              │                  │
│   └──────────────┘    └──────────────┘    └──────────────┘                  │
│         │                    │                    │                          │
│         ▼                    ▼                    ▼                          │
│   • EU Destinations    • text-embedding-    • Collection:                   │
│   • Flights/Hotels       3-small             user_trips                     │
│   • Activities         • 1536 dimensions    • Payload with                  │
│   • Budget estimates   • ~100ms/call          metadata                      │
│                                                                              │
│   ⏱️ ~300ms per trip (embedding + upsert)                                   │
│   📊 100 trips in ~30 seconds                                               │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Script Architecture

```typescript
// scripts/seed-trips.ts

// 1️⃣ Load environment variables BEFORE imports
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// 2️⃣ Import only Qdrant + OpenAI (no PostgreSQL)
import { QdrantVectorRepository } from '../lib/infrastructure/qdrant/vector-repository';
import { OpenAIEmbeddingsService } from '../lib/infrastructure/embeddings/openai-service';
import { TripVectorPayload } from '../lib/domain/vector/repository';
```

> ⚠️ **Important**: TypeScript imports are "hoisted" (executed first). 
> Therefore, you must load dotenv BEFORE importing modules that depend on environment variables.

### Realistic Synthetic Data

The script generates varied data to test semantic search:

```typescript
// European destinations with themes for semantic search
const EUROPEAN_DESTINATIONS: Destination[] = [
  { code: 'CDG', name: 'Paris', country: 'France', themes: ['culture', 'romance', 'art'] },
  { code: 'BCN', name: 'Barcelona', country: 'Spain', themes: ['beach', 'culture', 'nightlife'] },
  { code: 'FCO', name: 'Rome', country: 'Italy', themes: ['history', 'culture', 'food'] },
  { code: 'AMS', name: 'Amsterdam', country: 'Netherlands', themes: ['culture', 'nightlife', 'art'] },
  { code: 'LIS', name: 'Lisbon', country: 'Portugal', themes: ['beach', 'culture', 'food'] },
  // ... 20+ destinations
];

// Departure cities
const DEPARTURE_CITIES = ['CDG', 'LHR', 'FRA', 'AMS', 'MAD', 'FCO', 'MUC', 'ZRH'];

// Budget categories
type BudgetCategory = 'economy' | 'standard' | 'premium';
```

### Generating Text for Embedding

The quality of semantic search depends on the **richness of the text** used for the embedding:

```typescript
function generateSummaryText(
  destination: Destination,
  departureCode: string,
  departureDate: string,
  stayDuration: number,
  numPeople: number,
  budgetCategory: BudgetCategory,
  totalBudget: number,
  flights: any[],
  hotels: any[],
  activities: any[]
): string {
  const parts = [
    `${stayDuration}-day trip to ${destination.name}`,
    `from ${departureCode}`,
    `for ${numPeople} people`,
    `Total budget: $${totalBudget}`,
    `Budget category: ${budgetCategory}`,
  ];

  // Add details to enrich semantic context
  if (flights.length) {
    parts.push(`Flight options: ${flights.map(f => f.airline).join(', ')}`);
  }
  if (hotels.length) {
    parts.push(`Hotels: ${hotels.map(h => h.name).join(', ')}`);
  }
  if (activities.length) {
    parts.push(`Activities: ${activities.map(a => a.name).join(', ')}`);
  }

  // Themes are CRUCIAL for semantic search
  parts.push(`Themes: ${destination.themes.join(', ')}`);

  return parts.join('. ') + '.';
}
```

**Example of generated text:**
```
"7-day trip to Barcelona. from CDG. for 2 people. Total budget: $2500. 
Budget category: standard. Flight options: Air France, Vueling. 
Hotels: Hotel Arts, W Barcelona. Activities: Sagrada Familia Tour, 
Beach Day, Tapas Walking Tour. Themes: beach, culture, nightlife."
```

### Direct Insertion into Qdrant

```typescript
async function main() {
  const vectorRepository = new QdrantVectorRepository();
  const embeddingsService = new OpenAIEmbeddingsService();

  for (let i = 0; i < TRIP_COUNT; i++) {
    // 1. Generate synthetic data
    const destination = randomElement(EUROPEAN_DESTINATIONS);
    const flights = generateSyntheticFlights(...);
    const hotels = generateSyntheticHotels(...);
    const activities = generateSyntheticActivities(...);

    // 2. Create text for embedding
    const summaryText = generateSummaryText(...);

    // 3. Generate embedding via OpenAI
    const embedding = await embeddingsService.generate(summaryText);

    // 4. Build payload with metadata
    const payload: TripVectorPayload = {
      trip_id: tripId,
      user_id: SEED_USER_ID,
      title: `Trip to ${destination.name}`,
      destination: destination.code,
      departure_city: departureCode,
      departure_date: departureDate,
      stay_duration: stayDuration,
      num_people: numPeople,
      budget_category: budgetCategory,
      total_budget: budget.totalEstimated,
      summary_text: summaryText,  // Stored for debug/display
      // ... other metadata
    };

    // 5. Insert into Qdrant
    await vectorRepository.upsert(tripId, embedding, payload);
  }
}
```

### Usage

```bash
# Generate 20 trips (default)
pnpm tsx scripts/seed-trips.ts

# Generate 100 trips
pnpm tsx scripts/seed-trips.ts --count=100

# Output
🌱 Trip Seed Script (Qdrant Only)
==================================
📊 Generating 100 synthetic trips
👤 User ID: seed-user-001

[1/100] 🛫 CDG → BCN (Barcelona)
   📅 2026-03-15 | 7 days | 2 people | standard
   🎯 Themes: beach, culture, nightlife
   🧠 Generating embedding...
   💾 Saving to Qdrant...
   ✅ Saved: a1b2c3d4-...

[2/100] 🛫 LHR → FCO (Rome)
   ...

==================================
📊 SUMMARY
==================================
✅ Success: 100
❌ Failed: 0
📝 Total trips in Qdrant: 100
```

### Why Bypass PostgreSQL?

| Approach | Advantages | Disadvantages |
|----------|-----------|---------------|
| **Via SaveTripUseCase** | Consistent data in PG + Qdrant | Requires DB connection, slower |
| **Direct Qdrant** | Fast, simple, sufficient for RAG | No data in PostgreSQL |

For **RAG testing**, only Qdrant is needed. PostgreSQL data is only useful for UI display.

### Seed Best Practices

| Practice | Why |
|----------|-----|
| **Varied themes** | Allows testing different semantic queries |
| **Realistic destinations** | Embeddings better capture geographic context |
| **Rich text** | The more descriptive the text, the better the embedding |
| **Delay between inserts** | Avoids OpenAI API rate limiting |
| **Fixed user ID** | Makes cleaning up test data easier |

### Data Verification

After seeding, you can verify in Qdrant:

```bash
# Via Qdrant API (if local)
curl http://localhost:6333/collections/user_trips

# Or via Qdrant Cloud dashboard
# https://cloud.qdrant.io
```

---

## 9. Going Further

### Possible Improvements

1. **Chunking**: Split long documents into pieces
2. **Reranking**: Use a reranking model after ANN search
3. **Hybrid search**: Combine BM25 (keyword) + vectors
4. **Caching**: Cache frequent embeddings
5. **Batch ingestion**: Ingest multiple documents in parallel

### Resources

- [Qdrant Documentation](https://qdrant.tech/documentation/)
- [OpenAI Embeddings Guide](https://platform.openai.com/docs/guides/embeddings)
- [LangChain RAG Tutorial](https://python.langchain.com/docs/tutorials/rag/)

---

## 10. Usage Example

### Via API

```bash
curl -X POST http://localhost:3000/api/trips/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "beach vacation in Europe",
    "limit": 5
  }'
```

### Via Agent Chat

```
User: "Show me trips similar to my Lisbon trip"

Agent: [Calls search_trips({ query: "Lisbon beach culture" })]
       
       🔍 Searching for "Lisbon beach culture"
       1️⃣ Generating query embedding...
       2️⃣ Searching vector database...
       ✅ Found 3 results

Agent: "Based on your trip to Lisbon, here are 3 similar destinations:
        
        1. **Barcelona** (88% similar)
           - 7 days, budget $2500
           - Beaches, culture, gastronomy
        
        2. **Porto** (85% similar)  
           - 5 days, budget $1800
           - Same country, similar vibe
        
        3. **Seville** (82% similar)
           - 4 days, budget $1500
           - Architecture, Mediterranean climate"
```
