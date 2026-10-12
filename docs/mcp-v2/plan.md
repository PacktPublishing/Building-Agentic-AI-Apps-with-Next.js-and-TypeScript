# MCP v2 migration on the current GitHub base

Issue: #49. Baseline: fb98a9b9444c10b5596dfc3b93ce63867c6df217.

The authoritative Packt workspace has three packages. Migrate their first-party MCP interfaces to SDK 2.3.1 and protocol 2026-07-28, keeping all approval, owner binding, hotel ratings, validation and durable checkpoint behavior from GitHub.

## Implementation
1. Move HTTP and STDIO servers to @modelcontextprotocol/server, Zod 4, registerTool/registerResource/registerPrompt and native serving factories. Reject legacy protocol initialization; retain authentication, origin validation and sanitized errors. Remove the shared HTTP request queue.
2. Move Travel AI to MCPAdapter 2.0.1 with modern mode, listTools and unprefixed names. Upgrade the required LangChain/checkpoint peers as one compatible family, preserving application-level thread memory. Keep the optional Supabase client auto negotiation. Travel AI may keep Zod 3, which LangChain supports.
3. Update existing transport tests for pinned modern clients. Update workspace locks and active instructions. Add reproducible compiled STDIO/real HTTP/adapter proof with a synthetic provider; no paid provider calls.
4. Run all three package release checks using Node 20 and isolated Postgres; review Standards and Spec in parallel; preserve current evidence and commit scoped work.

## Acceptance
- All packages install with the frozen workspace lock, typecheck and build; canonical offline tests pass including isolated Postgres integrations.
- STDIO exposes eight tools (including get_hotel_ratings), three resources and three prompts; read, prompt, tool success/error behavior is verified.
- HTTP accepts concurrent modern clients without initialization/session IDs, requires Bearer auth and allowed Origin, rejects legacy initialization and preserves safe failures.
- The actual Travel AI adapter discovers unprefixed tools and invokes them; thread isolation and durable approval/checkpoint regressions pass.
- Active code and companion setup instructions use v2. Existing locally updated book sources remain preserved; this code migration does not republish the manuscript or rewrite unrelated content.

## Boundaries
No deployment, merge, paid-provider calls, credentials changes or automatic push. The older standalone ai-travel checkout stays at its own GitHub baseline; the three-package Packt workspace is the source for this migration. Earlier manuscript work and local backups are recoverable. Existing issue #49 is updated for this new GitHub baseline; close only when all current acceptance criteria pass.
