import { NextRequest, NextResponse } from 'next/server';
import { MyFirstAgent } from '../../../../../ai/agents/agent';
import { StartChatRequest, StartChatResponse } from '../types';

/**
 * POST /api/chat/start
 * Start a new chat conversation with the travel agent
 */
export async function POST(request: NextRequest) {
    try {
        const body: StartChatRequest = await request.json();
        const { message, userId } = body;

        if (!message || typeof message !== 'string') {
            return NextResponse.json(
                { error: 'Message is required and must be a string' },
                { status: 400 }
            );
        }

        // Initialize the agent
        const agent = MyFirstAgent.getInstance();
        await agent.initialize();

        // Generate a unique thread ID
        const threadId = `thread-${Date.now()}-${Math.random().toString(36).substring(7)}`;

        // Invoke the agent
        const result = await agent.invoke(message, threadId);

        const response: StartChatResponse = {
            threadId,
            requiresApproval: result.requiresApproval,
            response: result.response,
            toolCalls: result.toolCalls?.map((call: any) => ({
                id: call.id || `call-${Date.now()}`,
                name: call.name,
                args: call.args
            }))
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Error in /api/chat/start:', error);
        return NextResponse.json(
            { 
                error: 'Failed to start chat',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}
