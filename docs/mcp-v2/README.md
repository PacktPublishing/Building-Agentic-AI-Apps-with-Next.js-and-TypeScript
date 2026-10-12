# MCP SDK v2 companion examples

The HTTP and STDIO packages use `@modelcontextprotocol/server` 2.3.1 and Zod 4. Travel AI uses `MCPAdapter` 2.0.1. SDK versions and protocol revisions are different: the first-party servers require stateless protocol **2026-07-28**.

Each MCP request carries its own protocol/client metadata. SDK clients generate it and the corresponding HTTP headers. The HTTP factory creates a server for each request; STDIO keeps an instance for the connection lifetime. Both reject legacy initialization. Modern HTTP returns no MCP session ID. Amadeus OAuth caching is provider state; LangGraph thread IDs and Postgres checkpoints are application state. They persist independently of MCP requests.

HTTP authentication, Origin restrictions, sanitized tool errors, hotel ID ratings, durable approval and replay protection retain the current GitHub behavior. Tool names are unprefixed so the Travel AI tool policy and UI keep their existing contracts. The optional Supabase client negotiates automatically because its third-party server may still use a legacy protocol.

## Install and release checks

Use Node.js 20.10+ (CI uses Node 20) and pnpm 10.14.0. Install from the workspace root. The root `pnpm-lock.yaml` is authoritative; obsolete child locks were removed.

```sh
pnpm install --frozen-lockfile
pnpm --filter mcp-amadeus-stdio test
pnpm --filter mcp-amadeus-stdio build
pnpm --filter mcp-amadeus test
pnpm --filter mcp-amadeus exec tsc --noEmit
pnpm --filter mcp-amadeus build
TEST_POSTGRES_URL=postgresql://test_user:test_password@localhost:5432/agentic_test pnpm --filter my-v0-project check
```

Use an isolated test database. `test:run` excludes only the repository's three live-provider suites; Postgres integrations run when `TEST_POSTGRES_URL` is set. Inspector 2.10.1 needs Node.js 22.19+; `pnpm --filter mcp-amadeus-stdio inspect` explicitly selects modern mode.

## Reproduce transport proof

First build the STDIO and HTTP packages. In one terminal from the workspace root, start the built HTTP server with synthetic credentials and the verification-only provider preload:

```sh
AMADEUS_CLIENT_ID=fixture AMADEUS_CLIENT_SECRET=fixture MCP_BEARER_TOKEN=book-verification-only MCP_ALLOWED_ORIGINS=https://trusted.example NODE_OPTIONS="--require=$(pwd)/docs/mcp-v2/fake-amadeus.cjs" pnpm --filter mcp-amadeus start --hostname 127.0.0.1 --port 3199
```

In another terminal:

```sh
node docs/mcp-v2/verify-runtime.mjs
node docs/mcp-v2/verify-memory.mjs
NODE_ENV=test ANTHROPIC_API_KEY=verification-only AMADEUS_URL=http://127.0.0.1:3199/api/mcp AMADEUS_BEARER_TOKEN=book-verification-only pnpm --filter my-v0-project exec tsx --tsconfig tsconfig.json ../docs/mcp-v2/verify-client.ts
```

The preload replaces HTTPS provider requests with synthetic responses and blocks other HTTPS destinations; use it only for verification. The scripts test real compiled STDIO, the built Next.js route over loopback HTTP, self-contained replay, SDK headers, auth and safe errors, and the actual Travel AI MCP singleton. None proves deployed Amadeus access or paid model behavior.

See [plan](plan.md) and [verification](verification.md) for scope and results.
