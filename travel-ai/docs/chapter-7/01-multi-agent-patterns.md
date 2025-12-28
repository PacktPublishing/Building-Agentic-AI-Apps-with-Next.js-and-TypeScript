# Chapter 7: Multi-Agent Orchestration with LangGraph

## Introduction

As AI applications grow in complexity, single-agent architectures often become insufficient. Multi-agent systems allow you to decompose complex tasks into specialized sub-tasks, each handled by an agent optimized for that specific domain. This chapter explores how to build sophisticated multi-agent systems using LangGraph's orchestration capabilities.

## Why Multi-Agent Systems?

### The Limitations of Single Agents

While a single agent with access to many tools can handle various tasks, it faces several challenges:

1. **Context Overload**: As the number of tools grows, the agent's prompt becomes bloated with tool descriptions, reducing effectiveness.

2. **Specialization Trade-offs**: A generalist agent may not perform as well as specialized agents on domain-specific tasks.

3. **Scalability**: Adding new capabilities requires modifying a monolithic agent, increasing complexity and risk.

4. **Maintainability**: Debugging and testing become harder as the agent grows.

### Benefits of Multi-Agent Architecture

Multi-agent systems address these challenges by:

- **Separation of Concerns**: Each agent focuses on a specific domain
- **Modularity**: Agents can be developed, tested, and deployed independently
- **Scalability**: New agents can be added without modifying existing ones
- **Specialization**: Each agent can be optimized for its specific task
- **Parallel Execution**: Multiple agents can work simultaneously

## Multi-Agent Patterns Overview

LangGraph provides two primary patterns for multi-agent orchestration:

### 1. Supervisor Pattern (Hierarchical)

```
┌─────────────────────────────────────────┐
│                  User                    │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│              Supervisor                  │
│   (Central Coordinator & Router)         │
└──────┬──────────┬──────────┬────────────┘
       │          │          │
       ▼          ▼          ▼
┌──────────┐ ┌──────────┐ ┌──────────┐
│  Agent A │ │  Agent B │ │  Agent C │
│(Flights) │ │ (Hotels) │ │(Activities)│
└──────────┘ └──────────┘ └──────────┘
```

**Characteristics:**
- Central supervisor receives all requests
- Delegates to specialized agents based on task analysis
- Synthesizes responses before returning to user
- Better control and coordination
- Higher token usage due to coordination overhead

### 2. Swarm Pattern (Decentralized)

```
┌─────────────────────────────────────────┐
│                  User                    │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌──────────┐ ◄──► ┌──────────┐ ◄──► ┌──────────┐
│ Research │      │ Booking  │      │ Planning │
│  Agent   │      │  Agent   │      │  Agent   │
└──────────┘      └──────────┘      └──────────┘
     │                 │                  │
     └─────────────────┴──────────────────┘
              Dynamic Handoffs
```

**Characteristics:**
- Agents hand off control to each other dynamically
- Active agent responds directly to user
- System remembers which agent was last active
- More token-efficient
- Natural conversational flow

## Choosing the Right Pattern

| Criteria | Supervisor | Swarm |
|----------|------------|-------|
| Control | Centralized | Decentralized |
| Token Usage | Higher | Lower |
| Parallel Execution | Yes | No (sequential) |
| Third-party Agents | Compatible | Requires knowledge |
| Conversation Flow | Structured | Natural |
| Complexity | Higher setup | Simpler setup |
| Best For | Complex coordination | Conversational workflows |

### When to Use Supervisor Pattern

- Complex tasks requiring multiple agents simultaneously
- Need for result synthesis and aggregation
- Integration with third-party agents
- Strict control over agent coordination
- Parallel execution is beneficial

### When to Use Swarm Pattern

- Conversational, multi-turn interactions
- Agents have clear handoff boundaries
- Token efficiency is important
- Natural flow between specialized domains
- Simpler coordination requirements

## Architecture Diagrams

### Supervisor Architecture in Travel AI

```
                    ┌─────────────┐
                    │    User     │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │  Supervisor │
                    │   Agent     │
                    └──────┬──────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
    ┌─────▼─────┐   ┌─────▼─────┐   ┌─────▼─────┐
    │  Flight   │   │   Hotel   │   │ Activity  │
    │   Agent   │   │   Agent   │   │   Agent   │
    └─────┬─────┘   └─────┬─────┘   └─────┬─────┘
          │               │               │
          │    ┌──────────┴───────────┐   │
          └────►     Synthesizer      ◄───┘
               └──────────┬───────────┘
                          │
                   ┌──────▼──────┐
                   │  Response   │
                   └─────────────┘
```

### Swarm Architecture in Travel AI

```
                    ┌─────────────┐
                    │    User     │
                    └──────┬──────┘
                           │
              ┌────────────▼────────────┐
              │                         │
              │    ┌─────────────┐      │
              │    │  Research   │◄─────┤ Entry Point
              │    │   Agent     │      │
              │    └──────┬──────┘      │
              │           │             │
              │    ┌──────▼──────┐      │
              │    │   Booking   │      │
              │    │   Agent     │      │
              │    └──────┬──────┘      │
              │           │             │
              │    ┌──────▼──────┐      │
              │    │  Planning   │      │
              │    │   Agent     │      │
              │    └─────────────┘      │
              │                         │
              │    Handoffs between     │
              │    agents as needed     │
              └─────────────────────────┘
```

## Key Concepts

### State Management

Both patterns use LangGraph's state management with annotations:

```typescript
import { Annotation } from "@langchain/langgraph";

const SwarmState = Annotation.Root({
  messages: MessagesAnnotation,
  activeAgent: Annotation<string>(),
});
```

### Handoff Mechanism

Handoffs in the swarm pattern use the `Command` primitive:

```typescript
import { Command } from "@langchain/langgraph";

// When a handoff is needed
return new Command({
  goto: "BookingAgent",
  graph: Command.PARENT,
  update: {
    messages: [...messages, toolMessage],
    activeAgent: "BookingAgent",
  },
});
```

### Memory and Persistence

Both patterns support memory through checkpointers:

```typescript
import { MemorySaver } from "@langchain/langgraph";

const memory = new MemorySaver();
const graph = workflow.compile({ checkpointer: memory });
```

This enables:
- Conversation persistence across turns
- Agent state tracking
- Recovery from interruptions

## Summary

Multi-agent orchestration is a powerful paradigm for building complex AI applications. LangGraph provides two complementary patterns:

1. **Supervisor Pattern**: For hierarchical control and parallel execution
2. **Swarm Pattern**: For natural, conversational multi-agent flows

The next sections will dive deep into implementing each pattern in our Travel AI application.
