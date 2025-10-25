# Chat API

Two approaches to interact with the travel agent: **classic invocation** and **SSE streaming**.

---

## 🔹 Route 1: POST `/api/chat/invoke`

**Classic invocation** — waits for the full response before returning.

### When to use it?
- You don’t need real-time streaming
- You want a complete response at once
- Simple integration into existing systems

### Request Body
```typescript
{
  message: string;      // User's message
  threadId?: string;    // Thread ID (optional)
  userId?: string;      // User ID (optional)
}
```

### Response
```typescript
{
  threadId: string;     // Conversation thread ID
  response: string;     // Agent's full response
}
```

### Example
```bash
curl -X POST http://localhost:3000/api/chat/invoke \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello! I want to visit Paris"}'
```

**Response:**
```json
{
  "threadId": "thread-1234567890-abc123",
  "response": "That sounds wonderful! Paris is a beautiful city..."
}
```

---

## 🔹 Route 2: POST `/api/chat/stream`

**Server-Sent Events (SSE)** — real-time streaming of the response.

### When to use it?
- You want better UX with progressive display
- Interactive web application (chat UI)
- Immediate feedback to the user

### Request Body
```typescript
{
  message: string;      // User's message
  threadId?: string;    // Thread ID (optional)
  userId?: string;      // User ID (optional)
}
```

### Response: Server-Sent Events

**Event types:**

1. **start** — Start of stream
```json
{
  "type": "start",
  "data": { "threadId": "thread-123" }
}
```

2. **token** — Streamed text token
```json
{
  "type": "token",
  "data": { "content": "Hello " }
}
```

3. **complete** — End of stream
```json
{
  "type": "complete",
  "data": {
    "threadId": "thread-123",
    "response": "Full response text"
  }
}
```

4. **error** — Error
```json
{
  "type": "error",
  "data": {
    "error": "Error message",
    "details": "..."
  }
}
```

### Example
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

## 📊 Comparison

| Feature | `/api/chat/invoke` | `/api/chat/stream` |
|----------------|-------------------|-------------------|
| **Type** | Classic Request/Response | Server-Sent Events |
| **Latency** | Waits for full response | Progressive streaming |
| **UX** | Simple, direct | Better (immediate feedback) |
| **Complexity** | Low | Medium |
| **Use case** | APIs, backends, scripts | Web UIs, chat interfaces |

---

## 🔄 Continue a conversation

Both routes support conversation continuation via `threadId`:

```bash
# Première requête
curl -X POST http://localhost:3000/api/chat/invoke \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello!"}'

# Response: {"threadId": "thread-123", "response": "..."}

# Requête suivante avec le même threadId
curl -X POST http://localhost:3000/api/chat/invoke \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Tell me more",
    "threadId": "thread-123"
  }'
```

---

## 💻 JavaScript Usage

### Classic invoke
```javascript
const response = await fetch('/api/chat/invoke', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: 'Hello!',
    threadId: existingThreadId // optional
  })
});

const data = await response.json();
console.log(data.response);
```

### SSE stream
```javascript
const response = await fetch('/api/chat/stream', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: 'Hello!',
    threadId: existingThreadId // optional
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

### Environment variables
```bash
# OpenAI
OPENAI_API_KEY=sk-...

# Amadeus MCP (optionnel)
AMADEUS_URL=https://mcp-amadeus.vercel.app/api/mcp
AMADEUS_BEARER_TOKEN=...

# Interrupt mode (for HITL tests)
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

## 🎯 Recommendations

- **For backend APIs** → Use `/api/chat/invoke`
- **For web interfaces** → Use `/api/chat/stream`
- **For scripts/CLI** → Use `/api/chat/invoke`
- **For a chat UI** → Use `/api/chat/stream`

---

## 🔧 Architecture

```
User → POST /api/chat/invoke → Agent → Response complète
User → POST /api/chat/stream → Agent → SSE Stream → Tokens progressifs
```

The agent automatically handles:
- Appropriate tool selection
- Tool execution
- Result aggregation
- Final response generation

