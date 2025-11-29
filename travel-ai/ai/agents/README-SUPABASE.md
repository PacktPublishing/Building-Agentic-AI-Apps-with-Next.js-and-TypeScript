# Supabase Agent

Un agent LangChain simple et autonome pour interagir avec votre base de données Supabase via le protocole MCP (Model Context Protocol).

## 📋 Table des Matières

- [Vue d'ensemble](#vue-densemble)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [Tests](#tests)
- [Architecture](#architecture)
- [Exemples](#exemples)
- [Troubleshooting](#troubleshooting)

## 🎯 Vue d'ensemble

Le **SupabaseAgent** est un agent conversationnel qui permet d'interroger et de gérer votre base de données Supabase en langage naturel. Il utilise :

- **Claude (Anthropic)** comme modèle de langage
- **LangChain** pour l'orchestration
- **MCP (Model Context Protocol)** pour la communication avec Supabase
- **Transport stdio** pour une intégration directe

### Caractéristiques

✅ **Simple** - ~200 lignes de code, facile à comprendre
✅ **Déterministe** - Temperature 0 pour des réponses cohérentes
✅ **Memory** - Garde le contexte de conversation par thread
✅ **Singleton** - Une seule instance partagée
✅ **Type-safe** - Conversion automatique JSON Schema → Zod

## 🚀 Installation

Le package `@modelcontextprotocol/sdk` est déjà installé. Si besoin :

```bash
pnpm add @modelcontextprotocol/sdk
```

## ⚙️ Configuration

### 1. Variables d'environnement

Ajoutez dans votre fichier `.env` :

```env
# Anthropic API Key
ANTHROPIC_API_KEY=sk-ant-api03-...

# Supabase MCP Access Token
SUPABASE_ACCESS_TOKEN=sbp_...
```

### 2. Configuration du serveur MCP

Le serveur MCP Supabase est automatiquement lancé via `npx` avec la configuration suivante :

```typescript
{
  command: "npx",
  args: [
    "-y",
    "@supabase/mcp-server-supabase@latest",
    "--access-token",
    "<YOUR_ACCESS_TOKEN>"
  ]
}
```

### 3. Vérification

Vérifiez que `npx` est disponible dans votre PATH :

```bash
npx --version
```

## 💻 Usage

### Usage Basique

```typescript
import supabaseAgent from '@/ai/agents/supabase-agent';

// 1. Initialiser l'agent (une seule fois)
await supabaseAgent.initialize();

// 2. Interroger la base de données
const response = await supabaseAgent.invoke(
    "List all tables in the database"
);

console.log(response);
```

### Avec contexte de conversation

```typescript
import supabaseAgent from '@/ai/agents/supabase-agent';

await supabaseAgent.initialize();

const threadId = 'user-session-123';

// Première question
const tables = await supabaseAgent.invoke(
    "What tables do we have?",
    threadId
);

// Question de suivi (garde le contexte)
const schema = await supabaseAgent.invoke(
    "Tell me more about the first table",
    threadId
);
```

### Récupérer les outils disponibles

```typescript
const tools = supabaseAgent.getTools();

console.log(`Available tools: ${tools.length}`);
tools.forEach(tool => {
    console.log(`- ${tool.name}: ${tool.description}`);
});
```

### Récupérer l'état de conversation

```typescript
const state = await supabaseAgent.getState(threadId);
console.log(`Messages: ${state.values?.messages?.length}`);
```

### Fermer la connexion

```typescript
await supabaseAgent.close();
```

## 🧪 Tests

### Tests automatisés (Vitest)

```bash
# Exécuter tous les tests Supabase
pnpm test:supabase

# Mode watch (développement)
pnpm test:supabase:watch
```

### Test manuel (Script interactif)

```bash
# Script de test complet
pnpm test:supabase:manual
```

Ce script exécute :
- ✅ Initialisation de l'agent
- ✅ Listing des outils disponibles
- ✅ Requête basique (tables)
- ✅ Conversation multi-tours
- ✅ Récupération de l'état
- ✅ Requêtes structurées
- ✅ Nettoyage propre

### Exemple de sortie du test manuel

```
🚀 Starting Supabase Agent Test

📦 Step 1: Initializing agent...
✅ Agent initialized successfully

🔧 Step 2: Available tools:
Found 5 tools:

  1. list_tables
     List all tables in the database

  2. describe_table
     Get the schema of a specific table

...

📊 Step 3: Querying database tables...
Response: The database contains the following tables: users, posts, comments...

✅ All tests completed successfully!
```

## 🏗️ Architecture

### Structure de classes

```typescript
class SupabaseAgent {
    private model: ChatAnthropic;           // Claude model
    private tools: DynamicStructuredTool[]; // MCP tools
    private memory: MemorySaver;            // Thread memory
    private graph: any;                     // LangGraph agent
    private mcpClient: Client;              // MCP client
    private isInitialized: boolean;         // Init state

    static getInstance(): SupabaseAgent     // Singleton
    async initialize(): Promise<void>       // Setup MCP
    async invoke(message, threadId): string // Query DB
    getTools(): DynamicStructuredTool[]     // Get tools
    async getState(threadId)                // Get state
    async close(): Promise<void>            // Cleanup
}
```

### Flux d'exécution

```
User Message
    ↓
invoke(message, threadId)
    ↓
LangGraph Agent (createAgent)
    ↓
Claude Model (ChatAnthropic)
    ↓
[Choix d'outil MCP]
    ↓
MCP Client (stdio transport)
    ↓
npx @supabase/mcp-server-supabase
    ↓
Supabase Database
    ↓
Response ← Agent ← User
```

### Conversion des schémas

Les schémas JSON du serveur MCP sont automatiquement convertis en schémas Zod :

```typescript
// MCP JSON Schema
{
  type: "object",
  properties: {
    table_name: { type: "string" }
  },
  required: ["table_name"]
}

// Converti en Zod
z.object({
  table_name: z.string()
})
```

## 📚 Exemples

### Exemple 1: Lister les tables

```typescript
await supabaseAgent.initialize();

const tables = await supabaseAgent.invoke(
    "List all tables in my database"
);

console.log(tables);
// "Your database contains: users, posts, comments, likes, follows"
```

### Exemple 2: Décrire un schéma

```typescript
const schema = await supabaseAgent.invoke(
    "What is the structure of the users table?"
);

console.log(schema);
// "The users table has the following columns:
//  - id (uuid, primary key)
//  - email (text, unique)
//  - created_at (timestamp)
//  ..."
```

### Exemple 3: Requête avec filtres

```typescript
const data = await supabaseAgent.invoke(
    "Show me users created in the last 7 days"
);
```

### Exemple 4: Comptage

```typescript
const count = await supabaseAgent.invoke(
    "How many users are in the database?"
);
```

### Exemple 5: Conversation contextuelle

```typescript
const threadId = 'analysis-session';

await supabaseAgent.invoke("What tables exist?", threadId);
// "You have: users, posts, comments"

await supabaseAgent.invoke("How many records in the first one?", threadId);
// "The users table contains 1,234 records"

await supabaseAgent.invoke("Show me the schema", threadId);
// "The users table has columns: id, email, name..."
```

## 🔧 Troubleshooting

### Erreur: "Agent not initialized"

```typescript
// ❌ Incorrect
const response = await supabaseAgent.invoke("query");

// ✅ Correct
await supabaseAgent.initialize();
const response = await supabaseAgent.invoke("query");
```

### Erreur: "npx command not found"

Installez Node.js et npm/npx :

```bash
# Vérifier l'installation
which npx
npx --version
```

### Erreur: "SUPABASE_ACCESS_TOKEN not found"

Vérifiez votre fichier `.env` :

```bash
# Afficher la variable
echo $SUPABASE_ACCESS_TOKEN

# Recharger les variables
source .env
```

### L'agent ne se connecte pas au MCP

Vérifiez que le serveur MCP Supabase est accessible :

```bash
# Tester manuellement
npx -y @supabase/mcp-server-supabase@latest --access-token YOUR_TOKEN
```

### Les outils ne sont pas chargés

```typescript
await supabaseAgent.initialize();
const tools = supabaseAgent.getTools();

if (tools.length === 0) {
    console.error('No tools loaded! Check MCP server connection');
}
```

### Timeout lors de l'initialisation

Augmentez le timeout dans vos tests :

```typescript
beforeAll(async () => {
    await supabaseAgent.initialize();
}, 60000); // 60 secondes
```

### Mémoire de conversation perdue

Utilisez toujours le même `threadId` pour une conversation :

```typescript
// ❌ Threads différents
await supabaseAgent.invoke("What tables?", "thread-1");
await supabaseAgent.invoke("Tell me more", "thread-2"); // Contexte perdu!

// ✅ Même thread
const tid = "my-session";
await supabaseAgent.invoke("What tables?", tid);
await supabaseAgent.invoke("Tell me more", tid); // Contexte conservé
```

## 🆚 Comparaison avec TravelAssistantAgent

| Fonctionnalité | TravelAssistantAgent | SupabaseAgent |
|----------------|---------------------|---------------|
| **Lignes de code** | ~840 | ~200 |
| **Streaming** | 3 modes | Aucun (invoke only) |
| **Context Manager** | ✅ Optimisé | ❌ Simple memory |
| **Temperature** | 0.5 | 0 (déterministe) |
| **Transport MCP** | HTTP | stdio |
| **Complexité** | Élevée | Faible |
| **Use case** | Voyage/UI | Base de données |

## 📝 Notes Importantes

### Sécurité

- ⚠️ Ne commitez JAMAIS le fichier `.env` contenant vos tokens
- ⚠️ Utilisez des variables d'environnement en production
- ⚠️ Limitez les permissions du token Supabase au strict nécessaire

### Performance

- Le transport stdio est plus lent que HTTP (IPC overhead)
- Chaque outil MCP lance une communication via processus child
- Pour de meilleures performances, considérez un serveur MCP HTTP

### Limitations

- Pas de streaming (invoke uniquement)
- Pas de UI components (texte simple)
- Transport stdio uniquement (pas de HTTP/SSE)

## 🔗 Ressources

- [Documentation LangChain](https://js.langchain.com/)
- [MCP Protocol](https://modelcontextprotocol.io/)
- [Supabase MCP Server](https://github.com/supabase/mcp-server-supabase)
- [Anthropic Claude](https://www.anthropic.com/claude)

## 📄 License

Ce code fait partie du projet travel-ai et suit la même licence.
