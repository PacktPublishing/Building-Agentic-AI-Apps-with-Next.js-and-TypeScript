# Comparing Orchestration Patterns

## Overview

This section provides a detailed comparison between the Supervisor and Swarm patterns, helping you choose the right approach for your multi-agent application.

## Side-by-Side Comparison

### Architecture Comparison

| Aspect | Supervisor | Swarm |
|--------|------------|-------|
| **Structure** | Hierarchical (hub-and-spoke) | Decentralized (peer-to-peer) |
| **Coordinator** | Central supervisor | None (agents self-coordinate) |
| **Communication** | Through supervisor | Direct handoffs |
| **Routing** | Supervisor decides | Agents decide |
| **Response Path** | Agent → Supervisor → User | Agent → User |

### Performance Comparison

| Metric | Supervisor | Swarm |
|--------|------------|-------|
| **Token Usage** | Higher (coordination overhead) | Lower (direct responses) |
| **Latency - Simple** | Higher (extra routing) | Lower |
| **Latency - Complex** | Lower (parallel execution) | Higher (sequential) |
| **Scalability** | Better (parallel) | Linear |

### Capability Comparison

| Feature | Supervisor | Swarm |
|---------|------------|-------|
| **Parallel Execution** | Yes | No |
| **Result Synthesis** | Built-in | Manual |
| **Third-party Agents** | Compatible | Requires integration |
| **Multi-turn Memory** | Shared via supervisor | Per-agent continuity |
| **Handoff Control** | Explicit (supervisor) | Implicit (tools) |

## Benchmarking Results

Based on testing with the Travel AI application:

```
┌─────────────────────────────────────────────────────────────┐
│                    BENCHMARK RESULTS                         │
├─────────────────────────────────────────────────────────────┤
│ Query Type          │ Supervisor │ Swarm    │ Winner       │
├─────────────────────┼────────────┼──────────┼──────────────┤
│ Single domain       │ 4.2s       │ 2.8s     │ Swarm        │
│ (flights only)      │ ~1200 tok  │ ~800 tok │              │
├─────────────────────┼────────────┼──────────┼──────────────┤
│ Multi-domain        │ 6.5s       │ 8.2s     │ Supervisor   │
│ (flights+hotels)    │ ~2400 tok  │ ~2100 tok│              │
├─────────────────────┼────────────┼──────────┼──────────────┤
│ Complex trip        │ 8.1s       │ 12.4s    │ Supervisor   │
│ (all domains)       │ ~3200 tok  │ ~2800 tok│              │
├─────────────────────┼────────────┼──────────┼──────────────┤
│ Multi-turn convo    │ 3.5s/turn  │ 2.1s/turn│ Swarm        │
│ (5 turns)           │ ~5000 tok  │ ~3500 tok│              │
└─────────────────────┴────────────┴──────────┴──────────────┘
```

### Key Insights

1. **Swarm wins for single-domain queries** - Less overhead when only one agent is needed
2. **Supervisor wins for complex queries** - Parallel execution benefits
3. **Swarm wins for multi-turn conversations** - Lower per-turn token usage
4. **Supervisor synthesizes better** - Unified responses from multiple sources

## Decision Framework

### Use Supervisor When:

```
┌─────────────────────────────────────────────────────────────┐
│ ✓ Multiple agents needed simultaneously                     │
│ ✓ Results need synthesis/aggregation                        │
│ ✓ Parallel execution improves performance                   │
│ ✓ Integrating third-party agents                           │
│ ✓ Complex coordination logic needed                         │
│ ✓ Centralized control is important                         │
└─────────────────────────────────────────────────────────────┘
```

**Example Use Cases:**
- Trip planning (flights + hotels + activities simultaneously)
- Research tasks (multiple sources in parallel)
- Complex workflows with dependencies

### Use Swarm When:

```
┌─────────────────────────────────────────────────────────────┐
│ ✓ Natural conversational flow desired                       │
│ ✓ Sequential agent interactions                             │
│ ✓ Token efficiency is priority                              │
│ ✓ Agents have clear domain boundaries                       │
│ ✓ Multi-turn conversations expected                         │
│ ✓ Simpler setup preferred                                   │
└─────────────────────────────────────────────────────────────┘
```

**Example Use Cases:**
- Customer support with escalation
- Sales funnel (research → demo → close)
- Step-by-step wizards

## Hybrid Approaches

