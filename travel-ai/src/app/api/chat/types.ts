export interface StartChatRequest {
    message: string;
    userId?: string;
}

export interface StartChatResponse {
    threadId: string;
    requiresApproval: boolean;
    response?: string;
    toolCalls?: Array<{
        id: string;
        name: string;
        args: Record<string, any>;
    }>;
}

export interface ContinueChatRequest {
    threadId: string;
    approved: boolean;
    message?: string;
}

export interface SSEEvent {
    type: 'start' | 'token' | 'toolCall' | 'toolResult' | 'complete' | 'error';
    data?: any;
}
