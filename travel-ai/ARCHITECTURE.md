# Clean Architecture - Travel AI App

This document describes the clean architecture implementation for the Travel AI App.

## Architecture Overview

The application follows a **three-layer architecture** that separates concerns and ensures maintainability:

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend Layer                        │
│  (Next.js Pages, React Components, User Interactions)       │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                        Backend Layer                         │
│    (API Routes, Services, Database, Authentication)         │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                          AI Layer                            │
│     (RAG Pipeline, Agents, MCP Servers, Orchestration)      │
└─────────────────────────────────────────────────────────────┘
```

## Directory Structure

```
travel-ai/
├── app/                    # Frontend Layer - Next.js App Router
│   ├── api/               # API endpoints (Backend interface)
│   ├── (auth)/            # Auth pages (login, register)
│   ├── dashboard/         # Protected dashboard pages
│   └── page.tsx           # Landing page
│
├── components/            # UI Components
│   ├── ui/               # Reusable primitives (Button, Card, etc.)
│   ├── auth/             # Auth-specific components
│   ├── dashboard/        # Dashboard widgets
│   └── trips/            # Trip-related components
│
├── lib/                   # Backend Layer - Business Logic
│   ├── db/               # Database (Drizzle ORM)
│   ├── auth/             # Authentication helpers
│   ├── services/         # Business logic services
│   ├── validations/      # Zod schemas
│   ├── tools/            # External SDK wrappers (Amadeus, etc.)
│   └── api/              # API client utilities
│
├── ai/                    # AI Layer - Intelligent Features
│   ├── rag/              # Retrieval-Augmented Generation
│   ├── agents/           # LangGraph agents
│   ├── prompts/          # Prompt templates
│   ├── tools/            # LangChain tools
│   └── config/           # AI configuration
│
├── types/                 # Global TypeScript types
├── store/                 # State management (optional)
├── tests/                 # Test suites
└── public/                # Static assets
```

## Layer Responsibilities

### Frontend Layer (`app/`, `components/`)

**Responsibilities:**
- User interface and interactions
- Routing and navigation
- Client-side state management
- Form handling and validation
- API consumption

**Rules:**
- Never import from `lib/db` or `lib/services` directly
- Only communicate with backend via API routes
- Use type-safe API clients
- Handle loading and error states

### Backend Layer (`lib/`)

**Responsibilities:**
- Business logic and data processing
- Database operations (CRUD)
- Authentication and authorization
- Input validation (Zod schemas)
- External API integration (wrapped)

**Rules:**
- Services expose clean, typed interfaces
- All inputs are validated before processing
- Database queries are centralized in services
- External SDKs are wrapped in adapters

### AI Layer (`ai/`)

**Responsibilities:**
- RAG pipeline for document retrieval
- Agent orchestration (LangGraph)
- Prompt management
- Tool definitions for agents
- AI model configuration

**Rules:**
- Completely isolated from UI and database
- Exposes stable interfaces to backend
- All AI logic is testable independently
- Prompts are versioned and tracked

## Key Principles

### 1. Separation of Concerns

Each layer has a single, well-defined responsibility:
- **Frontend**: Presentation and user interaction
- **Backend**: Business logic and data management
- **AI**: Intelligent reasoning and orchestration

### 2. Dependency Direction

Dependencies flow **downward only**:
```
Frontend → Backend → AI
```

- Frontend depends on Backend APIs (not implementation)
- Backend depends on AI interfaces (not internals)
- AI has no dependencies on Frontend or Backend

### 3. Type Safety

- TypeScript strict mode enabled
- Zod schemas for runtime validation
- Shared types in `types/` directory
- API contracts are typed and enforced

### 4. Adapters for External Dependencies

External services are wrapped in adapters:

```typescript
// ❌ Bad: Direct SDK usage in component
import Amadeus from 'amadeus';
const amadeus = new Amadeus({ ... });
const flights = await amadeus.shopping.flightOffersSearch.get({ ... });

// ✅ Good: Use adapter
import { getAmadeusClient } from '@/lib/tools/amadeus';
const client = getAmadeusClient();
const flights = await client.searchFlights({ ... });
```

Benefits:
- Centralized error handling
- Input validation
- Standardized responses
- Easy to mock for testing
- Simple to replace provider

### 5. Replaceability

Each layer can be replaced with minimal changes:

- **Database**: Swap Supabase → PostgreSQL (only `lib/db` changes)
- **AI Provider**: Switch OpenAI → Anthropic (only `ai/config` changes)
- **UI Framework**: Migrate to another framework (only `components/` changes)

## Data Flow Example

### Creating a Trip

```
1. User fills form in TripForm component
   ↓
2. Component calls POST /api/trips
   ↓
3. API route validates with Zod schema
   ↓
4. TripService.createTrip() handles business logic
   ↓
5. Database insert via Drizzle ORM
   ↓
6. Response flows back up the chain
   ↓
7. UI updates with new trip data
```

### AI-Powered Trip Planning

```
1. User requests trip recommendations
   ↓
2. Frontend calls POST /api/ai/plan-trip
   ↓
3. API route authenticates and validates
   ↓
4. Backend calls TravelPlannerAgent
   ↓
5. Agent uses RAG to retrieve relevant info
   ↓
6. Agent calls Amadeus tool for flights/hotels
   ↓
7. LangGraph orchestrates multi-step reasoning
   ↓
8. Structured itinerary returned to backend
   ↓
9. Backend saves to database
   ↓
10. Frontend displays results
```

## Testing Strategy

### Unit Tests (`tests/unit/`)
- Test services in isolation
- Mock database and external APIs
- Fast execution (<100ms per test)

### Integration Tests (`tests/integration/`)
- Test API routes end-to-end
- Use test database
- Verify data persistence

### E2E Tests (`tests/e2e/`)
- Test complete user workflows
- Use Playwright or similar
- Run in CI/CD pipeline

## Benefits of This Architecture

1. **Maintainability**: Clear boundaries make code easy to understand
2. **Testability**: Each layer can be tested independently
3. **Scalability**: Easy to add features without breaking existing code
4. **Team Collaboration**: Frontend and backend teams can work in parallel
5. **Future-Proofing**: Easy to migrate technologies or add new features

## Migration from Monolithic Structure

If migrating from a monolithic structure:

1. ✅ Move all business logic from API routes to services
2. ✅ Extract validation schemas to `lib/validations/`
3. ✅ Wrap external SDKs in adapters (`lib/tools/`)
4. ✅ Create AI layer with clear interfaces
5. ✅ Update imports to respect layer boundaries
6. ✅ Add tests for each layer

## References

- [Clean Architecture by Robert C. Martin](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Next.js App Router Best Practices](https://nextjs.org/docs/app)
- [LangGraph Documentation](https://langchain-ai.github.io/langgraph/)
