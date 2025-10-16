# Exemples d'utilisation des routes Chat API

## Démarrer le serveur

```bash
pnpm dev
```

Le serveur démarre sur `http://localhost:3000`

---

## 1. Démarrer une conversation simple

```bash
curl -X POST http://localhost:3000/api/chat/start \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hello! I want to plan a trip to Paris."
  }'
```

**Réponse attendue:**
```json
{
  "threadId": "thread-1234567890-abc123",
  "requiresApproval": false,
  "response": "I'd be happy to help you plan your trip to Paris! ..."
}
```

---

## 2. Démarrer avec une requête nécessitant des outils

```bash
curl -X POST http://localhost:3000/api/chat/start \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Search for good activities in Paris"
  }'
```

**Réponse attendue:**
```json
{
  "threadId": "thread-1234567890-xyz789",
  "requiresApproval": true,
  "toolCalls": [
    {
      "id": "call-123",
      "name": "search_activities",
      "args": {
        "location": "Paris",
        "type": "activities"
      }
    }
  ]
}
```

---

## 3. Continuer après approbation (avec SSE)

```bash
curl -X POST http://localhost:3000/api/chat/continue \
  -H "Content-Type: application/json" \
  -d '{
    "threadId": "thread-1234567890-xyz789",
    "approved": true
  }' \
  --no-buffer
```

**Stream SSE attendu:**
```
data: {"type":"start","data":{"threadId":"thread-1234567890-xyz789"}}

data: {"type":"token","data":{"content":"Executing "}}

data: {"type":"token","data":{"content":"approved "}}

data: {"type":"token","data":{"content":"actions..."}}

data: {"type":"toolCall","data":{"name":"search_activities","args":{"location":"Paris"}}}

data: {"type":"token","data":{"content":"Here "}}

data: {"type":"token","data":{"content":"are "}}

data: {"type":"complete","data":{"response":"Here are some activities...","requiresApproval":false}}
```

---

## 4. Continuer avec un nouveau message

```bash
curl -X POST http://localhost:3000/api/chat/continue \
  -H "Content-Type: application/json" \
  -d '{
    "threadId": "thread-1234567890-abc123",
    "approved": false,
    "message": "Tell me more about the Eiffel Tower"
  }' \
  --no-buffer
```

---

## 5. Rejeter une action

```bash
curl -X POST http://localhost:3000/api/chat/continue \
  -H "Content-Type: application/json" \
  -d '{
    "threadId": "thread-1234567890-xyz789",
    "approved": false
  }' \
  --no-buffer
```

**Réponse:**
```
data: {"type":"complete","data":{"response":"Action cancelled by user.","requiresApproval":false}}
```

---

## 6. Test avec le script Node.js

```bash
# Démarrer le serveur dans un terminal
pnpm dev

# Dans un autre terminal, lancer le script de test
pnpm tsx scripts/test-chat-api.ts
```

---

## 7. Lire le stream SSE en JavaScript

```javascript
const eventSource = new EventSource('/api/chat/continue?' + new URLSearchParams({
  threadId: 'thread-123',
  approved: 'true'
}));

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log(data.type, data.data);
  
  if (data.type === 'complete') {
    eventSource.close();
  }
};

eventSource.onerror = (error) => {
  console.error('SSE Error:', error);
  eventSource.close();
};
```

**Note:** EventSource ne supporte que GET. Pour POST avec SSE, utilisez `fetch()` comme dans l'exemple du README.

---

## 8. Test avec Vitest

```bash
# Démarrer le serveur
pnpm dev

# Dans un autre terminal
TEST_BASE_URL=http://localhost:3000 pnpm test src/app/api/chat/chat.test.ts
```

---

## Erreurs communes

### 400 - Message manquant
```bash
curl -X POST http://localhost:3000/api/chat/start \
  -H "Content-Type: application/json" \
  -d '{}'
```
```json
{"error": "Message is required and must be a string"}
```

### 400 - Thread ID manquant
```bash
curl -X POST http://localhost:3000/api/chat/continue \
  -H "Content-Type: application/json" \
  -d '{"approved": true}'
```
```json
{"error": "Thread ID is required"}
```

### 500 - Erreur serveur
Vérifiez que:
- Le fichier `.env` est configuré avec les bonnes clés API
- Le serveur Amadeus MCP est accessible
- OpenAI API key est valide

---

## Variables d'environnement requises

```bash
# OpenAI
OPENAI_API_KEY=sk-...

# Amadeus MCP
AMADEUS_URL=https://mcp-amadeus.vercel.app/api/mcp
AMADEUS_BEARER_TOKEN=...

# Supabase (pour la persistance)
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
```

---

## Tips

1. **Streaming en temps réel**: Utilisez `--no-buffer` avec curl pour voir le stream en temps réel
2. **Debug**: Ajoutez `console.log` dans les routes pour voir les événements
3. **Thread ID**: Sauvegardez le threadId pour continuer la conversation
4. **Timeout**: Les streams SSE peuvent timeout, implémentez un heartbeat si nécessaire
