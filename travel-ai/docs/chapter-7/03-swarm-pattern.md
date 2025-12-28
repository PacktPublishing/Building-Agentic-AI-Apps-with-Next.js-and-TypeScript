# Implementing the Swarm Pattern

## Overview

The Swarm pattern implements a decentralized multi-agent system where agents dynamically hand off control to each other. Unlike the Supervisor pattern, there's no central coordinator - agents directly respond to users and transfer control when their expertise is needed.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      Swarm Graph                         │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  START ──► Router ──┬──► ResearchAgent ──┐              │
│                     ├──► BookingAgent ───┼──► END       │
│                     └──► PlanningAgent ──┘              │
│                                                          │
│            ◄─── Dynamic Handoffs ───►                   │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## Key Concepts

### Dynamic Handoffs

Agents use `createHandoffTool` to transfer control:

```typescript
import { createHandoffTool } from "@langchain/langgraph-swarm";

const handoffToBooking = createHandoffTool({
    agentName: "BookingAgent",
    description: "Transfer to BookingAgent for reservations",
});
```

When invoked, this tool:
1. Creates a `Command` to switch to the target agent
2. Updates the `activeAgent` in state
3. Passes conversation context to the new agent

### State Management

The swarm uses a simple state schema:

```typescript
const SwarmState = Annotation.Root({
    messages: MessagesAnnotation,  // Conversation history
    activeAgent: Annotation<string>(), // Currently active agent
});
```

### Agent Persistence

The swarm remembers which agent was last active across conversation turns. This enables natural multi-turn conversations without re-routing.

## Implementation

### Step 1: Create Research Agent (Entry Point)

The Research Agent is the default entry point for new conversations:

```typescript
// ai/orchestration/swarm/research-agent.ts

import { ChatAnthropic } from "@langchain/anthropic";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { createHandoffTool } from "@langchain/langgraph-swarm";
import { getMcpTools } from "../../tools/mcp-client";

const RESEARCH_AGENT_PROMPT = `You are the Research Agent, the primary contact for travelers.

Your role:
1. Understand traveler needs
2. Search for flights, hotels, and activities
3. Hand off when appropriate:
   - "Book this" → BookingAgent
   - "Create itinerary" → PlanningAgent

Use your search tools to find options.`;

export async function createResearchAgent() {
    const model = new ChatAnthropic({
        model: "claude-sonnet-4-20250514",
        temperature: 0.4,
    });

    // Get all MCP search tools
    const mcpTools = await getMcpTools();

    // Create handoff tools
    const handoffToBooking = createHandoffTool({
        agentName: "BookingAgent",
        description: "Transfer for reservations and bookings",
    });

    const handoffToPlanning = createHandoffTool({
        agentName: "PlanningAgent",
        description: "Transfer for itinerary creation",
    });

    const agent = createReactAgent({
        llm: model,
        tools: [...mcpTools, handoffToBooking, handoffToPlanning],
        messageModifier: RESEARCH_AGENT_PROMPT,
        name: "ResearchAgent", // Important: name must match handoff references
    });

    return agent;
}
```

### Step 2: Create Booking Agent

Handles reservations after research is complete:

```typescript
// ai/orchestration/swarm/booking-agent.ts

const BOOKING_AGENT_PROMPT = `You are the Booking Agent.

Your role:
1. Confirm booking details with traveler
2. Process reservations
3. Provide confirmation details

Hand off scenarios:
- "More options" → ResearchAgent
- "Plan my trip" → PlanningAgent`;

export async function createBookingAgent() {
    const model = new ChatAnthropic({
        model: "claude-sonnet-4-20250514",
        temperature: 0.2, // Lower for precision
    });

    // Handoff tools
    const handoffToResearch = createHandoffTool({
        agentName: "ResearchAgent",
        description: "Transfer for more search options",
    });

    const handoffToPlanning = createHandoffTool({
        agentName: "PlanningAgent",
        description: "Transfer for itinerary organization",
    });

    // Booking simulation tools
    const confirmBookingTool = new DynamicStructuredTool({
        name: "confirm_booking",
        description: "Confirm and process a booking",
        schema: z.object({
            type: z.enum(["flight", "hotel", "activity"]),
            itemId: z.string(),
            guestDetails: z.object({
                name: z.string(),
                email: z.string(),
            }),
        }),
        func: async (input) => {
            const confirmationId = `BK${Date.now().toString(36).toUpperCase()}`;
            return JSON.stringify({
                success: true,
                confirmationId,
                message: `Booking confirmed! ID: ${confirmationId}`,
            });
        },
    });

    const agent = createReactAgent({
        llm: model,
        tools: [handoffToResearch, handoffToPlanning, confirmBookingTool],
        messageModifier: BOOKING_AGENT_PROMPT,
        name: "BookingAgent",
    });

    return agent;
}
```

