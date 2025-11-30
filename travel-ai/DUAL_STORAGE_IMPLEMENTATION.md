# Dual-Storage Trip Planner Implementation

## 🎯 Vue d'ensemble

Implémentation d'un système de sauvegarde dual-storage suivant les principes de Clean Architecture :

1. **PostgreSQL (via Drizzle)** : Source de vérité pour les données structurées de l'application
2. **Qdrant (Vector DB)** : Base de données vectorielle pour la recherche sémantique et le RAG

## 🏗️ Architecture Clean

```
┌─────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                        │
│                                                              │
│  app/api/trips/save/route.ts  (API Endpoint)                │
│  app/api/qdrant/init/route.ts (Qdrant Init)                │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    APPLICATION LAYER                         │
│                                                              │
│  lib/application/use-cases/save-trip.use-case.ts            │
│  (Orchestrates business logic)                              │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                      DOMAIN LAYER                            │
│                                                              │
│  lib/domain/trip/repository.ts         (ITripRepository)    │
│  lib/domain/vector/repository.ts       (IVectorRepository)  │
│  lib/domain/embeddings/service.ts      (IEmbeddingsService) │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                  INFRASTRUCTURE LAYER                        │
│                                                              │
│  lib/infrastructure/db/trip-repository.ts    (Drizzle)      │
│  lib/infrastructure/qdrant/vector-repository.ts (Qdrant)    │
│  lib/infrastructure/embeddings/openai-service.ts (OpenAI)   │
└─────────────────────────────────────────────────────────────┘
```

## 📁 Structure des Fichiers Créés

```
travel-ai/
├── lib/
│   ├── domain/                    # 🔵 Domain Layer (Interfaces)
│   │   ├── trip/
│   │   │   └── repository.ts      # ITripRepository interface
│   │   ├── vector/
│   │   │   └── repository.ts      # IVectorRepository interface
│   │   └── embeddings/
│   │       └── service.ts         # IEmbeddingsService interface
│   │
│   ├── application/               # 🟢 Application Layer (Use Cases)
│   │   └── use-cases/
│   │       └── save-trip.use-case.ts
│   │
│   └── infrastructure/            # 🟡 Infrastructure Layer (Implementations)
│       ├── db/
│       │   └── trip-repository.ts        # Drizzle implementation
│       ├── qdrant/
│       │   ├── client.ts                 # Qdrant client singleton
│       │   ├── collections.ts            # Collection initialization
│       │   └── vector-repository.ts      # Qdrant implementation
│       └── embeddings/
│           └── openai-service.ts         # OpenAI embeddings
│
├── ai/
│   └── utils/
│       └── summary-generator.ts   # Trip summary text generation
│
└── app/
    └── api/
        ├── trips/
        │   └── save/
        │       └── route.ts       # 🟣 Presentation Layer
        └── qdrant/
            └── init/
                └── route.ts       # Qdrant initialization endpoint
```

## 🔧 Variables d'Environnement

Ajoutez ces variables à votre fichier `.env` :

```bash
# Qdrant Configuration
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=your-api-key-here  # Optional for local

# OpenAI Configuration (for embeddings)
OPENAI_API_KEY=sk-...
```

## 🚀 Installation et Setup

### 1. Les dépendances sont déjà installées

```bash
# Déjà fait :
# pnpm add @qdrant/js-client-rest openai
```

### 2. Démarrer Qdrant (Local)

```bash
# Option 1: Docker
docker run -p 6333:6333 qdrant/qdrant

# Option 2: Qdrant Cloud (recommandé pour production)
# Créez un cluster sur https://cloud.qdrant.io
# Utilisez l'URL et API key fournis
```

### 3. Initialiser les Collections Qdrant

```bash
# Appel API unique pour créer les collections
curl http://localhost:3000/api/qdrant/init
```

Ou visitez : `http://localhost:3000/api/qdrant/init` dans votre navigateur

## 📡 API Usage

### Sauvegarder un Trip

**Endpoint** : `POST /api/trips/save`

**Request Body** :

```json
{
  "userId": "uuid-here",
  "title": "Trip to New York",
  "formInput": {
    "numPeople": 2,
    "departureCity": "Paris",
    "arrivalCity": "New York",
    "departureDate": "2025-06-15",
    "stayDuration": 7,
    "budgetCategory": "standard",
    "numRooms": 1,
    "userId": "uuid-here"
  },
  "orchestratorDecisions": {
    "budget": {
      "flightBudgetPerPerson": 600,
      "hotelBudgetPerNight": 150,
      "activityBudgetPerDay": 100,
      "totalEstimated": 5000
    },
    "criteria": {
      "flightClass": "premium_economy",
      "maxStops": 1,
      "hotelStars": 4,
      "activityTypes": ["cultural", "food", "sightseeing"]
    }
  },
  "flightResults": {
    "data": [/* flight objects */]
  },
  "hotelResults": {
    "data": [/* hotel objects */]
  },
  "activityResults": {
    "data": [/* activity objects */]
  },
  "threadId": "trip-planning-session-123"
}
```

