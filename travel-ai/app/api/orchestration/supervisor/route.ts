/**
 * Supervisor Pattern API Route
 *
 * Handles chat requests using the hierarchical supervisor pattern
 * where a central supervisor coordinates specialized agents.
 */

import { NextRequest, NextResponse } from "next/server";
import { invokeSupervisor, streamSupervisor } from "@/ai/orchestration/supervisor";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/orchestration/supervisor
 *
 * Execute a query through the supervisor multi-agent system
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { message, threadId = `supervisor-${Date.now()}`, stream = false } = body;

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
                        for await (const update of streamSupervisor(message, threadId)) {
                            const data = JSON.stringify(update);
                            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
                        }
                        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                        controller.close();
                    } catch (error) {
                        console.error("[Supervisor API] Stream error:", error);
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
        const result = await invokeSupervisor(message, threadId);

        return NextResponse.json({
            success: true,
            ...result,
            threadId,
            pattern: "supervisor",
        });
    } catch (error) {
        console.error("[Supervisor API] Error:", error);
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
 * GET /api/orchestration/supervisor
 *
 * Get information about the supervisor pattern
 */
export async function GET() {
    return NextResponse.json({
        pattern: "supervisor",
        description: "Hierarchical multi-agent system with a central supervisor",
        agents: [
            {
                name: "Supervisor",
                role: "Central coordinator that receives all requests and delegates to specialists",
            },
            {
                name: "FlightAgent",
                role: "Specialist for flight searches and recommendations",
            },
            {
                name: "HotelAgent",
                role: "Specialist for hotel and accommodation searches",
            },
            {
                name: "ActivityAgent",
                role: "Specialist for tours, activities, and experiences",
            },
        ],
        characteristics: [
            "All communication goes through the supervisor",
            "Better control over agent coordination",
            "Suitable for complex multi-step tasks",
            "Higher token usage due to coordination overhead",
        ],
        usage: {
            method: "POST",
            body: {
                message: "Your travel query",
                threadId: "optional-thread-id",
                stream: "boolean - enable SSE streaming",
            },
        },
    });
}
