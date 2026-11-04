# Travel AI App

An AI-powered travel planning application built with **Clean Architecture** principles, Next.js 15, TypeScript, and LangGraph.

## Features

- ⚡ **Next.js 15** with App Router
- 🔷 **TypeScript** strict mode for type safety
- 🎨 **Tailwind CSS** + shadcn/ui for modern UI
- 🤖 **AI-Powered** trip planning with LangGraph agents
- 🔍 **RAG Pipeline** for intelligent recommendations
- 🗄️ **Supabase** + Drizzle ORM for database
- 🔐 **Authentication** with Supabase Auth
- 🧪 **Vitest** for testing
- 🏗️ **Clean Architecture** for maintainability
- 🚀 **Vercel** deployment ready

## Architecture

This project follows **Clean Architecture** principles with three distinct layers:

```
┌─────────────────────────────────────────────────────────────┐
│  Frontend Layer (app/, components/)                         │
│  Next.js pages, React components, UI interactions           │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  Backend Layer (lib/)                                       │
│  Services, Database, Auth, Validations, External APIs       │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  AI Layer (ai/)                                             │
│  RAG Pipeline, LangGraph Agents, Prompts, Tools             │
└─────────────────────────────────────────────────────────────┘
```

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed documentation.

## Project Structure

```
travel-ai/
├── app/                    # Frontend Layer - Next.js App Router
│   ├── api/               # API endpoints
│   │   ├── auth/         # Authentication routes
│   │   ├── trips/        # Trip CRUD operations
│   │   ├── health/       # Health check
│   │   └── user/         # User management
│   ├── (auth)/           # Auth pages (login, register)
│   ├── dashboard/        # Protected dashboard pages
│   └── page.tsx          # Landing page
│
├── components/            # UI Components
│   ├── ui/               # Reusable primitives (Button, Card, Input, etc.)
│   ├── auth/             # Auth components (LoginForm, ProtectedRoute)
│   ├── dashboard/        # Dashboard widgets (Sidebar, UserProfile)
│   └── trips/            # Trip components (TripCard, TripList)
│
├── lib/                   # Backend Layer - Business Logic
│   ├── db/               # Database (Drizzle ORM schema & client)
│   ├── auth/             # Auth helpers (session, middleware)
│   ├── services/         # Business logic (TripService, UserService)
│   ├── validations/      # Zod schemas (trip, user)
│   ├── tools/            # External SDK wrappers
│   │   └── amadeus/      # Amadeus API adapter
│   └── api/              # API client utilities
│
├── ai/                    # AI Layer - Intelligent Features
│   ├── rag/              # Retrieval-Augmented Generation
│   ├── agents/           # LangGraph agents
│   │   ├── travel-planner/
│   │   ├── booking-assistant/
│   │   └── recommendation-agent/
│   ├── prompts/          # Prompt templates
│   ├── tools/            # LangChain tools
│   └── config/           # AI model configuration
│
├── types/                 # Global TypeScript types
├── store/                 # State management (Zustand)
├── tests/                 # Test suites
│   ├── unit/             # Unit tests
│   ├── integration/      # Integration tests
│   └── e2e/              # End-to-end tests
└── public/                # Static assets
```

## Getting Started

### Prerequisites

- Node.js 20.10+ (Node.js 20 for the Travel AI release checks)
- npm, yarn, or pnpm

### Installation & Setup

1. **Clone and install dependencies:**
```bash
pnpm install
```

2. **Environment setup:**
```bash
cp .env.example .env.local
```

Edit `.env.local` and add your environment variables:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
DATABASE_URL=your_database_url
AMADEUS_API_KEY=your_amadeus_api_key
AMADEUS_API_SECRET=your_amadeus_api_secret
```

3. **Setup database:**
```bash
pnpm db:push
```

4. **Start development server:**
```bash
pnpm dev
```

5. **Open your browser:**
Navigate to [http://localhost:3000](http://localhost:3000)

### Windows-specific Notes

- **Terminal:** Use PowerShell or Windows Terminal. If Corepack is disabled, enable it once with `corepack enable pnpm` (run the shell as administrator if permission errors occur).
- **Database commands:** run the scripts in `travel-ai`; TLS verification remains enabled.
- **Execution policy:** If PowerShell blocks pnpm scripts, run `Set-ExecutionPolicy RemoteSigned -Scope CurrentUser` once and restart the terminal.
- **TLS:** configure `POSTGRES_CA_CERT` for databases using a private certificate authority.

## Available Scripts

### Development
- `pnpm dev` - Start development server
- `pnpm build` - Build for production  
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint

### Database
- `pnpm db:generate` - Generate Drizzle migrations
- `pnpm db:push` - Push schema changes to database
- `pnpm db:studio` - Open Drizzle Studio

### Testing
- `pnpm test` - Run all tests
- `pnpm test:unit` - Run unit tests only
- `pnpm test:integration` - Run integration tests
- `pnpm test:e2e` - Run end-to-end tests
- `pnpm test:watch` - Run tests in watch mode
- `pnpm test:coverage` - Run tests with coverage report

## Clean Architecture Principles

This project strictly follows clean architecture:

1. **Separation of Concerns**: Each layer has a single responsibility
2. **Dependency Direction**: Dependencies flow downward (Frontend → Backend → AI)
3. **Type Safety**: Full TypeScript with Zod validation at boundaries
4. **Adapters**: External SDKs wrapped in adapters for replaceability
5. **Testability**: Each layer can be tested independently

See [ARCHITECTURE.md](./ARCHITECTURE.md) for complete documentation.

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Deploy automatically on every push

### Manual Deployment

1. Build the application:
```bash
   npm run build
```

2. Start the production server:
```bash
   npm run start
```

## Environment Variables

See `.env.example` for required environment variables.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## MCP v2 companion examples

The workspace HTTP and STDIO servers use SDK 2.3.1 and stateless protocol 2026-07-28. Travel AI uses MCPAdapter 2.0.1 while keeping conversation memory and approvals in application checkpoints. See [setup and reproducible verification](docs/mcp-v2/README.md).
