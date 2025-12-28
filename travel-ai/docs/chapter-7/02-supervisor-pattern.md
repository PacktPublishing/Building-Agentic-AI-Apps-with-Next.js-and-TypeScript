# Implementing the Supervisor Pattern

## Overview

The Supervisor pattern implements a hierarchical multi-agent system where a central supervisor agent coordinates specialized worker agents. This pattern is ideal when you need:

- Parallel execution of multiple agents
- Central coordination and decision-making
- Result aggregation and synthesis
- Clear separation between routing and execution

## Architecture

```
┌────────────────────────────────────────────────────────┐
│                     Supervisor Graph                    │
├────────────────────────────────────────────────────────┤
│                                                         │
│  START ──► Supervisor ──┬──► FlightAgent ──┐           │
│                         ├──► HotelAgent ───┼──► Synthesize ──► END
│                         └──► ActivityAgent ┘           │
│                                                         │
└────────────────────────────────────────────────────────┘
```

## Implementation

### Step 1: Create Specialized Agents

Each specialized agent focuses on a specific domain. Here's the Flight Agent:

```typescript
// ai/orchestration/supervisor/flight-agent.ts

import { ChatAnthropic } from "@langchain/anthropic";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";

const FLIGHT_AGENT_PROMPT = `You are a Flight Specialist Agent.

Your responsibilities:
1. Search for flights based on user criteria
2. Analyze flight options (price, duration, stops)
3. Provide clear recommendations

You have access to the search_flights tool.`;

export async function createFlightAgent() {
    const model = new ChatAnthropic({
        model: "claude-sonnet-4-20250514",
        temperature: 0.3,
    });

    // Get flight-related tools
    const flightTools = await getFlightTools();

    // Add reporting tool for supervisor communication
    const reportResultsTool = new DynamicStructuredTool({
        name: "report_flight_results",
        description: "Report results back to supervisor",
        schema: z.object({
            summary: z.string(),
            bestOption: z.string().optional(),
            totalOptions: z.number(),
            priceRange: z.object({
                min: z.number(),
                max: z.number(),
                currency: z.string(),
            }).optional(),
        }),
        func: async (input) => JSON.stringify({ type: "flight_report", ...input }),
    });

    const agent = createReactAgent({
        llm: model,
        tools: [...flightTools, reportResultsTool],
        messageModifier: FLIGHT_AGENT_PROMPT,
    });

    return {
        agent,
        name: "FlightAgent",
        description: "Specialist for flight searches and recommendations",
    };
}
```

Similarly, create `HotelAgent` and `ActivityAgent` with their respective prompts and tools.

### Step 2: Define Supervisor State

The supervisor manages state across all agents:

```typescript
// ai/orchestration/supervisor/travel-supervisor.ts

import { Annotation, StateGraph, END, START } from "@langchain/langgraph";
import { BaseMessage } from "@langchain/core/messages";

const SupervisorState = Annotation.Root({
    // Conversation messages
    messages: Annotation<BaseMessage[]>({
        reducer: (curr, update) => [...curr, ...update],
        default: () => [],
    }),
    // Which agent to call next
    nextAgent: Annotation<string | null>({
        reducer: (_, update) => update,
        default: () => null,
    }),
    // Outputs from each agent
    agentOutputs: Annotation<Record<string, string>>({
        reducer: (curr, update) => ({ ...curr, ...update }),
        default: () => ({}),
    }),
    // Agents pending execution
    pendingAgents: Annotation<string[]>({
        reducer: (_, update) => update,
        default: () => [],
    }),
    // Final synthesized response
    finalResponse: Annotation<string | null>({
        reducer: (_, update) => update,
        default: () => null,
    }),
});
```

### Step 3: Implement Supervisor Node

The supervisor analyzes requests and delegates to appropriate agents:

```typescript
const SUPERVISOR_PROMPT = `You are the Travel Supervisor.

Your role:
1. Understand user's travel needs
2. Delegate to specialized agents:
   - FlightAgent: Flight searches
   - HotelAgent: Accommodation searches  
   - ActivityAgent: Tours and activities
3. Synthesize responses

Respond with JSON:
{
    "reasoning": "Your analysis",
    "agents": ["FlightAgent", "HotelAgent"],
    "taskForEachAgent": {
        "FlightAgent": "Task description",
        "HotelAgent": "Task description"
    }
}`;

async function supervisorNode(state: SupervisorStateType) {
    const model = new ChatAnthropic({ model: "claude-sonnet-4-20250514" });
    
    const response = await model.invoke([
        new SystemMessage(SUPERVISOR_PROMPT),
        new HumanMessage(`Analyze: ${state.messages[state.messages.length - 1].content}`),
    ]);

    const decision = JSON.parse(response.content);

    if (decision.directResponse) {
        return {
            finalResponse: decision.directResponse,
            pendingAgents: [],
        };
    }

    return {
        pendingAgents: decision.agents,
        agentOutputs: Object.fromEntries(
            decision.agents.map(a => [a, decision.taskForEachAgent[a]])
        ),
    };
}
```

