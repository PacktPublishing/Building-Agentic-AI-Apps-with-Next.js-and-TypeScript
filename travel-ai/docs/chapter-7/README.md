# Chapter 7: Multi-Agent Orchestration with LangGraph

This chapter covers advanced multi-agent orchestration patterns using LangGraph, demonstrating how to build sophisticated AI systems where multiple specialized agents collaborate to solve complex tasks.

## Chapter Contents

1. **[Multi-Agent Patterns Overview](./01-multi-agent-patterns.md)**
   - Why multi-agent systems?
   - Supervisor vs Swarm patterns
   - Architecture diagrams
   - Key concepts

2. **[Implementing the Supervisor Pattern](./02-supervisor-pattern.md)**
   - Hierarchical multi-agent architecture
   - Creating specialized agents
   - State management
   - Parallel execution
   - Result synthesis

3. **[Implementing the Swarm Pattern](./03-swarm-pattern.md)**
   - Decentralized multi-agent architecture
   - Dynamic handoffs
   - Agent persistence
   - Conversational flows

4. **[Comparison and Best Practices](./04-comparison-and-best-practices.md)**
   - Performance benchmarks
   - Decision framework
   - Hybrid approaches
   - Common pitfalls

5. **[Frontend Integration](./05-frontend-integration.md)**
   - React hooks for orchestration
   - Agent visualization
   - Streaming integration
   - UI components

## Code Structure

```
travel-ai/
├── ai/orchestration/
│   ├── index.ts
│   ├── supervisor/
│   │   ├── index.ts
│   │   ├── travel-supervisor.ts    # Main supervisor graph
│   │   ├── flight-agent.ts         # Flight specialist
│   │   ├── hotel-agent.ts          # Hotel specialist
│   │   └── activity-agent.ts       # Activity specialist
│   └── swarm/
│       ├── index.ts
│       ├── travel-swarm.ts         # Main swarm configuration
│       ├── research-agent.ts       # Research & search agent
│       ├── booking-agent.ts        # Booking agent
│       └── planning-agent.ts       # Itinerary planning agent
├── app/
│   ├── api/orchestration/
│   │   ├── supervisor/route.ts     # Supervisor API
│   │   └── swarm/route.ts          # Swarm API
│   ├── dashboard/orchestration/
│   │   ├── page.tsx                # Pattern overview
│   │   ├── supervisor/page.tsx     # Supervisor demo
│   │   └── swarm/page.tsx          # Swarm demo
│   ├── components/
│   │   └── OrchestrationChat.tsx   # Reusable chat component
│   └── hooks/
│       └── useOrchestrationChat.ts # React hook for chat
└── scripts/
    ├── test-supervisor.ts          # Supervisor test script
    ├── test-swarm.ts               # Swarm test script
    └── compare-orchestration.ts    # Pattern comparison
```

## Quick Start

### Running the Demo

```bash
cd travel-ai
pnpm dev
```

Navigate to `/dashboard/orchestration` to explore both patterns.

### Testing the Patterns

```bash
# Test Supervisor pattern
pnpm tsx scripts/test-supervisor.ts

# Test Swarm pattern
pnpm tsx scripts/test-swarm.ts

# Compare both patterns
pnpm tsx scripts/compare-orchestration.ts
```

### API Usage

**Supervisor Pattern:**
```bash
curl -X POST http://localhost:3000/api/orchestration/supervisor \
  -H "Content-Type: application/json" \
  -d '{"message": "Find flights and hotels in Paris", "threadId": "test-1"}'
```

**Swarm Pattern:**
```bash
curl -X POST http://localhost:3000/api/orchestration/swarm \
  -H "Content-Type: application/json" \
  -d '{"message": "I want to travel to Tokyo", "threadId": "test-2"}'
```

## Key Learnings

After completing this chapter, you will understand:

1. **When to use each pattern** based on your application's requirements
2. **How to implement hierarchical coordination** with the Supervisor pattern
3. **How to build dynamic agent handoffs** with the Swarm pattern
4. **Best practices for state management** across multiple agents
5. **Frontend patterns for multi-agent UIs**

## Dependencies

This chapter uses:
- `@langchain/langgraph` - Core graph framework
- `@langchain/langgraph-swarm` - Swarm pattern utilities
- `@langchain/anthropic` - Claude models
- `@langchain/core` - Base abstractions

## Next Steps

- Explore the demo pages in the dashboard
- Modify agents to add new capabilities
- Experiment with hybrid approaches
- Build your own specialized agents
