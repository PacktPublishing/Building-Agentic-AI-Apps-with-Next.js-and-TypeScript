export interface ChatRequest {
    message: string;
    threadId?: string;
    userId?: string;
}

export interface ChatResponse {
    threadId: string;
    response: string;
}

// Tool call information
export interface ToolCall {
    id: string;
    name: string;
    args: Record<string, any>;
}

// Activity data structure from Amadeus
export interface Activity {
    id: string;
    type: string;
    name: string;
    geoCode: {
        latitude: number;
        longitude: number;
    };
    pictures?: string[];
    bookingLink: string;
    price: {
        currencyCode: string;
        amount: string;
    };
    minimumDuration?: string;
}

// SSE Event types
export type SSEEvent =
    | { type: 'start'; data: { threadId: string } }
    | { type: 'thinking'; data: { content: string } }
    | { type: 'tool_call_start'; data: { toolName: string; args: Record<string, any>; toolCallId: string } }
    | { type: 'tool_result'; data: { toolName: string; toolCallId: string; result: any; summary?: string } }
    | { type: 'ui_component'; data: { component: string; props: Record<string, any> } }
    | { type: 'text'; data: { content: string } }
    | { type: 'token'; data: { content: string } }
    | { type: 'complete'; data: { threadId: string; response: string } }
    | { type: 'error'; data: { error: string; details?: string } };
