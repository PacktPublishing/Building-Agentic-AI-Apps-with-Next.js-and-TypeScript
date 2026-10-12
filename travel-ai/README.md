# Travel AI (Next.js 15)

The deployable application root is `travel-ai/`, not the repository root. Use Node 20.x and the pinned `pnpm@10.14.0` through Corepack. Install with `pnpm install --frozen-lockfile`, then run `pnpm check` before deployment. This gate runs offline tests; `pnpm test:live` separately requires provider credentials and a running test server, and must not be reported as passed unless actually run. Set Node 20 in the Vercel project settings; `NODE_VERSION` in `vercel.json` does not select the build runtime. Record the deployed commit SHA and `node --version` / `pnpm --version` from the preview build logs.

### Feature configuration

Copy `.env.example` to a local, untracked environment file; never commit credentials. Server-only values must not use the `NEXT_PUBLIC_` prefix. Configure each enabled feature explicitly:

| Feature | Required values | Optional values |
| --- | --- | --- |
| Auth | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | — |
| Chat | `ANTHROPIC_API_KEY`, `AMADEUS_URL`, `AMADEUS_BEARER_TOKEN` | `MODEL_NAME` (validated Claude model; defaults to the pinned example) |
| Retrieval | `OPENAI_API_KEY`, `QDRANT_URL` | `QDRANT_API_KEY` only for local HTTP; required for hosted HTTPS, `COHERE_API_KEY` for reranking |
| Persistence | `POSTGRES_URL` (runtime role); `POSTGRES_URL_NON_POOLING` for migrations and durable orchestration | `POSTGRES_CA_CERT` (migration trust root) |

Set preview and production variables separately in Vercel; preview must use test-provider projects, a test Qdrant collection and an isolated database, not production credentials. Build-time `NEXT_PUBLIC_*` values are embedded into browser assets, so redeploy after changing them. Do not put service-role keys, database URLs or provider secrets in public variables. Feature entry points reject blank or invalid settings with a generic configuration error before contacting the provider. Localhost HTTP endpoints are only accepted outside production.

For a clean preview, prepare the database schema in the isolated preview database using the migration role, create the Qdrant collection used by retrieval and populate it with test data, and configure Supabase Auth redirect URLs for the preview hostname. Enable and verify the intended Supabase RLS/access policies for the application tables; an anon key alone does not define data isolation. Then run an authenticated chat, retrieval and persistence smoke test using test accounts and test services. A successful build does not substitute for these checks.

A modern, full-stack Next.js application built with TypeScript, Tailwind CSS, and Zustand for state management.

## Features

- ⚡ **Next.js 15** with App Router
- 🔷 **TypeScript** for type safety
- 🎨 **Tailwind CSS** for styling
- 🏪 **Zustand** for state management
- 📱 **Responsive Design** with mobile-first approach
- 🛠️ **ESLint & Prettier** for code quality
- 🚀 **Vercel** deployment ready

## Project Structure

\`\`\`
app/                    # Next.js App Router (main structure)
├── dashboard/          # Dashboard pages with layout
├── globals.css         # Global styles
├── layout.tsx          # Root layout
└── page.tsx           # Homepage

src/                    # Source files
├── components/         # Reusable UI components
│   ├── ui/            # Base UI components (Button, Card, etc.)
│   └── dashboard/     # Dashboard-specific components
└── lib/               # Utility functions
\`\`\`

## Getting Started

### Prerequisites

- Node.js 18+ (recommended: Node.js 20+)
- npm, yarn, or pnpm

### Installation & Setup

1. **Clone and install dependencies:**
   \`\`\`bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   \`\`\`

2. **Environment setup:**
   \`\`\`bash
   cp .env.example .env.local
   \`\`\`
   Edit `.env.local` and add your environment variables.

3. **Start development server:**
   \`\`\`bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   \`\`\`

4. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

### Windows Setup Notes

- **Use PowerShell or Windows Terminal.** Corepack comes bundled with Node.js 18+, so enable it once with `corepack enable pnpm` (run as administrator if you hit permission errors).
- **Install dependencies:** `pnpm install`
- **Apply database schema in an isolated development database:** `pnpm db:migrate`. TLS certificates are verified; configure the provider CA with `POSTGRES_CA_CERT` or Node's trusted CA store where needed. Do not disable TLS validation.
- **Start developing:** `pnpm dev` and open `http://localhost:3000`
- **Troubleshooting:** If PowerShell refuses scripts, right-click the terminal and choose “Run as administrator”, then execute `Set-ExecutionPolicy RemoteSigned -Scope CurrentUser` once.

### 🚨 Common Setup Issues & Solutions

#### Issue: "Module not found" errors
**Solution:** The project uses mixed `app/` and `src/` structure. Make sure:
- UI components are in `src/components/ui/`
- Dashboard components are in `src/components/dashboard/`
- Pages are in `app/` directory

#### Issue: Import path errors (`@/` not resolving)
**Solution:** The tsconfig.json is configured with:
\`\`\`json
"paths": {
  "@/*": ["./src/*"],
  "@/app/*": ["./app/*"]
}
\`\`\`

#### Issue: Tailwind styles not loading
**Solution:** Make sure `app/globals.css` is imported in `app/layout.tsx`

#### Issue: TypeScript errors
**Solution:** Run `npm run lint:fix` to auto-fix common issues

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production  
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting

## State Management

The application uses Zustand for state management with the following stores:

- **User Store** - User authentication and profile data
- **App Store** - Application-wide settings (theme, sidebar state)

## Deployment

### Database migration safety

Schema migration is a separate, reviewed release step; it is not run by `next build` or application startup. Use `POSTGRES_URL_NON_POOLING` with a migration-specific database role and a certificate trusted for that hostname. Set `POSTGRES_CA_CERT` to the provider CA in PEM form when it is not in the system trust store. Drizzle Kit and the durable checkpointer use explicit connection fields so verified TLS cannot be lost through a URL parser; this Drizzle Kit version drops a sibling `ssl` option when `dbCredentials.url` is used. The runtime uses `POSTGRES_URL` with a separate, least-privilege role. Before production migration, review generated SQL and take a restorable database backup/snapshot. Test both forward migration and a recovery from backup against a clone; Drizzle migrations have no automatic rollback. Do not use `db:push` against production. The orchestration migration creates only the ownership/usage tables, while the LangGraph Postgres checkpointer sets up its own checkpoint tables at startup.

The daily `/api/cron/prune-orchestration` job requires `CRON_SECRET`; it deletes only expired conversations and matching checkpoints after 30 days. Schedule and verify this job in the deployed environment before relying on the retention policy. Migration `0005_approval_sessions.sql` adds the separate approval conversation type; apply it before using `/api/chat/approval`. This route requires a Supabase bearer token and durable PostgreSQL storage. It currently exposes only read-only travel search tools. The decision route rejects foreign, missing and stale approval requests; no real booking or other write tool is enabled.

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Deploy automatically on every push

### Manual Deployment

1. Build the application:
   \`\`\`bash
   npm run build
   \`\`\`

2. Start the production server:
   \`\`\`bash
   npm run start
   \`\`\`

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

## MCP v2 client

Amadeus uses MCPAdapter 2.0.1 in modern mode with unprefixed tool names. The optional Supabase STDIO client uses SDK v2 with automatic protocol negotiation for third-party compatibility. Durable LangGraph checkpoints, approval owner binding and replay protection are independent of stateless MCP requests. See [migration verification](../docs/mcp-v2/README.md).
