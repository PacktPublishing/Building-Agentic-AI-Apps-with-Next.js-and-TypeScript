import { NextRequest, NextResponse } from 'next/server';
import { MyFirstAgent } from '../../../../ai/agents/agent';

/**
 * GET /api/chat/stats?threadId=xxx
 * Get context optimization statistics for a thread
 */
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const threadId = searchParams.get('threadId');

        if (!threadId) {
            return NextResponse.json(
                { error: 'threadId is required' },
                { status: 400 }
            );
        }

        const agent = MyFirstAgent.getInstance();
        await agent.initialize();

        const stats = await agent.getContextStats(threadId);

        return NextResponse.json({
            success: true,
            stats: {
                messageCount: stats.messageCount,
                estimatedTokens: stats.estimatedTokens,
                hasSummary: stats.hasSummary,
                hasMetadata: stats.hasMetadata,
                summary: stats.summary,
                metadata: stats.metadata,
            }
        });

    } catch (error) {
        console.error('Error getting stats:', error);
        return NextResponse.json(
            {
                error: 'Failed to get stats',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}
