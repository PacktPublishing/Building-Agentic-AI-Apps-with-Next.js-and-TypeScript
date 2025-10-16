# Chat API Routes

API routes pour interagir avec l'agent de voyage via un système de chat avec streaming SSE.

## Routes disponibles

### POST `/api/chat/start`

Démarre une nouvelle conversation avec l'agent.

**Request Body:**
```typescript
{
  message: string;      // Le message de l'utilisateur
  userId?: string;      // ID optionnel de l'utilisateur
}
```

**Response:**
```typescript
{
  threadId: string;                    // ID unique du thread de conversation
  requiresApproval: boolean;           // Si l'agent nécessite une approbation
  response?: string;                   // Réponse directe de l'agent
  toolCalls?: Array<{                  // Outils que l'agent veut utiliser
    id: string;
    name: string;
    args: Record<string, any>;
  }>;
}
```

**Exemple:**
```bash
curl -X POST http://localhost:3000/api/chat/start \
  -H "Content-Type: application/json" \
  -d '{"message": "I want to visit Paris"}'
```

---

### POST `/api/chat/continue`

Continue une conversation existante avec streaming SSE.

**Request Body:**
```typescript
{
  threadId: string;     // ID du thread de conversation
  approved: boolean;    // Si l'utilisateur approuve les tool calls
  message?: string;     // Nouveau message optionnel
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

3. **toolCall** - Appel d'outil
```json
{
  "type": "toolCall",
  "data": {
    "name": "search_flights",
    "args": { "from": "Paris", "to": "NYC" }
  }
}
```

4. **toolResult** - Résultat d'un outil
```json
{
  "type": "toolResult",
  "data": { "result": "..." }
}
```

5. **complete** - Fin du stream
```json
{
  "type": "complete",
  "data": {
    "response": "Full response text",
    "requiresApproval": false
  }
}
```

6. **error** - Erreur
```json
{
  "type": "error",
  "data": {
    "error": "Error message",
    "details": "..."
  }
}
```

**Exemple JavaScript:**
```javascript
const response = await fetch('/api/chat/continue', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    threadId: 'thread-123',
    approved: true
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
      console.log(event.type, event.data);
    }
  }
}
```

---

## Workflow typique

### 1. Conversation simple (sans approbation)

```javascript
// 1. Démarrer la conversation
const startRes = await fetch('/api/chat/start', {
  method: 'POST',
  body: JSON.stringify({ message: 'Hello!' })
});
const { threadId, response } = await startRes.json();

// 2. Continuer avec un nouveau message
const continueRes = await fetch('/api/chat/continue', {
  method: 'POST',
  body: JSON.stringify({
    threadId,
    approved: false,
    message: 'Tell me more'
  })
});
// Lire le stream SSE...
```

### 2. Conversation avec approbation d'outils

```javascript
// 1. Démarrer avec une requête nécessitant des outils
const startRes = await fetch('/api/chat/start', {
  method: 'POST',
  body: JSON.stringify({
    message: 'Search flights from Paris to NYC'
  })
});
const { threadId, requiresApproval, toolCalls } = await startRes.json();

// 2. Si requiresApproval === true, afficher les toolCalls à l'utilisateur
if (requiresApproval) {
  console.log('Agent wants to use:', toolCalls);
  
  // 3. Utilisateur approuve
  const continueRes = await fetch('/api/chat/continue', {
    method: 'POST',
    body: JSON.stringify({
      threadId,
      approved: true  // ou false pour rejeter
    })
  });
  // Lire le stream SSE...
}
```

---

## Tests

Lancer les tests:
```bash
pnpm test src/app/api/chat/chat.test.ts
```

Ou avec le serveur en cours d'exécution:
```bash
# Terminal 1
pnpm dev

# Terminal 2
TEST_BASE_URL=http://localhost:3000 pnpm test src/app/api/chat/chat.test.ts
```

---

## Notes techniques

- **SSE vs WebSocket**: SSE est utilisé car il est unidirectionnel (serveur → client) et plus simple pour le streaming de texte
- **Streaming**: Les tokens sont envoyés progressivement pour une meilleure UX
- **Thread Management**: Chaque conversation a un `threadId` unique qui maintient le contexte
- **Human-in-the-Loop**: Le système d'approbation permet à l'utilisateur de valider les actions avant exécution

---

## Sécurité

⚠️ **Important**: En production, ajoutez:
- Authentification (vérifier l'utilisateur)
- Rate limiting (limiter les requêtes)
- Validation des inputs (sanitize les messages)
- Timeout sur les streams SSE
- Gestion des threads par utilisateur
