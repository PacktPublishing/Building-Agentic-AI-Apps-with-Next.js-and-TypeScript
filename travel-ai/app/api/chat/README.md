# Chat API

Deux approches pour interagir avec l'agent de voyage : **invocation classique** et **streaming SSE**.

---

## 🔹 Route 1: POST `/api/chat/invoke`

**Invocation classique** - Attend la réponse complète avant de retourner.

### Quand l'utiliser ?
- Vous n'avez pas besoin de streaming en temps réel
- Vous voulez une réponse complète d'un coup
- Intégration simple dans des systèmes existants

### Request Body
```typescript
{
  message: string;      // Le message de l'utilisateur
  threadId?: string;    // ID du thread (optionnel)
  userId?: string;      // ID de l'utilisateur (optionnel)
}
```

### Response
```typescript
{
  threadId: string;     // ID du thread de conversation
  response: string;     // Réponse complète de l'agent
}
```

### Exemple
```bash
curl -X POST http://localhost:3000/api/chat/invoke \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello! I want to visit Paris"}'
```

**Réponse:**
```json
{
  "threadId": "thread-1234567890-abc123",
  "response": "That sounds wonderful! Paris is a beautiful city..."
}
```

---

## 🔹 Route 2: POST `/api/chat/stream`

**Server-Sent Events (SSE)** - Streaming en temps réel de la réponse.

### Quand l'utiliser ?
- Vous voulez une meilleure UX avec affichage progressif
- Application web interactive (chat UI)
- Feedback immédiat à l'utilisateur

### Request Body
```typescript
{
  message: string;      // Le message de l'utilisateur
  threadId?: string;    // ID du thread (optionnel)
  userId?: string;      // ID de l'utilisateur (optionnel)
}
```

### Response: Server-Sent Events

**Types d'événements:**

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

3. **complete** - Fin du stream
```json
{
  "type": "complete",
  "data": {
    "threadId": "thread-123",
    "response": "Full response text"
  }
}
```

4. **error** - Erreur
```json
{
  "type": "error",
  "data": {
    "error": "Error message",
    "details": "..."
  }
}
```

### Exemple
```bash
curl -X POST http://localhost:3000/api/chat/stream \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello! I want to visit Paris"}' \
  --no-buffer
```

**Stream SSE:**
```
data: {"type":"start","data":{"threadId":"thread-123"}}

data: {"type":"token","data":{"content":"That "}}

data: {"type":"token","data":{"content":"sounds "}}

data: {"type":"token","data":{"content":"wonderful!"}}

data: {"type":"complete","data":{"threadId":"thread-123","response":"That sounds wonderful!"}}
```

---

## 📊 Comparaison

| Caractéristique | `/api/chat/invoke` | `/api/chat/stream` |
|----------------|-------------------|-------------------|
| **Type** | Request/Response classique | Server-Sent Events |
| **Latence** | Attend la réponse complète | Streaming progressif |
| **UX** | Simple, direct | Meilleure (feedback immédiat) |
| **Complexité** | Faible | Moyenne |
| **Use case** | APIs, backends, scripts | UIs web, chat interfaces |

---

## 🔄 Continuer une conversation

Les deux routes supportent la continuation de conversation via `threadId` :

```bash
# Première requête
curl -X POST http://localhost:3000/api/chat/invoke \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello!"}'

# Réponse: {"threadId": "thread-123", "response": "..."}

# Requête suivante avec le même threadId
curl -X POST http://localhost:3000/api/chat/invoke \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Tell me more",
    "threadId": "thread-123"
  }'
```

---

## 💻 Utilisation en JavaScript

### Invoke classique
```javascript
const response = await fetch('/api/chat/invoke', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: 'Hello!',
    threadId: existingThreadId // optionnel
  })
});

const data = await response.json();
console.log(data.response);
```

### Stream SSE
```javascript
const response = await fetch('/api/chat/stream', {
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

## ⚙️ Configuration

### Variables d'environnement
```bash
# OpenAI
OPENAI_API_KEY=sk-...

# Amadeus MCP (optionnel)
AMADEUS_URL=https://mcp-amadeus.vercel.app/api/mcp
AMADEUS_BEARER_TOKEN=...

# Interrupt mode (pour tests HITL)
IS_INTERRUPT=false
```

---

## 🧪 Tests

```bash
# Test invoke
curl -X POST http://localhost:3000/api/chat/invoke \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello!"}'

# Test stream
curl -X POST http://localhost:3000/api/chat/stream \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello!"}' \
  --no-buffer
```

---

## 🎯 Recommandations

- **Pour des APIs backend** → Utilisez `/api/chat/invoke`
- **Pour des interfaces web** → Utilisez `/api/chat/stream`
- **Pour des scripts/CLI** → Utilisez `/api/chat/invoke`
- **Pour un chat UI** → Utilisez `/api/chat/stream`

---

## 🔧 Architecture

```
User → POST /api/chat/invoke → Agent → Response complète
User → POST /api/chat/stream → Agent → SSE Stream → Tokens progressifs
```

L'agent gère automatiquement :
- La sélection des outils appropriés
- L'exécution des outils
- L'agrégation des résultats
- La génération de la réponse finale