**Response** :

```json
{
  "success": true,
  "tripId": "uuid-of-saved-trip",
  "message": "Trip saved successfully"
}
```

## 🔍 Flow de Sauvegarde

```
1. POST /api/trips/save
   │
   ├─> Validate Request (Zod)
   │
   ├─> Initialize Repositories
   │   ├─> DrizzleTripRepository
   │   ├─> QdrantVectorRepository
   │   └─> OpenAIEmbeddingsService
   │
   ├─> Execute SaveTripUseCase
   │   │
   │   ├─> 1. Save to PostgreSQL
   │   │   └─> Return: SavedTrip with ID
   │   │
   │   ├─> 2. Generate Summary Text
   │   │   └─> "7-day trip to New York from Paris for 2 people..."
   │   │
   │   ├─> 3. Generate Embedding (OpenAI)
   │   │   └─> Vector[1536] from summary text
   │   │
   │   ├─> 4. Build Qdrant Payload
   │   │   └─> TripVectorPayload with metadata
   │   │
   │   └─> 5. Upsert to Qdrant
   │       └─> Collection: user_trips
   │
   └─> Return Success Response
```

## 🗄️ Data Storage

### PostgreSQL (trips table)

```sql
CREATE TABLE trips (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  destination TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  budget NUMERIC,
  num_people INTEGER,
  departure_city TEXT,
  arrival_city TEXT,
  departure_date DATE,
  stay_duration INTEGER,
  flights JSONB,           -- Array of flight objects
  hotels JSONB,            -- Array of hotel objects
  activities JSONB,        -- Array of activity objects
  status TEXT DEFAULT 'draft',
  thread_id TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Qdrant (user_trips collection)

```typescript
{
  id: "trip-uuid",
  vector: [0.123, -0.456, ...],  // 1536 dimensions
  payload: {
    trip_id: "trip-uuid",
    user_id: "user-uuid",
    title: "Trip to New York",
    destination: "New York",
    departure_city: "Paris",
    departure_date: "2025-06-15",
    stay_duration: 7,
    num_people: 2,
    budget_category: "standard",
    total_budget: 5000,
    summary_text: "7-day trip to New York...",
    num_flights: 3,
    num_hotels: 2,
    num_activities: 6,
    status: "confirmed",
    created_at: "2025-05-01T10:00:00Z",
    thread_id: "trip-planning-session-123"
  }
}
```

## 🧪 Testing

### Test 1: PostgreSQL Save

```typescript
const response = await fetch('/api/trips/save', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(tripData),
});

const result = await response.json();
console.log(result.tripId); // UUID
```

### Test 2: Verify Qdrant

```bash
# Check Qdrant collection
curl http://localhost:6333/collections/user_trips

# Search for a trip
curl -X POST http://localhost:6333/collections/user_trips/points/search \
  -H 'Content-Type: application/json' \
  -d '{
    "filter": {
      "must": [{ "key": "user_id", "match": { "value": "user-uuid" }}]
    },
    "limit": 5
  }'
```

## 🎯 Use Cases Futurs

### Recherche Sémantique

```typescript
// À implémenter
POST /api/trips/search
{
  "userId": "uuid",
  "query": "Find my trips to Paris"
}
```

### Recommandations

```typescript
// À implémenter
GET /api/trips/{tripId}/similar
```

## 🔒 Sécurité

1. **Row-Level Security (RLS)** : Les users ne peuvent voir que leurs propres trips
2. **Validation Zod** : Toutes les entrées sont validées
3. **Error Handling** : Les erreurs sont loggées mais les détails sensibles ne sont pas exposés

## 📊 Monitoring

Tous les logs sont préfixés avec des emojis pour faciliter le debugging :

- 📝 SaveTripUseCase actions
- ✅ Success operations
- ❌ Errors
- 🔧 Initialization
- 📊 Qdrant operations

## 🚧 TODO / Améliorations Futures

- [ ] Ajouter endpoint de recherche sémantique
- [ ] Implémenter pagination pour la liste des trips
- [ ] Ajouter cache Redis pour les embeddings
- [ ] Créer webhook pour sync automatique
- [ ] Ajouter métriques de performance
- [ ] Implémenter retry logic pour Qdrant failures

---

**Dernière mise à jour** : 2025-01-30
**Architecture** : Clean Architecture
**Stack** : Next.js 15 + Drizzle + Qdrant + OpenAI
