import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { MyFirstAgent } from '../../../../ai/agents/agent';
import { ChatRequest, ChatResponse } from '../types';

/**
 * POST /api/chat/invoke
 * Classic invocation - waits for complete response before returning
 * Use this when you don't need real-time streaming
 */
export async function POST(request: NextRequest) {
    try {
        const body: ChatRequest = await request.json();
        const { message, threadId, userId } = body;

        if (!message || typeof message !== 'string') {
            return NextResponse.json(
                { error: 'Message is required and must be a string' },
                { status: 400 }
            );
        }

        // Generate thread ID if not provided
        const finalThreadId = threadId || uuidv4();

        // Initialize the agent
        const agent = MyFirstAgent.getInstance();
        await agent.initialize();

        // Invoke the agent and wait for complete response
        const response = await agent.invoke(message, finalThreadId);

        const result: ChatResponse = {
            threadId: finalThreadId,
            response: response || ''
        };

        return NextResponse.json(result);

    } catch (error) {
        console.error('Error in /api/chat/invoke:', error);
        return NextResponse.json(
            { 
                error: 'Failed to process request',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}