### Step 4: Implement Agent Nodes

Each agent node executes its specialized task:

```typescript
function createAgentNode(agentName: string) {
    return async (state: SupervisorStateType) => {
        const agentConfig = agents[agentName];
        const task = state.agentOutputs[agentName];
        
        try {
            const result = await agentConfig.agent.invoke({
                messages: [new HumanMessage(task)],
            });

            const output = result.messages[result.messages.length - 1].content;

            return {
                agentOutputs: { [agentName]: output },
                messages: [new AIMessage(`[${agentName}] ${output}`)],
            };
        } catch (error) {
            return {
                agentOutputs: { [agentName]: `Error: ${error}` },
            };
        }
    };
}
```

### Step 5: Implement Synthesis Node

The synthesizer combines outputs from all agents:

```typescript
const SYNTHESIS_PROMPT = `Synthesize these specialist reports into a unified response.
Be concise but comprehensive. Highlight best options.`;

async function synthesizeNode(state: SupervisorStateType) {
    if (state.finalResponse) return {}; // Already have response

    const reports = Object.entries(state.agentOutputs)
        .filter(([_, output]) => output && !output.startsWith("Error:"))
        .map(([agent, output]) => `## ${agent}:\n${output}`)
        .join("\n\n");

    const model = new ChatAnthropic({ model: "claude-sonnet-4-20250514" });
    
    const response = await model.invoke([
        new SystemMessage(SYNTHESIS_PROMPT),
        new HumanMessage(`Reports:\n${reports}`),
    ]);

    return {
        finalResponse: response.content,
        messages: [new AIMessage(response.content)],
    };
}
```

### Step 6: Build the Graph

Connect all nodes with conditional routing:

```typescript
export async function createTravelSupervisor() {
    // Initialize agents
    const flightAgent = await createFlightAgent();
    const hotelAgent = await createHotelAgent();
    const activityAgent = await createActivityAgent();

    const agents = { FlightAgent: flightAgent, HotelAgent: hotelAgent, ActivityAgent: activityAgent };

    // Routing function
    function routeAfterSupervisor(state: SupervisorStateType): string | string[] {
        if (state.finalResponse) return END;
        if (state.pendingAgents.length === 0) return "synthesize";
        return state.pendingAgents; // Parallel execution
    }

    // Build graph
    const workflow = new StateGraph(SupervisorState)
        .addNode("supervisor", supervisorNode)
        .addNode("FlightAgent", createAgentNode("FlightAgent"))
        .addNode("HotelAgent", createAgentNode("HotelAgent"))
        .addNode("ActivityAgent", createAgentNode("ActivityAgent"))
        .addNode("synthesize", synthesizeNode)
        .addEdge(START, "supervisor")
        .addConditionalEdges("supervisor", routeAfterSupervisor, {
            FlightAgent: "FlightAgent",
            HotelAgent: "HotelAgent",
            ActivityAgent: "ActivityAgent",
            synthesize: "synthesize",
            [END]: END,
        })
        .addEdge("FlightAgent", "synthesize")
        .addEdge("HotelAgent", "synthesize")
        .addEdge("ActivityAgent", "synthesize")
        .addEdge("synthesize", END);

    const memory = new MemorySaver();
    return workflow.compile({ checkpointer: memory });
}
```

## Usage

### Basic Invocation

```typescript
import { invokeSupervisor } from "@/ai/orchestration/supervisor";

const result = await invokeSupervisor(
    "I need flights from Paris to Tokyo, a hotel in Shibuya, and some activities",
    "thread-123"
);

console.log(result.response);
console.log(result.agentOutputs); // Individual agent results
```

### Streaming

```typescript
import { streamSupervisor } from "@/ai/orchestration/supervisor";

for await (const update of streamSupervisor(message, threadId)) {
    console.log(`Node: ${update.node}`);
    console.log(`Data:`, update.data);
}
```

## API Route

```typescript
// app/api/orchestration/supervisor/route.ts

export async function POST(request: NextRequest) {
    const { message, threadId, stream } = await request.json();

    if (stream) {
        // Return SSE stream
        const readable = new ReadableStream({
            async start(controller) {
                for await (const update of streamSupervisor(message, threadId)) {
                    controller.enqueue(`data: ${JSON.stringify(update)}\n\n`);
                }
                controller.close();
            },
        });
        return new Response(readable, {
            headers: { "Content-Type": "text/event-stream" },
        });
    }

    const result = await invokeSupervisor(message, threadId);
    return NextResponse.json(result);
}
```

## Key Advantages

1. **Parallel Execution**: Multiple agents can run simultaneously
2. **Result Synthesis**: Unified response from multiple specialists
3. **Flexibility**: Easy to add/remove agents
4. **Control**: Supervisor has full visibility and control

## Considerations

- **Token Usage**: Higher due to coordination overhead
- **Latency**: May be higher for simple requests
- **Complexity**: More complex setup than single agent

## Next Steps

In the next section, we'll explore the Swarm pattern for more natural, conversational multi-agent interactions.
