/**
 * Travel Supervisor Agent
 *
 * Central orchestrator that coordinates specialized travel agents.
 * Implements the Supervisor pattern from LangGraph for hierarchical multi-agent systems.
 *
 * Architecture:
 * - Supervisor receives all user requests
 * - Delegates to specialized agents (Flight, Hotel, Activity)
 * - Aggregates responses and provides unified answers
 * - Maintains conversation context across all agents
 */

import { ChatAnthropic } from "@langchain/anthropic";
import { StateGraph, Annotation, END, START } from "@langchain/langgraph";
import { MemorySaver } from "@langchain/langgraph";
import { BaseMessage, HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";
import { config } from "../../../config";
import { createFlightAgent } from "./flight-agent";
import { createHotelAgent } from "./hotel-agent";
import { createActivityAgent } from "./activity-agent";
import { extractSpecialistReport, parseSupervisorDecision, type AgentName } from './supervisor-contract';

// State annotation for the supervisor graph
const SupervisorState = Annotation.Root({
    messages: Annotation<BaseMessage[]>({
        reducer: (curr, update) => [...curr, ...update],
        default: () => [],
    }),
    nextAgent: Annotation<string | null>({
        reducer: (_, update) => update,
        default: () => null,
    }),
    agentOutputs: Annotation<Record<string, string>>({
        // An explicit empty update starts a new turn; worker reports then merge.
        reducer: (curr, update) => Object.keys(update).length === 0 ? {} : ({ ...curr, ...update }),
        default: () => ({}),
    }),
    agentTasks: Annotation<Record<string, string>>({
        reducer: (_, update) => update,
        default: () => ({}),
    }),
    currentRequest: Annotation<string>({
        reducer: (_, update) => update,
        default: () => '',
    }),
    pendingAgents: Annotation<string[]>({
        reducer: (_, update) => update,
        default: () => [],
    }),
    finalResponse: Annotation<string | null>({
        reducer: (_, update) => update,
        default: () => null,
    }),
});

type SupervisorStateType = typeof SupervisorState.State;

const SUPERVISOR_PROMPT = `You are the Travel Supervisor, a senior travel planning coordinator.

Your role is to:
1. Understand the user's travel needs
2. Delegate tasks to specialized agents:
   - FlightAgent: For flight searches and bookings
   - HotelAgent: For hotel and accommodation searches
   - ActivityAgent: For tours, activities, and experiences
3. Synthesize information from all agents
4. Provide a cohesive, helpful response to the user

When analyzing a user request:
- Identify which aspects require which specialist
- For complex trips, you may need multiple specialists
- Always consider the full context of the trip

You must respond with a JSON object indicating your decision:
{
    "reasoning": "Your analysis of the request",
    "agents": ["FlightAgent", "HotelAgent"], // List of agents to consult
    "taskForEachAgent": {
        "FlightAgent": "Specific task for flight agent",
        "HotelAgent": "Specific task for hotel agent"
    }
}

If you can answer directly without specialists (e.g., general travel advice), respond with:
{
    "reasoning": "Why no specialist is needed",
    "agents": [],
    "directResponse": "Your helpful response"
}`;

const SYNTHESIS_PROMPT = `You are synthesizing responses from travel specialists.

Based on the specialist reports below, create a unified, helpful response for the user.
Be concise but comprehensive. Highlight the best options and provide clear recommendations.

Format your response in a user-friendly way with clear sections for each type of information.`;

/**
 * Create the Travel Supervisor multi-agent system
 */
export async function createTravelSupervisor(dependencies: {
    model?: { invoke(messages: BaseMessage[]): Promise<{ content: unknown }> };
    agents?: Record<string, any>;
} = {}) {
    const model = dependencies.model ?? new ChatAnthropic({
        apiKey: config.anthropic_api_key,
        model: config.model_name,
        temperature: 0.3,
    });

    // Initialize specialized agents
    const agents: Record<string, any> = dependencies.agents ?? {
        FlightAgent: await createFlightAgent(),
        HotelAgent: await createHotelAgent(),
        ActivityAgent: await createActivityAgent(),
    };

    // Node: Supervisor decision making
    async function supervisorNode(state: SupervisorStateType): Promise<Partial<SupervisorStateType>> {
        const latestHuman = [...state.messages].reverse().find((message) => message._getType() === 'human');
        const currentRequest = typeof latestHuman?.content === 'string' ? latestHuman.content : '';

        // Build context from conversation
        const conversationContext = state.messages
            .map((m) => `${m._getType()}: ${m.content}`)
            .join("\n");

        const response = await model.invoke([
            new SystemMessage(SUPERVISOR_PROMPT),
            new HumanMessage(`Conversation so far:\n${conversationContext}\n\nAnalyze the latest request and decide which agents to consult.`),
        ]);

        try {
            // Parse supervisor decision
            const content = typeof response.content === "string"
                ? response.content
                : JSON.stringify(response.content);

            // Extract JSON from response (handle markdown code blocks)
            const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
            const jsonStr = jsonMatch[1] || content;
            const decision = parseSupervisorDecision(jsonStr.trim());

            if ('directResponse' in decision && decision.directResponse) {
                return {
                    finalResponse: decision.directResponse,
                    pendingAgents: [],
                    agentTasks: {},
                    agentOutputs: {},
                    currentRequest,
                    messages: [new AIMessage(decision.directResponse)],
                };
            }

            return {
                finalResponse: null,
                pendingAgents: decision.agents,
                agentTasks: decision.taskForEachAgent,
                agentOutputs: {},
                currentRequest,
            };
        } catch (error) {
            return {
                finalResponse: "I apologize, but I encountered an issue processing your request. Could you please rephrase it?",
                pendingAgents: [],
                agentTasks: {},
                agentOutputs: {},
                currentRequest,
            };
        }
    }

    // Node: Execute a specific agent
    function createAgentNode(agentName: string) {
        return async (state: SupervisorStateType): Promise<Partial<SupervisorStateType>> => {
            const agentConfig = agents[agentName];
            if (!agentConfig) {
                return {
                    agentOutputs: { [agentName]: "Agent not available" },
                };
            }

            const task = state.agentTasks[agentName];
            if (!task) return { agentOutputs: { [agentName]: 'Error: specialist task missing' } };

            try {
                const result = await agentConfig.agent.invoke({
                    messages: [new HumanMessage(String(task))],
                });

                const output = extractSpecialistReport(agentName as AgentName, result.messages);

                return {
                    agentOutputs: { [agentName]: output },
                };
            } catch (error) {
                return {
                    agentOutputs: { [agentName]: 'Error: specialist unavailable' },
                };
            }
        };
    }

    // Node: Synthesize agent outputs
    async function synthesizeNode(state: SupervisorStateType): Promise<Partial<SupervisorStateType>> {
        if (state.finalResponse) {
            return {}; // Already have a direct response
        }

        const agentReports = state.pendingAgents
            .map((agent) => [agent, state.agentOutputs[agent]] as const)
            .filter(([_, output]) => output && !output.startsWith("Error:"))
            .map(([agent, output]) => `## ${agent} Report:\n${output}`)
            .join("\n\n");
        const failedAgents = state.pendingAgents.filter((agent) => !state.agentOutputs[agent] || state.agentOutputs[agent].startsWith('Error:'));

        if (!agentReports) {
            return {
                finalResponse: "I couldn't gather information from the specialists. Please try again with more specific details.",
            };
        }

        const userRequest = state.currentRequest;

        const response = await model.invoke([
            new SystemMessage(SYNTHESIS_PROMPT),
            new HumanMessage(`User's original request: ${userRequest}\n\nSpecialist reports:\n${agentReports}\n\nUnavailable specialists: ${failedAgents.join(', ') || 'none'}. Do not imply unavailable specialists returned results.\n\nProvide a unified response.`),
        ]);

        const finalResponse = typeof response.content === "string"
            ? response.content
            : JSON.stringify(response.content);

        return {
            finalResponse,
            messages: [new AIMessage(finalResponse)],
        };
    }

    // Router function to determine next node
    function routeAfterSupervisor(state: SupervisorStateType): string | string[] {
        if (state.finalResponse) {
            return END;
        }

        if (state.pendingAgents.length === 0) {
            return "synthesize";
        }

        // Return all pending agents for parallel execution
        return state.pendingAgents;
    }

    function routeAfterAgents(state: SupervisorStateType): string {
        return "synthesize";
    }

    // Build the graph
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
    const graph = workflow.compile({ checkpointer: memory });

    return {
        graph,
        memory,
        agents,
    };
}

/**
 * Singleton instance management
 */
let supervisorInstance: Awaited<ReturnType<typeof createTravelSupervisor>> | null = null;

export async function getTravelSupervisor() {
    if (!supervisorInstance) {
        supervisorInstance = await createTravelSupervisor();
    }
    return supervisorInstance;
}

/**
 * Execute a query through the supervisor
 */
export async function invokeSupervisor(message: string, threadId: string = "default") {
    const { graph } = await getTravelSupervisor();

    const result = await graph.invoke(
        { messages: [new HumanMessage(message)] },
        { configurable: { thread_id: threadId } }
    );

    return {
        response: result.finalResponse || "No response generated",
        agentOutputs: result.agentOutputs,
        messageCount: result.messages.length,
    };
}

/**
 * Stream execution through the supervisor
 */
export async function* streamSupervisor(message: string, threadId: string = "default") {
    const { graph } = await getTravelSupervisor();

    const stream = await graph.stream(
        { messages: [new HumanMessage(message)] },
        {
            configurable: { thread_id: threadId },
            streamMode: "updates",
        }
    );

    for await (const update of stream) {
        for (const [nodeName, nodeData] of Object.entries(update)) {
            yield {
                node: nodeName,
                data: nodeData,
                timestamp: new Date().toISOString(),
            };
        }
    }
}

export type TravelSupervisor = Awaited<ReturnType<typeof createTravelSupervisor>>;
