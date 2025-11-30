import { StateGraph, END } from "@langchain/langgraph";
import { TripPlannerStateAnnotation, TripPlannerState } from "./trip-planner-state";
import {
    orchestratorNode,
    flightSearchNode,
    hotelSearchNode,
    activitySearchNode
} from "./trip-planner-nodes";

/**
 * Build and compile the Trip Planner LangGraph workflow
 *
 * Graph Structure:
 *
 *   START
 *     ↓
 * orchestrator
 *     ↓
 *     ├──→ flight_search ──┐
 *     ├──→ hotel_search ───┼──→ END
 *     └──→ activity_search─┘
 *
 * The three search nodes run in parallel automatically because they
 * have no dependencies on each other and all emanate from orchestrator.
 * LangGraph handles the parallelism and convergence at END.
 * User can save the trip manually via the UI button.
 */

export function createTripPlannerGraph() {
    // Create the state graph with our annotation
    const graph = new StateGraph(TripPlannerStateAnnotation)
        // Add all 4 nodes (no auto_save - user saves manually)
        .addNode("orchestrator", orchestratorNode)
        .addNode("flight_search", flightSearchNode)
        .addNode("hotel_search", hotelSearchNode)
        .addNode("activity_search", activitySearchNode)

        // Define the workflow edges
        // Start with orchestrator
        .addEdge("__start__", "orchestrator")

        // Orchestrator fans out to 3 parallel searches
        .addEdge("orchestrator", "flight_search")
        .addEdge("orchestrator", "hotel_search")
        .addEdge("orchestrator", "activity_search")

        // All 3 searches converge at END
        // LangGraph automatically waits for all 3 to complete
        .addEdge("flight_search", END)
        .addEdge("hotel_search", END)
        .addEdge("activity_search", END);

    // Compile the graph
    const compiledGraph = graph.compile();

    return compiledGraph;
}

/**
 * Singleton instance of the compiled graph
 */
let graphInstance: ReturnType<typeof createTripPlannerGraph> | null = null;

/**
 * Get the compiled graph (singleton pattern)
 */
export function getTripPlannerGraph() {
    if (!graphInstance) {
        graphInstance = createTripPlannerGraph();
    }
    return graphInstance;
}

/**
 * Execute the trip planner workflow
 *
 * @param input - Initial state with formInput and threadId
 * @returns Final state after workflow completion
 */
export async function executeTripPlannerWorkflow(
    input: Partial<TripPlannerState>
): Promise<TripPlannerState> {
    const graph = getTripPlannerGraph();

    // Execute the workflow
    const result = await graph.invoke(input);

    return result as TripPlannerState;
}

/**
 * Stream the trip planner workflow with updates
 *
 * @param input - Initial state with formInput and threadId
 * @returns Async iterator of state updates
 */
export async function* streamTripPlannerWorkflow(
    input: Partial<TripPlannerState>
): AsyncIterableIterator<{ node: string; state: Partial<TripPlannerState> }> {
    const graph = getTripPlannerGraph();

    // Stream workflow updates
    // streamMode: "updates" gives us state changes per node
    for await (const update of await graph.stream(input, {
        streamMode: "updates"
    })) {
        // update is { [nodeName]: stateUpdate }
        const nodeName = Object.keys(update)[0];
        const stateUpdate = (update as Record<string, Partial<TripPlannerState>>)[nodeName];

        yield {
            node: nodeName,
            state: stateUpdate
        };
    }
}

/**
 * Get the current state of a running workflow
 *
 * @param threadId - Thread identifier
 * @returns Current state snapshot
 */
export async function getTripPlannerState(threadId: string): Promise<TripPlannerState | null> {
    const graph = getTripPlannerGraph();

    try {
        const state = await graph.getState({
            configurable: { thread_id: threadId }
        });

        return state.values as TripPlannerState;
    } catch (error) {
        console.error('Error getting trip planner state:', error);
        return null;
    }
}

/**
 * Export the graph for visualization/debugging
 */
export { createTripPlannerGraph as default };
