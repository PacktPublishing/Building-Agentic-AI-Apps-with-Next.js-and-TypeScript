# Chat API

API simplifiée pour interagir avec l'agent de voyage via streaming SSE. L'agent gère automatiquement les outils sans nécessiter d'approbation.

## Route

### POST `/api/chat/start`

Démarre ou continue une conversation avec l'agent.

**Request Body:**
```typescript
{
  message: string;      // Le message de l'utilisateur
  threadId?: string;    // ID du thread (optionnel, pour continuer une conversation)
  userId?: string;      // ID de l'utilisateur (optionnel)
}
```

**Response:** Server-Sent Events (SSE)

**Types d'événements SSE:**

1. **start** - Début du stream
```json
{
  "type": "start",
  "data": { "threadId": "thread-123" }
}
```

2. **token** - Token de texte streamé
```json
{
  "type": "token",
  "data": { "content": "Hello " }
}
```

3. **toolCall** - Appel d'outil (informatif)
```json
{
  "type": "toolCall",
  "data": {
    "name": "search_flights",
    "args": { "from": "Paris", "to": "NYC" }
  }
}
```

4. **complete** - Fin du stream
```json
{
  "type": "complete",
  "data": {
    "threadId": "thread-123",
    "response": "Full response text"
  }
}
```

5. **error** - Erreur
```json
{
  "type": "error",
  "data": {
    "error": "Error message",
    "details": "..."
  }
}
```

---

## Exemples d'utilisation

### 1. Nouvelle conversation

```bash
curl -X POST http://localhost:3000/api/chat/start \
  -H "Content-Type: application/json" \
  -d '{
    "message": "I want to visit Paris"
  }' \
  --no-buffer
```

### 2. Continuer une conversation

```bash
curl -X POST http://localhost:3000/api/chat/start \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Tell me more about the Eiffel Tower",
    "threadId": "thread-1234567890-abc123"
  }' \
  --no-buffer
```

### 3. Avec recherche d'outils

```bash
curl -X POST http://localhost:3000/api/chat/start \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Search for flights from Paris to New York for November 2025"
  }' \
  --no-buffer
```

---

## Utilisation en JavaScript

```javascript
const response = await fetch('/api/chat/start', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: 'Hello!',
    threadId: existingThreadId // optionnel
  })
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { value, done } = await reader.read();
  if (done) break;
  
  const chunk = decoder.decode(value);
  const lines = chunk.split('\n');
  
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const event = JSON.parse(line.substring(6));
      
      switch (event.type) {
        case 'start':
          console.log('Thread ID:', event.data.threadId);
          break;
        case 'token':
          process.stdout.write(event.data.content);
          break;
        case 'complete':
          console.log('\nDone!');
          break;
      }
    }
  }
}
```

---

## Tests

```bash
# Démarrer le serveur
pnpm dev

# Dans un autre terminal
TEST_BASE_URL=http://localhost:3000 pnpm test src/app/api/chat/chat.test.ts
```

---

## Interface de test

Une interface web de test est disponible :

```bash
pnpm dev
open http://localhost:3000/test-chat
```

---

## Fonctionnalités

- ✅ **Streaming en temps réel** : Réponses progressives via SSE
- ✅ **Gestion automatique des outils** : L'agent utilise les outils sans approbation
- ✅ **Conversations persistantes** : Utilisez le `threadId` pour continuer
- ✅ **TypeScript strict** : Types complets pour une intégration facile

---

## Variables d'environnement

```bash
# OpenAI
OPENAI_API_KEY=sk-...

# Amadeus MCP
AMADEUS_URL=https://mcp-amadeus.vercel.app/api/mcp
AMADEUS_BEARER_TOKEN=...
```

---

## Architecture

```
User → POST /api/chat/start → Agent → Tools (automatic) → SSE Stream → User
```

L'agent gère automatiquement :
- La sélection des outils appropriés
- L'exécution des outils
- L'agrégation des résultats
- La génération de la réponse finale

Tout est transparent pour l'utilisateur qui reçoit simplement la réponse finale en streaming.
