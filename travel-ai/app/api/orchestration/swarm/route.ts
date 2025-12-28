/**
 * Swarm Pattern API Route
 *
 * Handles chat requests using the swarm pattern
 * where agents dynamically hand off control to each other.
 */

import { NextRequest, NextResponse } from "next/server";
import { invokeSwarm, streamSwarm, getSwarmState } from "@/ai/orchestration/swarm";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/orchestration/swarm
 *
 * Execute a query through the swarm multi-agent system
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { message, threadId = `swarm-${Date.now()}`, stream = false } = body;

        if (!message) {
            return NextResponse.json(
                { error: "Message is required" },
                { status: 400 }
            );
        }

        if (stream) {
            // Return SSE stream
            const encoder = new TextEncoder();
            const readable = new ReadableStream({
                async start(controller) {
                    try {
                        for await (const update of streamSwarm(message, threadId)) {
                            const data = JSON.stringify(update);
                            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
                        }
                        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                        controller.close();
                    } catch (error) {
                        console.error("[Swarm API] Stream error:", error);
                        const errorData = JSON.stringify({ error: String(error) });
                        controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
                        controller.close();
                    }
                },
            });

            return new Response(readable, {
                headers: {
                    "Content-Type": "text/event-stream",
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive",
                },
            });
        }

        // Non-streaming response
        const result = await invokeSwarm(message, threadId);

        return NextResponse.json({
            success: true,
            ...result,
            pattern: "swarm",
        });
    } catch (error) {
        console.error("[Swarm API] Error:", error);
        return NextResponse.json(
            {
                error: "Failed to process request",
                details: error instanceof Error ? error.message : String(error)
            },
            { status: 500 }
        );
    }
}

/**
 * GET /api/orchestration/swarm
 *
 * Get information about the swarm pattern or conversation state
 */
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const threadId = searchParams.get("threadId");

    // If threadId provided, return conversation state
    if (threadId) {
        try {
            const state = await getSwarmState(threadId);
            return NextResponse.json({
                success: true,
                threadId,
                ...state,
            });
        } catch (error) {
            return NextResponse.json(
                { error: "Failed to get state", details: String(error) },
                { status: 500 }
            );
        }
    }

    // Otherwise, return pattern info
    return NextResponse.json({
        pattern: "swarm",
        description: "Decentralized multi-agent system with dynamic handoffs",
        agents: [
            {
                name: "ResearchAgent",
                role: "Primary contact for travel searches and information gathering",
                canHandoffTo: ["BookingAgent", "PlanningAgent"],
            },
            {
                name: "BookingAgent",
                role: "Handles reservations and booking confirmations",
                canHandoffTo: ["ResearchAgent", "PlanningAgent"],
            },
            {
                name: "PlanningAgent",
                role: "Creates itineraries and organizes trip schedules",
                canHandoffTo: ["ResearchAgent", "BookingAgent"],
            },
        ],
        characteristics: [
            "Agents hand off control to each other dynamically",
            "Active agent responds directly to user",
            "System remembers which agent was last active",
            "More token-efficient than supervisor pattern",
            "Suitable for conversational workflows",
        ],
        usage: {
            method: "POST",
            body: {
                message: "Your travel query",
                threadId: "optional-thread-id (use same ID to continue conversation)",
                stream: "boolean - enable SSE streaming",
            },
        },
        stateQuery: {
            method: "GET",
            params: {
                threadId: "Thread ID to get state for",
            },
        },
    });
}
