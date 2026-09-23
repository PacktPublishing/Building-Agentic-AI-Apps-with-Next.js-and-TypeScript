/**
 * Test Script for Swarm Pattern
 *
 * Demonstrates the decentralized multi-agent orchestration where
 * agents dynamically hand off control to each other.
 *
 * Usage: pnpm tsx scripts/test-swarm.ts
 */

import { invokeSwarm, streamSwarm, getSwarmState } from "../ai/orchestration/swarm";

async function testSwarmConversation() {
    console.log("=".repeat(60));
    console.log("SWARM PATTERN - CONVERSATION TEST");
    console.log("=".repeat(60));
    console.log();

    const threadId = `test-swarm-${Date.now()}`;

    // Simulate a multi-turn conversation with handoffs
    const queries = [
        "I want to visit Paris. Can you find me some flights from New York?",
        "Great! Now I need a hotel in the city center.",
        "Can you help me plan an itinerary for 3 days?",
    ];

    for (let i = 0; i < queries.length; i++) {
        console.log(`--- Turn ${i + 1} ---`);
        console.log(`User: ${queries[i]}`);
        console.log();

        try {
            const startTime = Date.now();
            const result = await invokeSwarm(queries[i], threadId);
            const duration = Date.now() - startTime;

            console.log(`Active Agent: ${result.activeAgent}`);
            console.log(`Response: ${result.response.substring(0, 500)}${result.response.length > 500 ? "..." : ""}`);
            console.log(`Duration: ${duration}ms`);
            console.log();
        } catch (error) {
            console.error("Error:", error);
        }
    }

    // Check final state
    console.log("-".repeat(60));
    console.log("FINAL STATE");
    console.log("-".repeat(60));

    try {
        const state = await getSwarmState(threadId);
        console.log(`Active Agent: ${state.activeAgent}`);
        console.log(`Total Messages: ${state.messageCount}`);
    } catch (error) {
        console.error("Error getting state:", error);
    }
}

async function testSwarmStream() {
    console.log();
    console.log("=".repeat(60));
    console.log("SWARM PATTERN - STREAM TEST");
    console.log("=".repeat(60));
    console.log();

    const query = "I want to book a trip to Tokyo. Find me flights from London and then help me create an itinerary.";

    console.log("Query:", query);
    console.log();
    console.log("Streaming events:");
    console.log();

    try {
        const startTime = Date.now();
        let eventCount = 0;
        let lastActiveAgent = "";

        for await (const update of streamSwarm(query, `test-swarm-stream-${Date.now()}`)) {
            eventCount++;

            // Track agent changes
            if (update.activeAgent && update.activeAgent !== lastActiveAgent) {
                if (lastActiveAgent) {
                    console.log(`  → HANDOFF: ${lastActiveAgent} → ${update.activeAgent}`);
                }
                lastActiveAgent = update.activeAgent;
            }

            console.log(`[${update.timestamp}] Node: ${update.node}`);

            if (update.data.messages && update.data.messages.length > 0) {
                const lastMsg = update.data.messages[update.data.messages.length - 1];
                console.log(`  → Message type: ${lastMsg.type}`);
                if (lastMsg.content) {
                    console.log(`  → Content preview: ${lastMsg.content.substring(0, 100)}...`);
                }
            }
        }

        const duration = Date.now() - startTime;
        console.log();
        console.log(`Total events: ${eventCount}`);
        console.log(`Final active agent: ${lastActiveAgent}`);
        console.log(`Duration: ${duration}ms`);
    } catch (error) {
        console.error("Error:", error);
    }
}

async function testHandoffScenarios() {
    console.log();
    console.log("=".repeat(60));
    console.log("SWARM PATTERN - HANDOFF SCENARIOS");
    console.log("=".repeat(60));
    console.log();

    const scenarios = [
        {
            name: "Research → Booking",
            queries: [
                "Find me flights to Rome from Berlin",
                "Book the cheapest flight option",
            ],
        },
        {
            name: "Research → Planning",
            queries: [
                "What are some good activities in Barcelona?",
                "Create a 2-day itinerary with these activities",
            ],
        },
        {
            name: "Booking → Planning",
            queries: [
                "I want to book a hotel in Madrid",
                "Now help me plan what to do each day",
            ],
        },
    ];

    for (const scenario of scenarios) {
        console.log(`\n--- Scenario: ${scenario.name} ---\n`);
        const threadId = `handoff-${Date.now()}`;

        for (const query of scenario.queries) {
            console.log(`User: ${query}`);

            try {
                const result = await invokeSwarm(query, threadId);
                console.log(`[${result.activeAgent}]: ${result.response.substring(0, 200)}...`);
                console.log();
            } catch (error) {
                console.error("Error:", error);
            }
        }
    }
}

async function main() {
    console.log();
    console.log("╔════════════════════════════════════════════════════════════╗");
    console.log("║              SWARM PATTERN DEMONSTRATION                    ║");
    console.log("║                                                             ║");
    console.log("║  Agents dynamically hand off control to each other:         ║");
    console.log("║  - ResearchAgent: Primary contact, searches                ║");
    console.log("║  - BookingAgent: Handles reservations                      ║");
    console.log("║  - PlanningAgent: Creates itineraries                      ║");
    console.log("╚════════════════════════════════════════════════════════════╝");
    console.log();

    await testSwarmConversation();
    await testSwarmStream();
    // Uncomment to test handoff scenarios (takes longer)
    // await testHandoffScenarios();

    console.log();
    console.log("Done!");
}

main().catch(console.error);