You can combine both patterns for optimal results:

### Pattern 1: Swarm with Supervisor Nodes

```typescript
// A swarm agent that internally uses supervisor for complex tasks
const complexTaskAgent = createReactAgent({
    llm: model,
    tools: [
        ...simpleTools,
        new DynamicStructuredTool({
            name: "complex_search",
            description: "Search across multiple domains",
            schema: z.object({ query: z.string() }),
            func: async ({ query }) => {
                // Internally use supervisor for parallel execution
                const result = await invokeSupervisor(query, threadId);
                return result.response;
            },
        }),
        handoffTools,
    ],
});
```

### Pattern 2: Supervisor with Swarm Agents

```typescript
// Supervisor that delegates to mini-swarms
const supervisorNode = async (state) => {
    // Route to different swarm clusters based on domain
    if (needsBookingFlow) {
        return { pendingAgents: ["BookingSwarm"] };
    }
    // ...
};
```

## Implementation Checklist

### Supervisor Pattern

```
□ Define state schema with agent outputs
□ Create specialized agent nodes
□ Implement supervisor routing logic
□ Implement synthesis node
□ Configure parallel execution edges
□ Add memory/checkpointing
□ Create streaming support
□ Build API route
□ Add error handling
```

### Swarm Pattern

```
□ Create agents with unique names
□ Add handoff tools to each agent
□ Define default active agent
□ Configure createSwarm
□ Add memory/checkpointing
□ Track active agent in responses
□ Handle multi-turn state
□ Create streaming support
□ Build API route
```

## Common Pitfalls

### Supervisor Pattern

1. **Over-delegation**: Calling agents for simple tasks
   - Solution: Allow supervisor to respond directly

2. **Token explosion**: Large synthesis prompts
   - Solution: Summarize agent outputs before synthesis

3. **Latency**: Waiting for all agents
   - Solution: Implement timeouts and partial responses

### Swarm Pattern

1. **Lost context**: Information lost during handoffs
   - Solution: Pass context explicitly in handoff

2. **Circular handoffs**: Agents ping-ponging
   - Solution: Clear handoff criteria in prompts

3. **Agent confusion**: Wrong agent stays active
   - Solution: Explicit state tracking after each turn

## Best Practices

### General

1. **Clear Agent Responsibilities**
   ```typescript
   // Good: Specific responsibility
   const flightAgent = { 
       name: "FlightAgent",
       description: "Searches and compares flight options"
   };
   
   // Bad: Vague responsibility
   const travelAgent = {
       name: "TravelAgent", 
       description: "Helps with travel"
   };
   ```

2. **Consistent Naming**
   ```typescript
   // Ensure handoff tool name matches agent name
   createHandoffTool({ agentName: "BookingAgent" }); // ✓
   // Agent must be named exactly "BookingAgent"
   ```

3. **Error Handling**
   ```typescript
   try {
       const result = await agent.invoke(message);
   } catch (error) {
       return {
           agentOutputs: { 
               [agentName]: `Agent unavailable: ${error.message}` 
           },
       };
   }
   ```

4. **Timeout Management**
   ```typescript
   const result = await Promise.race([
       agent.invoke(message),
       new Promise((_, reject) => 
           setTimeout(() => reject(new Error("Timeout")), 30000)
       ),
   ]);
   ```

### Prompt Engineering

```typescript
// Include clear handoff instructions
const AGENT_PROMPT = `You are the Research Agent.

RESPONSIBILITIES:
- Search for travel options
- Provide recommendations

HANDOFF TRIGGERS:
- User says "book" or "reserve" → transfer to BookingAgent
- User asks for "itinerary" or "plan" → transfer to PlanningAgent

NEVER handoff for:
- Follow-up questions about search results
- Clarification requests
`;
```

## Summary

Both patterns are powerful tools for multi-agent orchestration:

- **Supervisor**: Best for complex, parallel, coordinated tasks
- **Swarm**: Best for natural, efficient, conversational flows

Choose based on your specific requirements, and don't hesitate to combine patterns for optimal results.

## Code References

- Supervisor implementation: `ai/orchestration/supervisor/`
- Swarm implementation: `ai/orchestration/swarm/`
- API routes: `app/api/orchestration/`
- Demo pages: `app/dashboard/orchestration/`
- Test scripts: `scripts/test-supervisor.ts`, `scripts/test-swarm.ts`
