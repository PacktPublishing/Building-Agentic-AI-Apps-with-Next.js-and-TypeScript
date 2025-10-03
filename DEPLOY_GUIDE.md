# Configurações para Deploy no Vercel

## Travel AI App
- **Framework Preset**: Next.js
- **Root Directory**: `travel-ai`
- **Build Command**: `cd travel-ai && pnpm build`
- **Install Command**: `pnpm install`
- **Output Directory**: `travel-ai/.next` (deixe em branco, o Next.js detecta automaticamente)

## MCP Amadeus App  
- **Framework Preset**: Next.js
- **Root Directory**: `mcp-amadeus`
- **Build Command**: `cd mcp-amadeus && pnpm build`
- **Install Command**: `pnpm install`
- **Output Directory**: `mcp-amadeus/.next` (deixe em branco, o Next.js detecta automaticamente)

## Variáveis de Ambiente Necessárias
Você precisará configurar essas variáveis no painel do Vercel:

### Para Travel AI:
- `DATABASE_URL` (se estiver usando banco de dados)
- `NEXT_PUBLIC_SUPABASE_URL` (se estiver usando Supabase)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### Para MCP Amadeus:
- `AMADEUS_API_KEY` (se estiver usando API da Amadeus)
- `AMADEUS_API_SECRET`