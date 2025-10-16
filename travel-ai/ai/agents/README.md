# ReAct Agent with Human-in-the-Loop

This directory contains a ReAct (Reasoning and Acting) agent implementation using LangGraph with Human-in-the-Loop capabilities.

## Architecture

### Singleton Pattern
The agent is implemented as a singleton to ensure only one instance exists throughout the application lifecycle.

```typescript
import agent from './agent';

// Initialize the agent (required before first use)
await agent.initialize();

// Use the agent
const response = await agent.invoke("Hello!");
```

### Key Features

1. **ReAct Agent**: Combines reasoning and acting in a loop
2. **Human-in-the-Loop (HITL)**: Interrupts execution before tool calls for human approval
3. **Memory Management**: Maintains conversation context using `MemorySaver`
4. **MCP Integration**: Connects to Model Context Protocol servers for tools
5. **Streaming Support**: Real-time response streaming

## Configuration

### Environment Variables

Create a `.env` file in the project root:

```env
OPENAI_API_KEY=your_openai_api_key_here
MODEL_NAME=gpt-4o-mini
AMADEUS_BEARER_TOKEN=your_amadeus_token_here
AMADEUS_URL=https://your-amadeus-mcp-server.com/mcp
```

### MCP Servers

The agent can connect to multiple MCP servers for different tools:

```typescript
{
  weather: {
    transport: "http",
    url: config.amadeus_url,
    headers: {
      "Authorization": `Bearer ${config.amadeus_bearer_token}`
    }
  }
}
```

## Usage

### Basic Invocation

```typescript
import agent from './ai/agents/agent';

// Initialize once
await agent.initialize();

// Simple query
const response = await agent.invoke(
  "What's the weather like?",
  "thread-id-1"
);
console.log(response);
```

### Human-in-the-Loop Workflow

```typescript
// Step 1: Invoke with approval check
const result = await agent.invokeWithApproval(
  "Search for flights from Paris to New York",
  "thread-id-2"
);

if (result.needsApproval) {
  // Step 2: Show tool calls to user
  console.log("Tool calls:", result.toolCalls);
  
  // Step 3: User approves (in your UI)
  // ...
  
  // Step 4: Continue execution
  const finalResponse = await agent.approveAndContinue("thread-id-2");
  console.log(finalResponse);
} else {
  // Direct response, no tools needed
  console.log(result.response);
}
```

### Streaming Responses

```typescript
for await (const chunk of agent.stream(
  "Explain ReAct agents",
  "thread-id-3"
)) {
  process.stdout.write(chunk);
}
```

### Thread State Management

```typescript
// Get current state of a conversation thread
const state = await agent.getState("thread-id-1");
console.log(state.values.messages);
```

## Testing

### Prerequisites

Ensure you have a `.env` file with valid API keys.

### Run Tests

```bash
# Run all tests
pnpm test

# Run agent tests specifically (with verbose output)
pnpm test:agent

# Watch mode for agent tests
pnpm test:agent:watch

# Run with UI
pnpm test:ui

# Run all tests once (no watch mode)
pnpm test:run
```

### Verbose Mode

The tests include **verbose logging** for educational purposes. This shows the complete Human-in-the-Loop workflow step by step:

```
🚀 INITIALIZING REACT AGENT WITH HUMAN-IN-THE-LOOP
✅ Agent initialized successfully
🔧 Tools loaded: 8

📝 TEST: Human-in-the-Loop - Complete Workflow
──────────────────────────────────────────────────────────────────────
STEP 1: User request
👤 User: Search for information about flights from Paris to New York
🤖 Agent: Analyzing request...

STEP 2: Interruption for approval
⏸️  Execution paused - Human approval required
📋 Tool calls waiting for approval:
   1. Tool: search_flights
      Args: { "origin": "CDG", "destination": "JFK" }

STEP 3: Human review
👨‍💼 Human: Reviewing tool calls...
✅ Human: Approval granted

STEP 4: Resume execution
▶️  Continuing agent execution...

STEP 5: Final response
🎯 Agent final response: Here are the available flights...
✅ Test passed: Complete HITL workflow executed
```

To disable verbose mode, edit `agent.test.ts` and set `VERBOSE = false`.

### Test Structure

The test suite includes:

1. **Singleton Pattern Tests**: Verify single instance behavior
2. **Basic Invocation Tests**: Simple queries and context management
3. **HITL Tests**: Approval workflow and state management
4. **Streaming Tests**: Real-time response chunks
5. **Tool Management Tests**: MCP tool loading
6. **Educational Demo**: Complete HITL workflow demonstration

### Example Test Output

```
🎓 DEMONSTRATION: Human-in-the-Loop Workflow
============================================================

👤 User: Find me information about available flights

🤖 Agent: Analyzing query...

⏸️  INTERRUPTION - Approval required
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 Tool calls detected:

  1. Tool: search_flights
     Arguments: {
       "origin": "Paris",
       "destination": "New York"
     }
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

👨‍💼 Human: Reviewing tool calls...
✅ Human: Approval granted

▶️  Resuming execution...

🎯 Agent's final response:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Here are the available flights from Paris to New York...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✨ End of demonstration
============================================================
```

## API Reference

### `agent.initialize()`
Initializes the MCP client and loads tools. Must be called before using the agent.

**Returns**: `Promise<void>`

### `agent.invoke(message, threadId?)`
Sends a message to the agent and waits for the complete response.

**Parameters**:
- `message` (string): User message
- `threadId` (string, optional): Thread identifier for conversation context

**Returns**: `Promise<string>`

### `agent.invokeWithApproval(message, threadId?)`
Invokes the agent with HITL support. Execution pauses before tool calls.

**Parameters**:
- `message` (string): User message
- `threadId` (string, optional): Thread identifier

**Returns**: `Promise<{ needsApproval: boolean, toolCalls?: any[], response?: string, threadId: string }>`

### `agent.approveAndContinue(threadId?)`
Continues execution after human approval of tool calls.

**Parameters**:
- `threadId` (string, optional): Thread identifier

**Returns**: `Promise<string>`

### `agent.stream(message, threadId?)`
Streams the agent's response in real-time.

**Parameters**:
- `message` (string): User message
- `threadId` (string, optional): Thread identifier

**Returns**: `AsyncGenerator<string>`

### `agent.getState(threadId?)`
Retrieves the current state of a conversation thread.

**Parameters**:
- `threadId` (string, optional): Thread identifier

**Returns**: `Promise<StateSnapshot>`

### `agent.getTools()`
Returns the list of loaded MCP tools.

**Returns**: `DynamicStructuredTool[]`

## Dependencies

- `@langchain/langgraph`: Graph-based agent orchestration
- `@langchain/openai`: OpenAI LLM integration
- `@langchain/mcp-adapters`: Model Context Protocol adapters
- `@langchain/core`: Core LangChain utilities

## Best Practices

1. **Always initialize**: Call `agent.initialize()` once at application startup
2. **Use thread IDs**: Maintain conversation context with consistent thread IDs
3. **Handle approval**: Implement proper UI for HITL approval workflow
4. **Error handling**: Wrap agent calls in try-catch blocks
5. **Environment variables**: Never commit API keys, use `.env` files

## Troubleshooting

### "Agent not initialized" error
Make sure to call `await agent.initialize()` before using the agent.

### "OPENAI_API_KEY not found" error
Create a `.env` file with your OpenAI API key.

### Tests failing
Ensure your `.env` file contains valid API keys for integration tests.

### No tools loaded
Check your MCP server configuration and ensure servers are accessible.
