# Travel AI App - Complete Project Structure

## 📁 Full Directory Tree

```
travel-ai/
│
├── 📄 Configuration Files
│   ├── .env                          # Environment variables (gitignored)
│   ├── env.example                   # Environment template
│   ├── .eslintrc.json               # ESLint configuration
│   ├── .gitignore                   # Git ignore rules
│   ├── .prettierrc                  # Prettier configuration
│   ├── components.json              # shadcn/ui configuration
│   ├── drizzle.config.ts            # Drizzle ORM configuration
│   ├── next.config.mjs              # Next.js configuration
│   ├── package.json                 # Dependencies and scripts
│   ├── postcss.config.js            # PostCSS configuration
│   ├── tailwind.config.ts           # Tailwind CSS configuration
│   ├── tsconfig.json                # TypeScript configuration
│   ├── vitest.config.ts             # Vitest test configuration
│   └── vercel.json                  # Vercel deployment config
│
├── 📚 Documentation
│   ├── README.md                    # Main project documentation
│   ├── ARCHITECTURE.md              # Clean architecture guide
│   ├── MIGRATION_SUMMARY.md         # Migration changelog
│   ├── PROJECT_STRUCTURE.md         # This file
│   ├── GUIDE_TEST_AUTH.md           # Auth testing guide
│   └── schema_ddb.md                # Database schema documentation
│
├── 🎨 app/ - Frontend Layer (Next.js App Router)
│   │
│   ├── api/ - API Routes (Backend Interface)
│   │   ├── auth/
│   │   │   ├── login/
│   │   │   │   └── route.ts         # POST /api/auth/login
│   │   │   ├── register/
│   │   │   │   └── route.ts         # POST /api/auth/register
│   │   │   └── logout/
│   │   │       └── route.ts         # POST /api/auth/logout
│   │   │
│   │   ├── trips/
│   │   │   ├── route.ts             # GET, POST /api/trips
│   │   │   └── [id]/
│   │   │       └── route.ts         # GET, PUT, DELETE /api/trips/:id
│   │   │
│   │   ├── health/
│   │   │   └── route.ts             # GET /api/health
│   │   │
│   │   └── user/
│   │       └── route.ts             # User management endpoints
│   │
│   ├── (auth)/ - Auth Pages (Route Group)
│   │   └── login/
│   │       └── page.tsx             # Login page
│   │
│   ├── dashboard/ - Protected Dashboard
│   │   ├── layout.tsx               # Dashboard layout
│   │   ├── page.tsx                 # Dashboard home
│   │   ├── profile/
│   │   │   └── page.tsx             # User profile page
│   │   ├── settings/
│   │   │   └── page.tsx             # Settings page
│   │   └── trips/
│   │       ├── page.tsx             # Trips list
│   │       └── new/
│   │           └── page.tsx         # Create new trip
│   │
│   ├── globals.css                  # Global styles
│   ├── layout.tsx                   # Root layout
│   └── page.tsx                     # Landing page
│
├── 🧩 components/ - UI Components
│   │
│   ├── ui/ - Reusable UI Primitives
│   │   ├── button.tsx               # Button component
│   │   ├── card.tsx                 # Card component
│   │   ├── input.tsx                # Input component
│   │   └── navbar.tsx               # Navigation bar
│   │
│   ├── auth/ - Authentication Components
│   │   ├── auth-provider.tsx        # Auth context provider
│   │   ├── login-form.tsx           # Login form
│   │   ├── register-form.tsx        # Registration form
│   │   └── protected-route.tsx      # Route protection HOC
│   │
│   ├── dashboard/ - Dashboard Widgets
│   │   ├── sidebar.tsx              # Dashboard sidebar
│   │   ├── user-profile.tsx         # User profile widget
│   │   └── api-demo.tsx             # API demo component
│   │
│   ├── trips/ - Trip Components
│   │   ├── trip-card.tsx            # Trip card display
│   │   └── trip-list.tsx            # Trip list container
│   │
│   ├── theme-provider.tsx           # Theme context provider
│   └── theme-toggle.tsx             # Dark/light mode toggle
│
├── 🔧 lib/ - Backend Layer (Business Logic)
│   │
│   ├── db/ - Database Layer
│   │   ├── index.ts                 # Drizzle client instance
│   │   └── schema.ts                # Database schema (users, trips, etc.)
│   │
│   ├── auth/ - Authentication
│   │   ├── session.ts               # Session management
│   │   └── middleware.ts            # Auth middleware (TODO)
│   │
│   ├── services/ - Business Logic Services
│   │   ├── trip-service.ts          # Trip CRUD operations
│   │   └── user-service.ts          # User management
│   │
│   ├── validations/ - Zod Schemas
│   │   ├── trip.ts                  # Trip validation schemas
│   │   └── user.ts                  # User validation schemas
│   │
│   ├── tools/ - External SDK Wrappers
│   │   └── amadeus/
│   │       └── index.ts             # Amadeus API adapter
│   │
│   ├── api/ - API Client Utilities
│   │   └── client.ts                # HTTP client wrapper
│   │
│   ├── supabase/ - Supabase Client
│   │   └── client.ts                # Supabase client factory
│   │
│   ├── hooks/ - React Hooks
│   │   └── (custom hooks)
│   │
│   └── utils.ts                     # Utility functions (cn, etc.)
│
├── 🤖 ai/ - AI Layer (Intelligent Features)
│   │
│   ├── README.md                    # AI layer documentation
│   │
│   ├── config/ - AI Configuration
│   │   └── models.ts                # LLM model configs
│   │
│   ├── prompts/ - Prompt Templates
│   │   └── system.ts                # System prompts
│   │
│   ├── rag/ - Retrieval-Augmented Generation
│   │   ├── index.ts                 # RAG pipeline entry
│   │   ├── embeddings.ts            # Embedding generation (TODO)
│   │   ├── vectorstore.ts           # Qdrant integration (TODO)
│   │   └── retriever.ts             # Document retrieval (TODO)
│   │
│   ├── agents/ - LangGraph Agents
│   │   ├── travel-planner/
│   │   │   ├── index.ts             # Travel planner agent
│   │   │   ├── graph.ts             # LangGraph definition (TODO)
│   │   │   ├── nodes.ts             # Agent nodes (TODO)
│   │   │   └── state.ts             # Agent state (TODO)
│   │   │
│   │   ├── booking-assistant/
│   │   │   └── (TODO)
│   │   │
│   │   └── recommendation-agent/
│   │       └── (TODO)
│   │
│   └── tools/ - LangChain Tools
│       ├── flight-search.ts         # Flight search tool (TODO)
│       ├── hotel-search.ts          # Hotel search tool (TODO)
│       └── weather.ts               # Weather tool (TODO)
│
├── 📊 types/ - Global TypeScript Types
│   ├── index.ts                     # Main type exports
│   ├── api.ts                       # API types
│   └── models.ts                    # Domain models
│
├── 🗄️ store/ - State Management (Zustand)
│   ├── app-store.ts                 # App-wide state
│   └── user-store.ts                # User state
│
├── 🧪 tests/ - Test Suites
│   │
│   ├── README.md                    # Testing documentation
│   ├── setup.ts                     # Vitest setup file
│   │
│   ├── unit/ - Unit Tests
│   │   ├── lib/
│   │   │   └── trip-service.test.ts # Service tests
│   │   └── ai/
│   │       └── (TODO)
│   │
│   ├── integration/ - Integration Tests
│   │   └── api/
│   │       └── trips.test.ts        # API endpoint tests
│   │
│   └── e2e/ - End-to-End Tests
│       └── dashboard/
│           └── (TODO)
│
├── 🗄️ drizzle/ - Database Migrations
│   └── meta/
│       ├── 0000_snapshot.json
│       └── _journal.json
│
├── 🖼️ public/ - Static Assets
│   ├── placeholder-logo.png
│   ├── placeholder-logo.svg
│   ├── placeholder-user.jpg
│   └── placeholder.svg
│
└── 📦 node_modules/ - Dependencies (gitignored)
```