### Step 3: Create Planning Agent

Creates itineraries and organizes trips:

```typescript
// ai/orchestration/swarm/planning-agent.ts

const PLANNING_AGENT_PROMPT = `You are the Planning Agent.

Your role:
1. Create day-by-day itineraries
2. Optimize schedules
3. Suggest timing and logistics

Hand off scenarios:
- "Find flights/hotels" → ResearchAgent
- "Book this" → BookingAgent`;

export async function createPlanningAgent() {
    const model = new ChatAnthropic({
        model: "claude-sonnet-4-20250514",
        temperature: 0.5, // Balanced for creativity
    });

    // Handoff tools
    const handoffToResearch = createHandoffTool({
        agentName: "ResearchAgent",
        description: "Transfer for searches",
    });

    const handoffToBooking = createHandoffTool({
        agentName: "BookingAgent",
        description: "Transfer for bookings",
    });

    // Planning tools
    const createItineraryTool = new DynamicStructuredTool({
        name: "create_itinerary",
        description: "Create a structured itinerary",
        schema: z.object({
            tripName: z.string(),
            destination: z.string(),
            startDate: z.string(),
            endDate: z.string(),
            days: z.array(z.object({
                dayNumber: z.number(),
                theme: z.string(),
                activities: z.array(z.object({
                    time: z.string(),
                    activity: z.string(),
                    location: z.string(),
                })),
            })),
        }),
        func: async (input) => {
            return JSON.stringify({
                success: true,
                itineraryId: `IT${Date.now().toString(36)}`,
                ...input,
            });
        },
    });

    const agent = createReactAgent({
        llm: model,
        tools: [handoffToResearch, handoffToBooking, createItineraryTool],
        messageModifier: PLANNING_AGENT_PROMPT,
        name: "PlanningAgent",
    });

    return agent;
}
```

### Step 4: Create the Swarm

Combine agents using `createSwarm`:

```typescript
// ai/orchestration/swarm/travel-swarm.ts

import { createSwarm } from "@langchain/langgraph-swarm";
import { MemorySaver } from "@langchain/langgraph";
import { HumanMessage } from "@langchain/core/messages";

export async function createTravelSwarm() {
    // Create all agents
    const researchAgent = await createResearchAgent();
    const bookingAgent = await createBookingAgent();
    const planningAgent = await createPlanningAgent();

    // Create swarm
    const workflow = createSwarm({
        agents: [researchAgent, bookingAgent, planningAgent],
        defaultActiveAgent: "ResearchAgent",
    });

    // Compile with memory
    const memory = new MemorySaver();
    const graph = workflow.compile({ checkpointer: memory });

    return { graph, memory };
}
```

### Step 5: Invocation Functions

```typescript
const DEFAULT_AGENT = "ResearchAgent";

export async function invokeSwarm(message: string, threadId: string = "default") {
    const { graph } = await getTravelSwarm();

    const result = await graph.invoke(
        { messages: [new HumanMessage(message)] },
        { configurable: { thread_id: threadId } }
    );

    // Get active agent from state
    const state = await graph.getState({ configurable: { thread_id: threadId } });
    const activeAgent = state.values?.activeAgent || DEFAULT_AGENT;

    // Extract response
    const lastMessage = result.messages[result.messages.length - 1];
    const response = typeof lastMessage.content === "string"
        ? lastMessage.content
        : JSON.stringify(lastMessage.content);

    return { response, activeAgent, messageCount: result.messages.length };
}

export async function* streamSwarm(message: string, threadId: string = "default") {
    const { graph } = await getTravelSwarm();

    const stream = await graph.stream(
        { messages: [new HumanMessage(message)] },
        { configurable: { thread_id: threadId }, streamMode: "updates" }
    );

    let currentAgent = DEFAULT_AGENT;

    for await (const update of stream) {
        for (const [nodeName, nodeData] of Object.entries(update)) {
            // Track active agent
            if (nodeData.activeAgent) {
                currentAgent = nodeData.activeAgent;
            } else if (!["__start__", "__end__"].includes(nodeName)) {
                currentAgent = nodeName;
            }

            yield {
                node: nodeName,
                activeAgent: currentAgent,
                messages: nodeData.messages,
                timestamp: new Date().toISOString(),
            };
        }
    }
}
```

