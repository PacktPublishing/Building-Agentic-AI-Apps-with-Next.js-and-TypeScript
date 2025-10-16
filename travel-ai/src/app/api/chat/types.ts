export interface ChatRequest {
    message: string;
    threadId?: string;
    userId?: string;
}

export interface ChatResponse {
    threadId: string;
    response: string;
}

export interface SSEEvent {
    type: 'start' | 'token' | 'toolCall' | 'toolResult' | 'complete' | 'error';
    data?: any;
}
