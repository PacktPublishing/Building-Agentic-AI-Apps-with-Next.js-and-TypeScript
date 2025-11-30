# RAG Implementation Guide - From Zero to Semantic Search

> **Objectif** : Ce guide forme les développeurs aux concepts et à l'implémentation d'un système RAG (Retrieval-Augmented Generation) complet.

---

## Table des matières

1. [Qu'est-ce que le RAG ?](#1-quest-ce-que-le-rag-)
2. [Les Embeddings - Le cœur du système](#2-les-embeddings---le-cœur-du-système)
3. [L'Ingestion - Stocker les données vectorielles](#3-lingestion---stocker-les-données-vectorielles)
4. [Le Retrieval - Recherche sémantique](#4-le-retrieval---recherche-sémantique)
5. [L'Agent - Utiliser le RAG dans un LLM](#5-lagent---utiliser-le-rag-dans-un-llm)
6. [Implémentation complète](#6-implémentation-complète)

---

## 1. Qu'est-ce que le RAG ?

### Le problème des LLMs

Les LLMs (GPT-4, Claude, etc.) ont une **limite fondamentale** : ils ne connaissent que ce sur quoi ils ont été entraînés. Ils ne peuvent pas :

- Accéder à vos données privées (trips des utilisateurs)
- Connaître les informations récentes
- Répondre sur des domaines spécifiques non couverts

### La solution : RAG

**RAG = Retrieval-Augmented Generation**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│   Question utilisateur : "Montre-moi des voyages similaires à Lisbonne"    │
│                                                                              │
│                                    │                                         │
│                                    ▼                                         │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  RETRIEVAL : Chercher dans la base de données vectorielle           │   │
│   │                                                                      │   │
│   │  "Lisbonne" → [0.12, -0.34, 0.56, ...] → Recherche similarité       │   │
│   │                                          → Top 5 trips trouvés       │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                         │
│                                    ▼                                         │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  AUGMENTATION : Enrichir le prompt avec le contexte récupéré        │   │
│   │                                                                      │   │
│   │  "Voici les trips similaires trouvés :                               │   │
│   │   - Trip to Barcelona, 7 jours, $2500                                │   │
│   │   - Trip to Porto, 5 jours, $1800                                    │   │
│   │   Réponds à l'utilisateur en te basant sur ces données."            │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                         │
│                                    ▼                                         │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  GENERATION : Le LLM génère une réponse contextualisée              │   │
│   │                                                                      │   │
│   │  "Basé sur votre voyage à Lisbonne, je vous recommande :             │   │
│   │   1. Barcelona - ambiance similaire, plages, architecture...        │   │
│   │   2. Porto - même pays, culture proche, budget similaire..."        │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Pourquoi pas une simple recherche SQL ?

```sql
-- ❌ Recherche traditionnelle : keyword-based
SELECT * FROM trips WHERE destination LIKE '%beach%';
-- Ne trouve RIEN si l'utilisateur cherche "vacances à la plage"
-- Ne comprend pas que "Lisbonne" et "Porto" sont similaires
```

```
-- ✅ Recherche sémantique : meaning-based
Query: "romantic getaway Mediterranean"
Trouve: Santorini, Amalfi Coast, Barcelona
→ Même si aucun ne contient les mots "romantic" ou "Mediterranean"
```

---

## 2. Les Embeddings - Le cœur du système

### Qu'est-ce qu'un embedding ?

Un **embedding** est une représentation numérique du **sens** d'un texte. C'est un vecteur de nombres (généralement 1536 dimensions pour OpenAI).

```
Texte: "7-day trip to Lisbon from Paris for 2 people. Beach, culture, food."
         │
         ▼
Embedding: [0.0234, -0.0891, 0.0456, 0.1234, -0.0567, ... ] (1536 nombres)
```

### Pourquoi ça fonctionne ?

Les embeddings capturent le **sens sémantique**. Des textes similaires ont des vecteurs proches :

```
"Trip to Lisbon, beach vacation"     → [0.12, -0.34, 0.56, ...]
"Voyage à Lisbonne, plage"           → [0.11, -0.33, 0.55, ...]  ← TRÈS PROCHE !
"Business trip to Tokyo"             → [-0.45, 0.23, -0.12, ...] ← TRÈS DIFFÉRENT
```

### Comment mesurer la similarité ?

On utilise la **similarité cosinus** (angle entre deux vecteurs) :

```
Similarité = 1.0  → Identiques
Similarité = 0.9  → Très similaires
Similarité = 0.5  → Peu de rapport
Similarité = 0.0  → Aucun rapport
```

### Implémentation : Service d'embeddings

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
   * Génère un embedding pour un texte donné
   * 
   * @param text - Le texte à convertir en vecteur
   * @returns Un tableau de 1536 nombres représentant le sens du texte
   */
  async generate(text: string): Promise<number[]> {
    const response = await this.client.embeddings.create({
      model: 'text-embedding-3-small',  // 1536 dimensions
      input: text,
    });

    return response.data[0].embedding;
    // Retourne: [0.0234, -0.0891, 0.0456, ...] (1536 nombres)
  }
}
```

### Points clés sur les embeddings

| Aspect | Détail |
|--------|--------|
| **Modèle** | `text-embedding-3-small` (OpenAI) - bon rapport qualité/prix |
| **Dimensions** | 1536 nombres par vecteur |
| **Coût** | ~$0.02 pour 1M tokens |
| **Latence** | ~100-200ms par requête |
| **Langue** | Multilingue (FR, EN, ES, etc. dans le même espace) |

---

## 3. L'Ingestion - Stocker les données vectorielles

### Le flux d'ingestion

Quand un utilisateur **sauvegarde un trip**, on doit :

1. Sauvegarder les données structurées (PostgreSQL)
2. Générer un résumé textuel du trip
3. Convertir ce résumé en embedding
4. Stocker l'embedding + métadonnées dans Qdrant

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         FLUX D'INGESTION                                     │
│                                                                              │
│  Trip confirmé                                                               │
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

### Pourquoi un dual storage ?

| PostgreSQL | Qdrant |
|------------|--------|
| Données structurées | Recherche sémantique |
| Relations (user → trips) | Similarité vectorielle |
| Transactions ACID | Recherche approximative rapide (ANN) |
| Requêtes exactes | Requêtes "floues" par sens |

### Implémentation : Use Case de sauvegarde

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
    // ÉTAPE 1 : Sauvegarder dans PostgreSQL (données structurées)
    // ═══════════════════════════════════════════════════════════════════
    console.log('1️⃣ Saving to PostgreSQL...');
    const tripId = await this.tripRepository.save(data);
    // → INSERT INTO trips (id, user_id, destination, ...) VALUES (...)

    // ═══════════════════════════════════════════════════════════════════
    // ÉTAPE 2 : Générer un résumé textuel pour l'embedding
    // ═══════════════════════════════════════════════════════════════════
    // 
    // POURQUOI ? L'embedding doit capturer le "sens" du voyage.
    // On crée donc un texte descriptif qui résume toutes les infos clés.
    //
    console.log('2️⃣ Generating summary text...');
    const summaryText = this.generateSummaryText(data);
    // Exemple: "7-day trip to LIS from CDG for 2 people. 
    //           Total budget: $2950. Includes 3 flight options: TAP, Iberia.
    //           Hotels: Pestana Palace, Four Seasons. 
    //           Activities: cultural, beach, food."

    // ═══════════════════════════════════════════════════════════════════
    // ÉTAPE 3 : Convertir le résumé en embedding (vecteur numérique)
    // ═══════════════════════════════════════════════════════════════════
    console.log('3️⃣ Generating embedding...');
    const embedding = await this.embeddingsService.generate(summaryText);
    // → Appel API OpenAI
    // → Retourne: [0.0234, -0.0891, 0.0456, ...] (1536 nombres)
    console.log(`✅ Generated embedding (${embedding.length} dimensions)`);

    // ═══════════════════════════════════════════════════════════════════
    // ÉTAPE 4 : Construire le payload (métadonnées pour filtrage)
    // ═══════════════════════════════════════════════════════════════════
    //
    // Le payload permet de FILTRER les résultats lors de la recherche.
    // Ex: "Cherche des voyages similaires MAIS seulement en 'economy'"
    //
    console.log('4️⃣ Building vector payload...');
    const payload: TripVectorPayload = {
      trip_id: tripId,
      user_id: data.userId,
      title: `Trip to ${data.formInput.destinationCity}`,
      destination: data.formInput.destinationCity,        // Pour filtrer par destination
      departure_city: data.formInput.departureCity,
      departure_date: data.formInput.departureDate,
      stay_duration: data.formInput.stayDuration,
      num_people: data.formInput.numPeople,
      budget_category: data.formInput.budgetCategory,     // Pour filtrer par budget
      total_budget: data.estimatedBudget?.totalEstimated || 0,
      summary_text: summaryText,                          // Le texte original
      num_flights: data.flights?.length || 0,
      num_hotels: data.hotels?.length || 0,
      num_activities: data.activities?.length || 0,
      status: 'confirmed',
      created_at: new Date().toISOString(),
      thread_id: data.threadId,
    };

    // ═══════════════════════════════════════════════════════════════════
    // ÉTAPE 5 : Upserter dans Qdrant (vecteur + payload)
    // ═══════════════════════════════════════════════════════════════════
    console.log('5️⃣ Upserting to Qdrant...');
    await this.vectorRepository.upsert(tripId, embedding, payload);
    // → Le trip est maintenant searchable par similarité sémantique !

    console.log('✅ SaveTripUseCase: Dual-storage save completed!');
    return tripId;
  }

  /**
   * Génère un texte descriptif du voyage pour l'embedding.
   * 
   * IMPORTANT: La qualité de ce texte impacte directement la qualité
   * de la recherche sémantique. Il doit être :
   * - Descriptif (pas juste des mots-clés)
   * - Complet (toutes les infos importantes)
   * - Naturel (comme un humain décrirait le voyage)
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

### Implémentation : Repository Qdrant

```typescript
// lib/infrastructure/qdrant/vector-repository.ts

import { QdrantClient } from '@qdrant/js-client-rest';

const VECTOR_SIZE = 1536;  // Taille des embeddings OpenAI
const COLLECTION_NAME = 'user_trips';

export class QdrantVectorRepository implements IVectorRepository {
  private client: QdrantClient;
  private collectionCreated = false;

  constructor() {
    // Connexion au cluster Qdrant (cloud ou local)
    this.client = new QdrantClient({
      url: process.env.QDRANT_URL,      // https://xxx.cloud.qdrant.io:6333
      apiKey: process.env.QDRANT_API_KEY,
    });
    console.log('📊 Qdrant client initialized:', process.env.QDRANT_URL);
  }

  /**
   * S'assure que la collection existe avant toute opération.
   * Crée la collection si elle n'existe pas.
   */
  private async ensureCollection(): Promise<void> {
    if (this.collectionCreated) return;

    try {
      await this.client.getCollection(COLLECTION_NAME);
      this.collectionCreated = true;
    } catch {
      // La collection n'existe pas, on la crée
      console.log('📦 Creating Qdrant collection:', COLLECTION_NAME);
      await this.client.createCollection(COLLECTION_NAME, {
        vectors: {
          size: VECTOR_SIZE,    // 1536 dimensions
          distance: 'Cosine',   // Similarité cosinus (meilleur pour le texte)
        },
      });
      this.collectionCreated = true;
    }
  }

  /**
   * Insère ou met à jour un point (vecteur + payload) dans Qdrant.
   * 
   * @param tripId - L'ID unique du trip (utilisé comme ID du point)
   * @param vector - L'embedding du trip (1536 dimensions)
   * @param payload - Les métadonnées pour le filtrage
   */
  async upsert(
    tripId: string, 
    vector: number[], 
    payload: TripVectorPayload
  ): Promise<void> {
    await this.ensureCollection();

    await this.client.upsert(COLLECTION_NAME, {
      wait: true,  // Attendre que l'opération soit confirmée
      points: [
        {
          id: tripId,       // UUID comme identifiant
          vector: vector,   // [0.12, -0.34, ...] (1536 nombres)
          payload: payload, // Métadonnées pour filtrage et affichage
        }
      ],
    });

    console.log(`✅ Upserted trip vector to Qdrant: ${tripId}`);
  }
}
```

---

## 4. Le Retrieval - Recherche sémantique

### Comment fonctionne la recherche ?

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         FLUX DE RECHERCHE                                    │
│                                                                              │
│  Query: "beach vacation in Europe"                                          │
│       │                                                                      │
│       ▼                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  ÉTAPE 1 : Générer l'embedding de la query                          │   │
│  │                                                                      │   │
│  │  "beach vacation in Europe" → [0.23, -0.45, 0.12, ...]              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│       │                                                                      │
│       ▼                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  ÉTAPE 2 : Recherche ANN (Approximate Nearest Neighbors)            │   │
│  │                                                                      │   │
│  │  Qdrant compare le vecteur query avec TOUS les vecteurs stockés     │   │
│  │  et retourne les K plus proches (par similarité cosinus)            │   │
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
│  │  ÉTAPE 3 : Retourner les résultats avec scores                      │   │
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

### Implémentation : Méthode de recherche

```typescript
// lib/infrastructure/qdrant/vector-repository.ts (suite)

export class QdrantVectorRepository implements IVectorRepository {
  // ... (constructeur et upsert ci-dessus)

  /**
   * Recherche sémantique avec filtres optionnels.
   * 
   * @param queryVector - L'embedding de la requête utilisateur
   * @param filter - Filtres optionnels (user_id, destination, budget)
   * @param limit - Nombre max de résultats
   * @returns Les trips les plus similaires avec leur score
   */
  async search(
    queryVector: number[],
    filter: VectorSearchFilter,
    limit: number = 5
  ): Promise<VectorSearchResult[]> {
    await this.ensureCollection();

    // ═══════════════════════════════════════════════════════════════════
    // Construction dynamique des filtres
    // ═══════════════════════════════════════════════════════════════════
    // 
    // Les filtres permettent de COMBINER recherche sémantique + critères exacts.
    // Ex: "Trouve des voyages similaires à 'plage' MAIS seulement en 'economy'"
    //
    const mustConditions: any[] = [];

    // Filtre par utilisateur (optionnel)
    // Si non fourni, on cherche dans TOUS les trips (découverte)
    if (filter.user_id) {
      mustConditions.push({
        key: 'user_id',
        match: { value: filter.user_id },
      });
    }

    // Filtre par destination (optionnel)
    if (filter.destination) {
      mustConditions.push({
        key: 'destination',
        match: { value: filter.destination },
      });
    }

    // Filtre par catégorie de budget (optionnel)
    if (filter.budget_category) {
      mustConditions.push({
        key: 'budget_category',
        match: { value: filter.budget_category },
      });
    }

    // ═══════════════════════════════════════════════════════════════════
    // Construction de la requête de recherche
    // ═══════════════════════════════════════════════════════════════════
    const searchParams: any = {
      vector: queryVector,  // Le vecteur à comparer
      limit,                // Nombre de résultats max
    };

    // N'ajouter le filtre que s'il y a des conditions
    if (mustConditions.length > 0) {
      searchParams.filter = { must: mustConditions };
    }

    // ═══════════════════════════════════════════════════════════════════
    // Exécution de la recherche
    // ═══════════════════════════════════════════════════════════════════
    const searchResult = await this.client.search(COLLECTION_NAME, searchParams);

    // Transformer les résultats Qdrant en notre format
    return searchResult.map((result) => ({
      id: result.id as string,
      score: result.score,  // Similarité cosinus (0.0 - 1.0)
      payload: result.payload as TripVectorPayload,
    }));
  }

  /**
   * Récupère un point par son ID (avec son vecteur).
   * 
   * Utilisé pour "find similar trips" : on récupère le vecteur d'un trip
   * existant et on cherche les trips similaires.
   */
  async getById(tripId: string): Promise<VectorPoint | null> {
    await this.ensureCollection();

    const result = await this.client.retrieve(COLLECTION_NAME, {
      ids: [tripId],
      with_vector: true,   // IMPORTANT: inclure le vecteur
      with_payload: true,
    });

    if (result.length === 0) return null;

    return {
      id: result[0].id as string,
      vector: result[0].vector as number[],  // Le vecteur pour recherche
      payload: result[0].payload as TripVectorPayload,
    };
  }
}
```

### Implémentation : Use Case de recherche

```typescript
// lib/application/use-cases/search-trips.use-case.ts

export class SearchTripsUseCase implements IRetrievalService {
  constructor(
    private vectorRepository: IVectorRepository,
    private embeddingsService: IEmbeddingsService
  ) {}

  /**
   * Recherche de trips par requête en langage naturel.
   * 
   * C'est LE cœur du système RAG côté retrieval.
   */
  async searchTrips(query: SemanticSearchQuery): Promise<RetrievalResult[]> {
    console.log(`🔍 SearchTripsUseCase: Searching for "${query.query}"`);

    try {
      // ═══════════════════════════════════════════════════════════════════
      // ÉTAPE 1 : Convertir la requête en embedding
      // ═══════════════════════════════════════════════════════════════════
      // 
      // La requête utilisateur est en langage naturel.
      // On la convertit en vecteur pour pouvoir la comparer aux trips stockés.
      //
      console.log('1️⃣ Generating query embedding...');
      const queryEmbedding = await this.embeddingsService.generate(query.query);
      // "beach vacation in Europe" → [0.23, -0.45, 0.12, ...]

      // ═══════════════════════════════════════════════════════════════════
      // ÉTAPE 2 : Construire les filtres
      // ═══════════════════════════════════════════════════════════════════
      const filter: VectorSearchFilter = {
        user_id: query.userId,  // Optionnel : si absent, cherche partout
        destination: query.filters?.destination,
        budget_category: query.filters?.budgetCategory,
      };

      // ═══════════════════════════════════════════════════════════════════
      // ÉTAPE 3 : Recherche vectorielle dans Qdrant
      // ═══════════════════════════════════════════════════════════════════
      console.log('2️⃣ Searching vector database...');
      const searchResults = await this.vectorRepository.search(
        queryEmbedding,
        filter,
        query.limit || 5
      );

      console.log(`✅ Found ${searchResults.length} results`);

      // ═══════════════════════════════════════════════════════════════════
      // ÉTAPE 4 : Transformer en résultats métier
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
        relevanceScore: result.score,  // Score de similarité (0-1)
        createdAt: result.payload.created_at,
      }));
    } catch (error) {
      console.error('❌ SearchTripsUseCase: Search failed', error);
      throw error;
    }
  }

  /**
   * Trouve des trips similaires à un trip donné.
   * 
   * Cas d'usage : "J'ai aimé mon voyage à Lisbonne, montre-moi des voyages similaires"
   */
  async findSimilarTrips(
    tripId: string,
    userId: string,
    limit: number = 3
  ): Promise<RetrievalResult[]> {
    console.log(`🔍 Finding trips similar to: ${tripId}`);

    try {
      // ═══════════════════════════════════════════════════════════════════
      // ÉTAPE 1 : Récupérer le vecteur du trip source
      // ═══════════════════════════════════════════════════════════════════
      // 
      // Au lieu de générer un nouvel embedding, on RÉUTILISE celui du trip.
      // C'est plus rapide et plus précis.
      //
      console.log('1️⃣ Retrieving source trip vector...');
      const sourcePoint = await this.vectorRepository.getById(tripId);

      if (!sourcePoint) {
        console.warn(`⚠️ Trip ${tripId} not found in vector database`);
        return [];
      }

      // ═══════════════════════════════════════════════════════════════════
      // ÉTAPE 2 : Chercher les trips similaires avec ce vecteur
      // ═══════════════════════════════════════════════════════════════════
      console.log('2️⃣ Searching for similar trips...');
      const filter = { user_id: userId };
      
      // On demande un résultat de plus pour exclure le trip source
      const searchResults = await this.vectorRepository.search(
        sourcePoint.vector,  // Utilise le vecteur existant
        filter,
        limit + 1
      );

      // ═══════════════════════════════════════════════════════════════════
      // ÉTAPE 3 : Exclure le trip source et formater
      // ═══════════════════════════════════════════════════════════════════
      const similarTrips = searchResults
        .filter((result) => result.id !== tripId)  // Exclure le trip source
        .slice(0, limit)
        .map((result) => ({
          tripId: result.payload.trip_id,
          title: result.payload.title,
          destination: result.payload.destination,
          // ... autres champs
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

## 5. L'Agent - Utiliser le RAG dans un LLM

### Pourquoi des Tools ?

Un agent LLM ne peut pas directement accéder à Qdrant. On lui donne des **tools** (outils) qu'il peut appeler :

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         AGENT AVEC RAG TOOLS                                 │
│                                                                              │
│  User: "Montre-moi des voyages similaires à mon trip à Lisbonne"            │
│       │                                                                      │
│       ▼                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  LLM (Claude/GPT) analyse la requête                                 │   │
│  │                                                                      │   │
│  │  "L'utilisateur veut des trips similaires à Lisbonne.                │   │
│  │   Je dois utiliser le tool 'search_trips' avec query='Lisbon'"       │   │
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
│  │  Qdrant: Recherche vectorielle                                       │   │
│  │       │                                                              │   │
│  │       ▼                                                              │   │
│  │  Résultats: [Barcelona (0.88), Porto (0.85), Seville (0.82)]        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│       │                                                                      │
│       ▼ Tool Result                                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  LLM génère la réponse avec le contexte                              │   │
│  │                                                                      │   │
│  │  "Basé sur votre voyage à Lisbonne, voici 3 destinations similaires: │   │
│  │   1. **Barcelona** (88% similaire) - Plages, culture, gastronomie   │   │
│  │   2. **Porto** (85% similaire) - Même pays, ambiance similaire      │   │
│  │   3. **Seville** (82% similaire) - Architecture, climat méditerranéen"│   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Implémentation : Tools externalisés

On extrait les tools dans un module dédié pour la réutilisabilité :

```typescript
// ai/tools/retrieval-tools.ts

import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { SearchTripsUseCase } from "@/lib/application/use-cases/search-trips.use-case";
import { QdrantVectorRepository } from "@/lib/infrastructure/qdrant/vector-repository";
import { OpenAIEmbeddingsService } from "@/lib/infrastructure/embeddings/openai-service";

// ═══════════════════════════════════════════════════════════════════════════
// Lazy initialization du use case
// ═══════════════════════════════════════════════════════════════════════════
// On ne crée l'instance que quand on en a besoin (performance)
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
// TOOL 1 : Recherche sémantique de trips
// ═══════════════════════════════════════════════════════════════════════════
export const searchTripsTool = new DynamicStructuredTool({
  // Nom du tool (utilisé par le LLM pour l'appeler)
  name: "search_trips",
  
  // Description (le LLM l'utilise pour décider QUAND utiliser ce tool)
  description: `Search through all saved trips using natural language. 
    Use this to find trip inspiration, discover destinations, or find trips 
    matching specific criteria. Searches across ALL trips in the database 
    for maximum discovery.`,
  
  // Schéma des paramètres (validé par Zod)
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
  
  // Fonction exécutée quand le LLM appelle ce tool
  func: async ({ query, userId, destination, budgetCategory, limit }) => {
    try {
      const searchUseCase = getSearchTripsUseCase();
      const results = await searchUseCase.searchTrips({
        query,
        userId,
        filters: { destination, budgetCategory },
        limit,
      });
      
      // Retourner un JSON que le LLM peut interpréter
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
// TOOL 2 : Trouver des trips similaires
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

### Index des tools

```typescript
// ai/tools/index.ts

export { getMcpClient, getMcpTools, closeMcpClient } from "./mcp-client";
export { getCurrentDateTool } from "./date-tool";
export { searchTripsTool, findSimilarTripsTool } from "./retrieval-tools";

/**
 * Récupère tous les tools disponibles (MCP + custom)
 */
export async function getAllTools(): Promise<DynamicStructuredTool[]> {
  const mcpTools = await getMcpTools();  // Tools Amadeus (flights, hotels, etc.)
  
  const customTools = [
    getCurrentDateTool,      // Date actuelle
    searchTripsTool,         // Recherche sémantique
    findSimilarTripsTool,    // Trips similaires
  ];
  
  return [...mcpTools, ...customTools];
}
```

### Agent simplifié

```typescript
// ai/agents/agent.ts

import { getAllTools } from "../tools";

class TravelAssistantAgent {
  async initialize(): Promise<void> {
    // Charger TOUS les tools depuis le module externalisé
    this.tools = await getAllTools();

    // Créer l'agent avec les tools
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

## 6. Résumé et Architecture finale

### Vue d'ensemble du système

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ARCHITECTURE RAG COMPLÈTE                            │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        PHASE 1 : INGESTION                           │   │
│  │                                                                      │   │
│  │  Trip confirmé → Résumé textuel → Embedding OpenAI → Qdrant         │   │
│  │                                                                      │   │
│  │  "7-day trip to Lisbon..."  →  [0.12, -0.34, ...]  →  Point stocké  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        PHASE 2 : RETRIEVAL                           │   │
│  │                                                                      │   │
│  │  Query utilisateur → Embedding → Recherche ANN → Top K résultats    │   │
│  │                                                                      │   │
│  │  "beach vacation"  →  [0.23, -0.45, ...]  →  [Lisbon, Barcelona...] │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        PHASE 3 : GENERATION                          │   │
│  │                                                                      │   │
│  │  LLM + Contexte récupéré → Réponse enrichie et personnalisée        │   │
│  │                                                                      │   │
│  │  "Basé sur vos préférences, je recommande Barcelona (88% match)..." │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Structure des fichiers

```
lib/
├── domain/                          # Interfaces (Ports)
│   ├── embeddings/service.ts        # IEmbeddingsService
│   ├── vector/repository.ts         # IVectorRepository
│   └── retrieval/service.ts         # IRetrievalService
│
├── infrastructure/                  # Implémentations (Adapters)
│   ├── embeddings/openai-service.ts # OpenAIEmbeddingsService
│   └── qdrant/vector-repository.ts  # QdrantVectorRepository
│
└── application/use-cases/           # Orchestration
    ├── save-trip.use-case.ts        # Ingestion (dual storage)
    └── search-trips.use-case.ts     # Retrieval (semantic search)

ai/
└── tools/                           # Tools pour l'agent
    ├── index.ts                     # Export central
    ├── mcp-client.ts                # Client MCP (Amadeus)
    ├── date-tool.ts                 # Tool date
    └── retrieval-tools.ts           # search_trips, find_similar_trips
```

---

## 7. Key Takeaways - Ce qu'il faut retenir

### 🎯 Concepts fondamentaux

| Concept | Explication |
|---------|-------------|
| **Embedding** | Représentation numérique du sens d'un texte (1536 dimensions) |
| **Similarité cosinus** | Mesure de l'angle entre deux vecteurs (0 = différent, 1 = identique) |
| **ANN (Approximate Nearest Neighbors)** | Algorithme de recherche rapide dans un espace vectoriel |
| **Payload** | Métadonnées stockées avec le vecteur pour filtrage |

### 🔄 Le flux RAG en 3 étapes

1. **RETRIEVAL** : Convertir la query en vecteur → Chercher les K plus proches
2. **AUGMENTATION** : Enrichir le prompt du LLM avec le contexte trouvé
3. **GENERATION** : Le LLM génère une réponse basée sur le contexte

### 💡 Bonnes pratiques

| Pratique | Pourquoi |
|----------|----------|
| **Dual storage** | PostgreSQL pour ACID, Qdrant pour sémantique |
| **Résumé textuel riche** | La qualité de l'embedding dépend de la qualité du texte |
| **Filtres sur payload** | Combiner recherche sémantique + critères exacts |
| **Lazy initialization** | Ne créer les services que quand nécessaire |
| **Tools externalisés** | Réutilisabilité entre agents |

### ⚠️ Pièges à éviter

| Piège | Solution |
|-------|----------|
| Texte trop court pour l'embedding | Générer un résumé descriptif complet |
| Oublier de créer la collection | Utiliser `ensureCollection()` |
| Chercher uniquement ses propres trips | Rendre `user_id` optionnel pour la découverte |
| Retourner le trip source dans "similar" | Filtrer par ID et demander `limit + 1` |

### 📊 Métriques typiques

| Métrique | Valeur |
|----------|--------|
| Latence embedding | ~100-200ms |
| Latence recherche Qdrant | ~50-100ms |
| Coût embedding (1M tokens) | ~$0.02 |
| Dimensions vecteur | 1536 (OpenAI) |

---

## 8. Seed Script - Génération de données synthétiques

### Pourquoi un script de seed ?

Pour tester et démontrer un système RAG, il faut des données. Plutôt que de créer manuellement des centaines de trips via l'UI, on utilise un **script de seed** qui :

1. **Génère des données synthétiques** réalistes
2. **Crée les embeddings** via OpenAI
3. **Insère directement dans Qdrant** (bypass PostgreSQL pour la rapidité)

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
│   • Destinations EU    • text-embedding-    • Collection:                   │
│   • Flights/Hotels       3-small             user_trips                     │
│   • Activities         • 1536 dimensions    • Payload avec                  │
│   • Budget estimates   • ~100ms/call          métadonnées                   │
│                                                                              │
│   ⏱️ ~300ms par trip (embedding + upsert)                                   │
│   📊 100 trips en ~30 secondes                                              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Architecture du script

```typescript
// scripts/seed-trips.ts

// 1️⃣ Charger les variables d'environnement AVANT les imports
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// 2️⃣ Importer uniquement Qdrant + OpenAI (pas de PostgreSQL)
import { QdrantVectorRepository } from '../lib/infrastructure/qdrant/vector-repository';
import { OpenAIEmbeddingsService } from '../lib/infrastructure/embeddings/openai-service';
import { TripVectorPayload } from '../lib/domain/vector/repository';
```

> ⚠️ **Important** : Les imports TypeScript sont "hoisted" (exécutés en premier). 
> Il faut donc charger dotenv AVANT d'importer les modules qui dépendent des variables d'environnement.

### Données synthétiques réalistes

Le script génère des données variées pour tester la recherche sémantique :

```typescript
// Destinations européennes avec thèmes pour la recherche sémantique
const EUROPEAN_DESTINATIONS: Destination[] = [
  { code: 'CDG', name: 'Paris', country: 'France', themes: ['culture', 'romance', 'art'] },
  { code: 'BCN', name: 'Barcelona', country: 'Spain', themes: ['beach', 'culture', 'nightlife'] },
  { code: 'FCO', name: 'Rome', country: 'Italy', themes: ['history', 'culture', 'food'] },
  { code: 'AMS', name: 'Amsterdam', country: 'Netherlands', themes: ['culture', 'nightlife', 'art'] },
  { code: 'LIS', name: 'Lisbon', country: 'Portugal', themes: ['beach', 'culture', 'food'] },
  // ... 20+ destinations
];

// Villes de départ
const DEPARTURE_CITIES = ['CDG', 'LHR', 'FRA', 'AMS', 'MAD', 'FCO', 'MUC', 'ZRH'];

// Catégories de budget
type BudgetCategory = 'economy' | 'standard' | 'premium';
```

### Génération du texte pour l'embedding

La qualité de la recherche sémantique dépend de la **richesse du texte** utilisé pour l'embedding :

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

  // Ajouter les détails pour enrichir le contexte sémantique
  if (flights.length) {
    parts.push(`Flight options: ${flights.map(f => f.airline).join(', ')}`);
  }
  if (hotels.length) {
    parts.push(`Hotels: ${hotels.map(h => h.name).join(', ')}`);
  }
  if (activities.length) {
    parts.push(`Activities: ${activities.map(a => a.name).join(', ')}`);
  }

  // Les thèmes sont CRUCIAUX pour la recherche sémantique
  parts.push(`Themes: ${destination.themes.join(', ')}`);

  return parts.join('. ') + '.';
}
```

**Exemple de texte généré :**
```
"7-day trip to Barcelona. from CDG. for 2 people. Total budget: $2500. 
Budget category: standard. Flight options: Air France, Vueling. 
Hotels: Hotel Arts, W Barcelona. Activities: Sagrada Familia Tour, 
Beach Day, Tapas Walking Tour. Themes: beach, culture, nightlife."
```

### Insertion directe dans Qdrant

```typescript
async function main() {
  const vectorRepository = new QdrantVectorRepository();
  const embeddingsService = new OpenAIEmbeddingsService();

  for (let i = 0; i < TRIP_COUNT; i++) {
    // 1. Générer les données synthétiques
    const destination = randomElement(EUROPEAN_DESTINATIONS);
    const flights = generateSyntheticFlights(...);
    const hotels = generateSyntheticHotels(...);
    const activities = generateSyntheticActivities(...);

    // 2. Créer le texte pour l'embedding
    const summaryText = generateSummaryText(...);

    // 3. Générer l'embedding via OpenAI
    const embedding = await embeddingsService.generate(summaryText);

    // 4. Construire le payload avec les métadonnées
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
      summary_text: summaryText,  // Stocké pour debug/affichage
      // ... autres métadonnées
    };

    // 5. Insérer dans Qdrant
    await vectorRepository.upsert(tripId, embedding, payload);
  }
}
```

### Utilisation

```bash
# Générer 20 trips (défaut)
pnpm tsx scripts/seed-trips.ts

# Générer 100 trips
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

### Pourquoi bypasser PostgreSQL ?

| Approche | Avantages | Inconvénients |
|----------|-----------|---------------|
| **Via SaveTripUseCase** | Données cohérentes PG + Qdrant | Nécessite connexion DB, plus lent |
| **Direct Qdrant** | Rapide, simple, suffisant pour RAG | Pas de données en PostgreSQL |

Pour le **testing du RAG**, seul Qdrant est nécessaire. Les données PostgreSQL ne sont utiles que pour l'affichage dans l'UI.

### Bonnes pratiques du seed

| Pratique | Pourquoi |
|----------|----------|
| **Thèmes variés** | Permet de tester différentes requêtes sémantiques |
| **Destinations réalistes** | Les embeddings captent mieux le contexte géographique |
| **Texte riche** | Plus le texte est descriptif, meilleur est l'embedding |
| **Delay entre inserts** | Évite le rate limiting de l'API OpenAI |
| **User ID fixe** | Facilite le nettoyage des données de test |

### Vérification des données

Après le seed, vous pouvez vérifier dans Qdrant :

```bash
# Via l'API Qdrant (si local)
curl http://localhost:6333/collections/user_trips

# Ou via le dashboard Qdrant Cloud
# https://cloud.qdrant.io
```

---

## 9. Pour aller plus loin

### Améliorations possibles

1. **Chunking** : Découper les longs documents en morceaux
2. **Reranking** : Utiliser un modèle de reranking après la recherche ANN
3. **Hybrid search** : Combiner BM25 (keyword) + vecteurs
4. **Caching** : Mettre en cache les embeddings fréquents
5. **Batch ingestion** : Ingérer plusieurs documents en parallèle

### Ressources

- [Qdrant Documentation](https://qdrant.tech/documentation/)
- [OpenAI Embeddings Guide](https://platform.openai.com/docs/guides/embeddings)
- [LangChain RAG Tutorial](https://python.langchain.com/docs/tutorials/rag/)

---

## 10. Exemple d'utilisation

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
User: "Montre-moi des voyages similaires à mon trip à Lisbonne"

Agent: [Appelle search_trips({ query: "Lisbon beach culture" })]
       
       🔍 Searching for "Lisbon beach culture"
       1️⃣ Generating query embedding...
       2️⃣ Searching vector database...
       ✅ Found 3 results

Agent: "Basé sur votre voyage à Lisbonne, voici 3 destinations similaires :
        
        1. **Barcelona** (88% similaire)
           - 7 jours, budget $2500
           - Plages, culture, gastronomie
        
        2. **Porto** (85% similaire)  
           - 5 jours, budget $1800
           - Même pays, ambiance similaire
        
        3. **Seville** (82% similaire)
           - 4 jours, budget $1500
           - Architecture, climat méditerranéen"
```
