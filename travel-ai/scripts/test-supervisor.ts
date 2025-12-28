/**
 * Test Script for Supervisor Pattern
 *
 * Demonstrates the hierarchical multi-agent orchestration where
 * a supervisor coordinates specialized agents.
 *
 * Usage: pnpm tsx scripts/test-supervisor.ts
 */

import { invokeSupervisor, streamSupervisor } from "../ai/orchestration/supervisor";

async function testSupervisorInvoke() {
    console.log("=".repeat(60));
    console.log("SUPERVISOR PATTERN - INVOKE TEST");
    console.log("=".repeat(60));
    console.log();

    const query = "I'm planning a trip to Barcelona next week. I need flights from Paris, a hotel near the beach, and some cultural activities.";

    console.log("Query:", query);
    console.log();
    console.log("Processing...");
    console.log();

    try {
        const startTime = Date.now();
        const result = await invokeSupervisor(query, `test-supervisor-${Date.now()}`);
        const duration = Date.now() - startTime;

        console.log("-".repeat(60));
        console.log("RESULT");
        console.log("-".repeat(60));
        console.log();
        console.log("Response:", result.response);
        console.log();
        console.log("Agent Outputs:");
        for (const [agent, output] of Object.entries(result.agentOutputs)) {
            console.log(`  ${agent}: ${(output as string).substring(0, 200)}...`);
        }
        console.log();
        console.log(`Message Count: ${result.messageCount}`);
        console.log(`Duration: ${duration}ms`);
    } catch (error) {
        console.error("Error:", error);
    }
}

async function testSupervisorStream() {
    console.log();
    console.log("=".repeat(60));
    console.log("SUPERVISOR PATTERN - STREAM TEST");
    console.log("=".repeat(60));
    console.log();

    const query = "Find me hotels in Tokyo and activities to do there.";

    console.log("Query:", query);
    console.log();
    console.log("Streaming events:");
    console.log();

    try {
        const startTime = Date.now();
        let eventCount = 0;

        for await (const update of streamSupervisor(query, `test-supervisor-stream-${Date.now()}`)) {
            eventCount++;
            console.log(`[${update.timestamp}] Node: ${update.node}`);

            if (update.data?.pendingAgents) {
                console.log(`  → Delegating to: ${update.data.pendingAgents.join(", ")}`);
            }
            if (update.data?.finalResponse) {
                console.log(`  → Final response received (${update.data.finalResponse.length} chars)`);
            }
            if (update.data?.agentOutputs) {
                const agents = Object.keys(update.data.agentOutputs);
                if (agents.length > 0) {
                    console.log(`  → Agent outputs from: ${agents.join(", ")}`);
                }
            }
        }

        const duration = Date.now() - startTime;
        console.log();
        console.log(`Total events: ${eventCount}`);
        console.log(`Duration: ${duration}ms`);
    } catch (error) {
        console.error("Error:", error);
    }
}

async function main() {
    console.log();
    console.log("╔════════════════════════════════════════════════════════════╗");
    console.log("║           SUPERVISOR PATTERN DEMONSTRATION                  ║");
    console.log("║                                                             ║");
    console.log("║  A central supervisor coordinates specialized agents:       ║");
    console.log("║  - FlightAgent: Searches for flights                       ║");
    console.log("║  - HotelAgent: Searches for hotels                         ║");
    console.log("║  - ActivityAgent: Searches for activities                  ║");
    console.log("╚════════════════════════════════════════════════════════════╝");
    console.log();

    await testSupervisorInvoke();
    await testSupervisorStream();

    console.log();
    console.log("Done!");
}

main().catch(console.error);