## Usage Examples

### Multi-Turn Conversation with Handoffs

```typescript
const threadId = "user-session-123";

// Turn 1: Research
let result = await invokeSwarm(
    "I want to visit Paris. Find me flights from New York.",
    threadId
);
console.log(`[${result.activeAgent}]: ${result.response}`);
// [ResearchAgent]: I found several flights from NYC to Paris...

// Turn 2: Continue with same agent
result = await invokeSwarm(
    "What about hotels near the Eiffel Tower?",
    threadId
);
console.log(`[${result.activeAgent}]: ${result.response}`);
// [ResearchAgent]: Here are hotels near the Eiffel Tower...

// Turn 3: Trigger handoff to Planning
result = await invokeSwarm(
    "Create a 3-day itinerary for me",
    threadId
);
console.log(`[${result.activeAgent}]: ${result.response}`);
// [PlanningAgent]: Here's your 3-day Paris itinerary...

// Turn 4: Trigger handoff to Booking
result = await invokeSwarm(
    "Book the first hotel you suggested",
    threadId
);
console.log(`[${result.activeAgent}]: ${result.response}`);
// [BookingAgent]: I'll help you book that hotel...
```

### Streaming with Agent Tracking

```typescript
for await (const update of streamSwarm(message, threadId)) {
    if (update.activeAgent !== previousAgent) {
        console.log(`Handoff: ${previousAgent} → ${update.activeAgent}`);
    }
    
    if (update.messages) {
        // Display streaming content
        console.log(update.messages[update.messages.length - 1].content);
    }
}
```

## API Route

```typescript
// app/api/orchestration/swarm/route.ts

export async function POST(request: NextRequest) {
    const { message, threadId, stream } = await request.json();

    if (stream) {
        const readable = new ReadableStream({
            async start(controller) {
                for await (const update of streamSwarm(message, threadId)) {
                    controller.enqueue(`data: ${JSON.stringify(update)}\n\n`);
                }
                controller.close();
            },
        });
        return new Response(readable, {
            headers: { "Content-Type": "text/event-stream" },
        });
    }

    const result = await invokeSwarm(message, threadId);
    return NextResponse.json(result);
}

// GET endpoint for checking conversation state
export async function GET(request: NextRequest) {
    const threadId = request.nextUrl.searchParams.get("threadId");
    
    if (threadId) {
        const state = await getSwarmState(threadId);
        return NextResponse.json(state);
    }
    
    return NextResponse.json({ pattern: "swarm", description: "..." });
}
```

## Handoff Flow Diagram

```
User: "Find flights to Paris"
         │
         ▼
┌─────────────────┐
│  ResearchAgent  │ ◄── Default entry
│  (search_flights)│
└────────┬────────┘
         │
User: "Create an itinerary"
         │
         ▼
┌─────────────────┐
│   Handoff Tool  │
│ transfer_to_    │
│ planningagent   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  PlanningAgent  │ ◄── Now active
│(create_itinerary)│
└────────┬────────┘
         │
User: "Book the hotel"
         │
         ▼
┌─────────────────┐
│   Handoff Tool  │
│ transfer_to_    │
│ bookingagent    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  BookingAgent   │ ◄── Now active
│(confirm_booking) │
└─────────────────┘
```

## Key Advantages

1. **Token Efficiency**: No coordinator overhead
2. **Natural Flow**: Direct agent-to-user responses
3. **State Persistence**: Remembers active agent
4. **Simplicity**: Straightforward handoff mechanism

## Considerations

- **Agent Awareness**: All agents must know each other for handoffs
- **Sequential Execution**: Only one agent active at a time
- **Handoff Design**: Requires careful prompt engineering

## Best Practices

1. **Clear Handoff Triggers**: Define explicit phrases that trigger handoffs
2. **Graceful Fallbacks**: Handle cases where handoff target is unclear
3. **Context Preservation**: Ensure relevant context passes between agents
4. **Agent Naming**: Use consistent, descriptive agent names

## Summary

The Swarm pattern provides a natural, conversational multi-agent experience with efficient token usage. It's ideal for applications where users interact with different specialists in a fluid, dynamic manner.

Next, we'll compare both patterns and discuss how to choose the right one for your use case.