## 🎯 Layer Breakdown

### Frontend Layer (User-Facing)
- **Location**: `app/`, `components/`
- **Purpose**: UI, routing, user interactions
- **Dependencies**: Backend APIs only (no direct DB/AI access)

### Backend Layer (Business Logic)
- **Location**: `lib/`
- **Purpose**: Services, validation, database, auth
- **Dependencies**: Database, external APIs (wrapped)

### AI Layer (Intelligence)
- **Location**: `ai/`
- **Purpose**: RAG, agents, prompts, AI tools
- **Dependencies**: None (completely isolated)

## 📝 File Naming Conventions

- **Components**: `kebab-case.tsx` (e.g., `trip-card.tsx`)
- **Services**: `kebab-case-service.ts` (e.g., `trip-service.ts`)
- **Types**: `kebab-case.ts` (e.g., `api.ts`)
- **Tests**: `*.test.ts` (e.g., `trip-service.test.ts`)
- **API Routes**: `route.ts` (Next.js convention)
- **Pages**: `page.tsx` (Next.js convention)

## 🔑 Key Directories

| Directory | Purpose | Layer |
|-----------|---------|-------|
| `app/api/` | API endpoints | Backend Interface |
| `app/(auth)/` | Auth pages | Frontend |
| `app/dashboard/` | Protected pages | Frontend |
| `components/ui/` | Reusable UI | Frontend |
| `lib/services/` | Business logic | Backend |
| `lib/validations/` | Zod schemas | Backend |
| `lib/tools/` | SDK adapters | Backend |
| `ai/agents/` | LangGraph agents | AI |
| `ai/rag/` | RAG pipeline | AI |
| `types/` | Global types | Shared |
| `tests/` | Test suites | All layers |

## 🚀 Quick Navigation

- **Add a new API route**: `app/api/[name]/route.ts`
- **Add a new page**: `app/[name]/page.tsx`
- **Add a UI component**: `components/ui/[name].tsx`
- **Add business logic**: `lib/services/[name]-service.ts`
- **Add validation**: `lib/validations/[name].ts`
- **Add AI agent**: `ai/agents/[name]/index.ts`
- **Add test**: `tests/[unit|integration|e2e]/[name].test.ts`

## 📊 Statistics

- **Total Layers**: 3 (Frontend, Backend, AI)
- **API Routes**: 6+ endpoints
- **Services**: 2 (Trip, User)
- **Components**: 15+
- **Validation Schemas**: 2 (Trip, User)
- **AI Agents**: 3 (planned)
- **Test Files**: 2 (with TODOs)

---

**Last Updated**: October 1, 2025  
**Architecture**: Clean Architecture  
**Framework**: Next.js 15 + TypeScript
