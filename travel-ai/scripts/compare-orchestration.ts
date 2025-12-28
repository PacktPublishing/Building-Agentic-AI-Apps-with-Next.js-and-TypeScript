/**
 * Comparison Script for Orchestration Patterns
 *
 * Runs the same query through both Supervisor and Swarm patterns
 * to compare their behavior, token usage, and response quality.
 *
 * Usage: pnpm tsx scripts/compare-orchestration.ts
 */

import { invokeSupervisor } from "../ai/orchestration/supervisor";
import { invokeSwarm } from "../ai/orchestration/swarm";

interface BenchmarkResult {
    pattern: string;
    duration: number;
    responseLength: number;
    messageCount: number;
    activeAgent?: string;
    success: boolean;
    error?: string;
}

async function benchmark(
    name: string,
    fn: () => Promise<any>
): Promise<BenchmarkResult> {
    const startTime = Date.now();

    try {
        const result = await fn();
        const duration = Date.now() - startTime;

        return {
            pattern: name,
            duration,
            responseLength: result.response?.length || 0,
            messageCount: result.messageCount || 0,
            activeAgent: result.activeAgent,
            success: true,
        };
    } catch (error) {
        return {
            pattern: name,
            duration: Date.now() - startTime,
            responseLength: 0,
            messageCount: 0,
            success: false,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}

async function runComparison(query: string, description: string) {
    console.log("-".repeat(60));
    console.log(`TEST: ${description}`);
    console.log("-".repeat(60));
    console.log(`Query: "${query}"`);
    console.log();

    const results: BenchmarkResult[] = [];

    // Test Supervisor Pattern
    console.log("Running Supervisor Pattern...");
    const supervisorResult = await benchmark("Supervisor", () =>
        invokeSupervisor(query, `compare-supervisor-${Date.now()}`)
    );
    results.push(supervisorResult);
    console.log(`  ✓ Completed in ${supervisorResult.duration}ms`);

    // Test Swarm Pattern
    console.log("Running Swarm Pattern...");
    const swarmResult = await benchmark("Swarm", () =>
        invokeSwarm(query, `compare-swarm-${Date.now()}`)
    );
    results.push(swarmResult);
    console.log(`  ✓ Completed in ${swarmResult.duration}ms`);

    // Display comparison
    console.log();
    console.log("RESULTS:");
    console.log("┌────────────────┬──────────────┬─────────────────┬──────────────┐");
    console.log("│ Pattern        │ Duration     │ Response Length │ Messages     │");
    console.log("├────────────────┼──────────────┼─────────────────┼──────────────┤");

    for (const result of results) {
        const pattern = result.pattern.padEnd(14);
        const duration = `${result.duration}ms`.padEnd(12);
        const responseLen = `${result.responseLength} chars`.padEnd(15);
        const messages = `${result.messageCount}`.padEnd(12);

        if (result.success) {
            console.log(`│ ${pattern} │ ${duration} │ ${responseLen} │ ${messages} │`);
        } else {
            console.log(`│ ${pattern} │ FAILED       │ ${result.error?.substring(0, 15)}... │              │`);
        }
    }

    console.log("└────────────────┴──────────────┴─────────────────┴──────────────┘");

    // Analysis
    if (results.every(r => r.success)) {
        const faster = results[0].duration < results[1].duration ? results[0] : results[1];
        const speedup = Math.abs(results[0].duration - results[1].duration);
        console.log();
        console.log(`Analysis: ${faster.pattern} was ${speedup}ms faster`);
    }

    console.log();
    return results;
}

async function main() {
    console.log();
    console.log("╔════════════════════════════════════════════════════════════╗");
    console.log("║        ORCHESTRATION PATTERNS COMPARISON                    ║");
    console.log("║                                                             ║");
    console.log("║  Comparing Supervisor vs Swarm patterns on various queries  ║");
    console.log("╚════════════════════════════════════════════════════════════╝");
    console.log();

    const testCases = [
        {
            query: "Find flights from Paris to London",
            description: "Simple single-domain query (flights only)",
        },
        {
            query: "I need a hotel in Barcelona near the beach",
            description: "Simple single-domain query (hotels only)",
        },
        {
            query: "Find me flights from NYC to Tokyo and hotels in Shibuya",
            description: "Multi-domain query (flights + hotels)",
        },
        {
            query: "Plan a complete trip to Rome: flights from Berlin, hotel in city center, and cultural activities",
            description: "Complex multi-domain query (all domains)",
        },
    ];

    const allResults: BenchmarkResult[][] = [];

    for (const testCase of testCases) {
        const results = await runComparison(testCase.query, testCase.description);
        allResults.push(results);
    }

    // Summary
    console.log("=".repeat(60));
    console.log("SUMMARY");
    console.log("=".repeat(60));
    console.log();

    let supervisorTotalTime = 0;
    let swarmTotalTime = 0;
    let supervisorWins = 0;
    let swarmWins = 0;

    for (const results of allResults) {
        const supervisor = results.find(r => r.pattern === "Supervisor");
        const swarm = results.find(r => r.pattern === "Swarm");

        if (supervisor?.success) supervisorTotalTime += supervisor.duration;
        if (swarm?.success) swarmTotalTime += swarm.duration;

        if (supervisor?.success && swarm?.success) {
            if (supervisor.duration < swarm.duration) {
                supervisorWins++;
            } else {
                swarmWins++;
            }
        }
    }

    console.log("Speed Comparison:");
    console.log(`  Supervisor: ${supervisorTotalTime}ms total, ${supervisorWins} wins`);
    console.log(`  Swarm: ${swarmTotalTime}ms total, ${swarmWins} wins`);
    console.log();

    console.log("Key Differences:");
    console.log("  • Supervisor: Better for complex coordination, parallel agent execution");
    console.log("  • Swarm: More efficient for conversational flows, direct responses");
    console.log();

    console.log("Recommendations:");
    console.log("  • Use Supervisor when you need to query multiple agents simultaneously");
    console.log("  • Use Swarm when conversation context matters and agents specialize");
    console.log();

    console.log("Done!");
}

main().catch(console.error);
