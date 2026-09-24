import { ChatAnthropic } from "@langchain/anthropic";
import { MemorySaver } from "@langchain/langgraph";
import { createAgent, createMiddleware } from "langchain";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { config } from "../../config";
import { z } from "zod";
import { ContextManager } from "../context/context-manager";
import { TRAVEL_ASSISTANT_PROMPT } from "../prompts/system-prompt";
import { ActivityOffer, availablePrice, FlightOffer, HotelOffer, normalizeToolResult, type NormalizedToolResult } from './tool-result';
import { assertReadOnlyTools } from './tool-safety';

// Tools (externalized for reusability)
import { getAllTools, closeMcpClient } from "../tools";

// Zod schemas for runtime validation
const MessageContentSchema = z.object({
    type: z.string(),
    text: z.string().optional(),
    id: z.string().optional(),
    name: z.string().optional(),
    input: z.union([z.string(), z.record(z.unknown())]).optional(),
});

const ToolCallSchema = z.object({
    id: z.string(),
    name: z.string(),
    args: z.record(z.unknown()),
});

const BaseMessageSchema = z.object({
    id: z.string().optional(),
    type: z.string(),
    content: z.union([
        z.string(),
        z.array(MessageContentSchema),
        z.record(z.unknown())
    ]),
    tool_calls: z.array(ToolCallSchema).optional(),
    name: z.string().optional(),
    tool_call_id: z.string().optional(),
    _getType: z.function().returns(z.string()).optional(),
});

// TypeScript types inferred from Zod schemas
type MessageContent = z.infer<typeof MessageContentSchema>;
type ToolCall = z.infer<typeof ToolCallSchema>;
type BaseMessage = z.infer<typeof BaseMessageSchema>;
type ToolResult = Extract<NormalizedToolResult, { kind: 'success' }>;

class TravelAssistantAgent {
    private model!: ChatAnthropic;
    private tools: DynamicStructuredTool[];
    private memory: MemorySaver;
    private graph: any;
    private isInitialized: boolean = false;
    private initializationPromise: Promise<void> | null = null;
    private contextManager!: ContextManager;

    // Singleton
    private static instance: TravelAssistantAgent;

    private constructor() {
        this.tools = [];
        this.memory = new MemorySaver();
        this.graph = null;
    }

    static getInstance(): TravelAssistantAgent {
        if (!TravelAssistantAgent.instance) {
            TravelAssistantAgent.instance = new TravelAssistantAgent();
        }
        return TravelAssistantAgent.instance;
    }

    /**
     * Initialize the agent and load tools
     * Must be called before using the agent
     */
    async initialize(): Promise<void> {
        if (this.isInitialized) return;
        if (this.initializationPromise) return this.initializationPromise;
        this.initializationPromise = (async () => {
            const model = new ChatAnthropic({
                apiKey: config.anthropic_api_key,
                model: config.model_name,
                streaming: true,
                temperature: 0.5,
                tags: ["travel-agent", "context-engineering", "optimized"],
            });
            const contextManager = new ContextManager(model, {
                maxHistoryMessages: 10,
                enableSummarization: true,
                summaryTriggerThreshold: 6,
                enableMetadataExtraction: true,
            });
            const tools = await getAllTools();
            assertReadOnlyTools(tools);
            const graph = createAgent({
                model,
                tools,
                checkpointer: this.memory,
                systemPrompt: TRAVEL_ASSISTANT_PROMPT,
                middleware: [createMiddleware({
                    name: 'BoundedTravelContext',
                    wrapModelCall: async (request, handler) => {
                        const threadId = request.runtime.configurable?.thread_id;
                        if (!threadId) return handler(request);
                        const messages = await contextManager.prepareModelInput(request.messages, threadId);
                        return handler({ ...request, messages });
                    },
                })],
            });
            this.tools = tools;
            this.graph = graph;
            this.model = model;
            this.contextManager = contextManager;
            this.isInitialized = true;
        })();
        try {
            await this.initializationPromise;
        } finally {
            this.initializationPromise = null;
        }
    }

    /**
     * Ensure the agent is initialized before operations
     */
    private ensureInitialized(): void {
        if (!this.isInitialized || !this.graph) {
            throw new Error("Agent not initialized. Call initialize() first.");
        }
    }

    async invoke(message: string, threadId: string = "default") {
        this.ensureInitialized();
        
        const config = { 
            configurable: { thread_id: threadId },
            tags: ["travel-agent", "context-engineering", "optimized", `thread:${threadId}`],
            metadata: {
                optimization: "enabled",
                thread_id: threadId,
                agent_type: "travel"
            }
        };
        
        // First invocation with the user message
        let result = await this.graph.invoke(
            { messages: [{ role: "user", content: message }] },
            config
        );
        
        console.log('Initial invoke result messages:', result.messages.map((m: any) => ({
            type: m.type || m._getType?.(),
            content: typeof m.content === 'string' ? m.content.substring(0, 100) : JSON.stringify(m.content).substring(0, 100),
            hasToolCalls: !!m.tool_calls
        })));
        
        // Check if we need to continue (if last message has tool calls but no content)
        const lastMsg = result.messages[result.messages.length - 1];
        if (lastMsg.tool_calls && !lastMsg.content) {
            console.log('Tool calls detected, continuing execution...');
            // Continue execution to get the final response after tool execution
            result = await this.graph.invoke(null, config);
            console.log('After continuation:', result.messages.map((m: any) => ({
                type: m.type || m._getType?.(),
                content: typeof m.content === 'string' ? m.content.substring(0, 100) : JSON.stringify(m.content).substring(0, 100),
                hasToolCalls: !!m.tool_calls
            })));
        }
        
        // Find the last AI message with content
        for (let i = result.messages.length - 1; i >= 0; i--) {
            const msg = result.messages[i];
            if ((msg.type === 'ai' || msg._getType?.() === 'ai') && msg.content) {
                // Handle content that might be an array (Claude format)
                let content = typeof msg.content === 'string' 
                    ? msg.content 
                    : Array.isArray(msg.content) 
                        ? msg.content.map((c: any) => c.text || JSON.stringify(c)).join('')
                        : JSON.stringify(msg.content);
                
                // Extract only the Final Answer part if present (clean ReAct format)
                const finalAnswerMatch = content.match(/Final Answer:\s*([\s\S]*)/);
                if (finalAnswerMatch) {
                    content = finalAnswerMatch[1].trim();
                }
                
                console.log('Found AI message with content:', content.substring(0, 100));
                return content;
            }
        }
        
        // Fallback
        console.log('No AI message found, returning last message');
        const lastContent = result.messages[result.messages.length - 1].content;
        return typeof lastContent === 'string' ? lastContent : JSON.stringify(lastContent) || '';
    }

    async getState(threadId: string = "default") {
        this.ensureInitialized();
        const config = { configurable: { thread_id: threadId } };
        const state = await this.graph.getState(config);
        return state;
    }

    async approveAndContinue(threadId: string = "default"): Promise<string> {
        void threadId;
        throw new Error('Approval workflow is unavailable; no side-effecting tools are enabled');
    }

    async invokeWithApproval(message: string, threadId: string = "default"): Promise<{
        needsApproval: boolean;
        toolCalls?: ToolCall[];
        threadId: string;
        response?: string;
        partialResponse?: string;
    }> {
        void message;
        void threadId;
        throw new Error('Approval workflow is unavailable; no side-effecting tools are enabled');
    }

    async *stream(message: string, threadId: string = "default") {
        this.ensureInitialized();
        const config = { configurable: { thread_id: threadId } };
        const stream = await this.graph.stream(
            { messages: [{ role: "user", content: message }] },
            config,
            { streamMode: "values" }
        );

        let lastContent = '';
        for await (const chunk of stream) {
            console.log('Stream chunk keys:', Object.keys(chunk));
            
            // LangChain v1: node name changed from 'agent' to 'model'
            const messages = chunk.model?.messages || chunk.agent?.messages || chunk.messages;
            
            if (messages && Array.isArray(messages)) {
                const lastMsg = messages[messages.length - 1];
                if (lastMsg && (lastMsg.type === 'ai' || lastMsg._getType?.() === 'ai')) {
                    let content = typeof lastMsg.content === 'string' 
                        ? lastMsg.content 
                        : Array.isArray(lastMsg.content) 
                            ? lastMsg.content.map((c: any) => c.text || '').join('')
                            : '';
                    
                    // Only yield if content changed (avoid duplicates)
                    if (content && content !== lastContent) {
                        // Extract Final Answer if present
                        const finalAnswerMatch = content.match(/Final Answer:\s*([\s\S]*)/);
                        if (finalAnswerMatch) {
                            content = finalAnswerMatch[1].trim();
                        }
                        
                        console.log('Yielding content:', content.substring(0, 100));
                        lastContent = content;
                        yield content;
                    }
                }
            }
        }
    }

    /**
     * Stream with structured events for Generative UI
     * Emits different event types: thinking, tool_call_start, tool_result, ui_component, text
     */
    async *streamStructured(message: string, threadId: string = "default") {
        this.ensureInitialized();
        
        const config = { 
            configurable: { thread_id: threadId },
            tags: ["travel-agent", "context-engineering", "optimized", `thread:${threadId}`, "streaming"],
            metadata: {
                optimization: "enabled",
                thread_id: threadId,
                agent_type: "travel",
                stream_mode: "structured"
            }
        };
        const stream = await this.graph.stream(
            { messages: [{ role: "user", content: message }] },
            config,
            { streamMode: "updates" }
        );

        const processedMessageIds = new Set<string>();

        for await (const chunk of stream) {
            console.log('[streamStructured] Chunk received, keys:', Object.keys(chunk));
            
            for (const [nodeName, nodeData] of Object.entries(chunk)) {
                const messages = this.extractMessagesFromNode(nodeData, nodeName);
                if (!messages) continue;

                for (const msg of messages) {
                    if (this.isMessageProcessed(msg, processedMessageIds)) continue;
                    processedMessageIds.add(this.getMessageId(msg));

                    // Process AI messages
                    if (this.isAIMessage(msg)) {
                        yield* this.processAIMessage(msg);
                    }

                    // Process Tool messages
                    if (this.isToolMessage(msg)) {
                        yield* this.processToolMessage(msg);
                    }
                }
            }
        }
    }

    /**
     * Extract messages from node data
     */
    private extractMessagesFromNode(nodeData: any, nodeName: string): BaseMessage[] | null {
        const messages = nodeData?.messages || (Array.isArray(nodeData) ? nodeData : null);
        
        if (!messages || !Array.isArray(messages)) {
            console.log('[streamStructured] No messages in node:', nodeName);
            return null;
        }

        console.log('[streamStructured] Messages in node:', messages.length);
        return messages;
    }

    /**
     * Check if message has already been processed
     */
    private isMessageProcessed(msg: BaseMessage, processedIds: Set<string>): boolean {
        const msgId = this.getMessageId(msg);
        if (processedIds.has(msgId)) {
            console.log('[streamStructured] Skipping already processed message');
            return true;
        }
        return false;
    }

    /**
     * Generate unique message ID
     */
    private getMessageId(msg: BaseMessage): string {
        return msg.id || `${msg.type}-${JSON.stringify(msg.content).substring(0, 50)}`;
    }

    /**
     * Check if message is an AI message
     */
    private isAIMessage(msg: BaseMessage): boolean {
        return msg.type === 'ai' || msg._getType?.() === 'ai';
    }

    /**
     * Check if message is a tool message
     */
    private isToolMessage(msg: BaseMessage): boolean {
        return msg.type === 'tool' || msg._getType?.() === 'tool';
    }

    /**
     * Process AI messages and yield events
     */
    private async *processAIMessage(msg: BaseMessage) {
        console.log('[streamStructured] AI message detected');
        
        const { textContent, toolCalls } = this.extractAIMessageContent(msg);

        // Emit thinking event
        if (textContent) {
            const cleanText = this.extractThinkingText(textContent);
            if (cleanText) {
                yield {
                    type: 'thinking' as const,
                    data: { content: cleanText }
                };
            }
        }

        // Emit tool call events
        for (const toolCall of toolCalls) {
            yield {
                type: 'tool_call_start' as const,
                data: {
                    toolName: toolCall.name,
                    args: toolCall.args,
                    toolCallId: toolCall.id
                }
            };
        }
    }

    /**
     * Extract content and tool calls from AI message
     */
    private extractAIMessageContent(msg: BaseMessage): { textContent: string; toolCalls: ToolCall[] } {
        let textContent = '';
        let toolCalls: any[] = [];

        if (Array.isArray(msg.content)) {
            for (const block of msg.content) {
                if (block.type === 'text') {
                    textContent += block.text;
                } else if (block.type === 'tool_use') {
                    let args = block.input;
                    // Parse string input, handle empty strings
                    if (typeof block.input === 'string') {
                        if (block.input.trim() === '') {
                            args = {};
                        } else {
                            try {
                                args = JSON.parse(block.input);
                            } catch (e) {
                                console.warn('[extractAIMessageContent] Failed to parse tool input, using empty object:', block.input);
                                args = {};
                            }
                        }
                    }
                    
                    toolCalls.push({
                        id: block.id,
                        name: block.name,
                        args: args
                    });
                }
            }
        } else if (typeof msg.content === 'string') {
            textContent = msg.content;
        }

        // Also check tool_calls property
        if (msg.tool_calls && msg.tool_calls.length > 0) {
            toolCalls = msg.tool_calls;
        }

        return { textContent, toolCalls };
    }

    /**
     * Extract clean thinking text from ReAct format
     */
    private extractThinkingText(textContent: string): string {
        const thoughtMatch = textContent.match(/Thought:\s*([\s\S]+?)(?=\nAction:|$)/);
        const finalAnswerMatch = textContent.match(/Final Answer:\s*([\s\S]+?)$/);
        
        if (thoughtMatch) {
            return thoughtMatch[1].trim();
        } else if (finalAnswerMatch) {
            return finalAnswerMatch[1].trim();
        } else {
            // Fallback: remove prefixes
            return textContent
                .replace(/^Thought:\s*/i, '')
                .replace(/^Final Answer:\s*/i, '')
                .replace(/Action:[\s\S]*$/, '')
                .trim();
        }
    }

    /**
     * Process tool messages and yield events
     */
    private async *processToolMessage(msg: BaseMessage) {
        // Special handling for get_current_date tool (doesn't follow standard format)
        if (msg.name === 'get_current_date') {
            return;
        }
        
        const result = this.parseToolResult(msg);
        if (!result) {
            yield {
                type: 'error' as const,
                data: { error: `Tool ${msg.name || 'unknown'} failed` }
            };
            return;
        }
        const schema = msg.name === 'search_flights' ? FlightOffer : msg.name === 'search_hotels' ? HotelOffer : msg.name === 'search_tours_activities' ? ActivityOffer : null;
        if (schema && !result.data.every((record) => schema.safeParse(record).success)) {
            yield { type: 'error' as const, data: { error: `Tool ${msg.name} returned invalid data` } };
            return;
        }
        
        // Transform and emit UI component or generic result
        const uiComponent = this.transformToUIComponent(msg.name || 'unknown', result);
        if (uiComponent) {
            yield uiComponent;
        } else {
            yield {
                type: 'tool_result' as const,
                data: {
                    toolName: msg.name,
                    toolCallId: msg.tool_call_id,
                    result: result,
                    summary: this.summarizeToolResult(msg.name || 'unknown', result)
                }
            };
        }
    }

    /**
     * Parse tool result from message content with Zod validation
     */
    private parseToolResult(msg: BaseMessage): ToolResult | null {
        const normalized = normalizeToolResult(msg);
        return normalized.kind === 'success' ? normalized : null;
    }

    /**
     * Transform tool result to UI component event
     */
    private transformToUIComponent(toolName: string, result: ToolResult): any | null {
        if (toolName === 'search_tours_activities' && result.data.length > 0) {
            return {
                type: 'ui_component' as const,
                data: {
                    component: 'ActivityList',
                    props: {
                        activities: result.data.map((item) => {
                            const activity = ActivityOffer.parse(item);
                            const amount = activity.price?.amount;
                            const hasPrice = !!amount?.trim() && Number.isFinite(Number(amount)) && Number(amount) >= 0 && !!activity.price?.currencyCode?.trim();
                            return { ...activity, price: hasPrice ? activity.price : undefined };
                        }),
                        totalAvailable: result.meta?.totalAvailable ?? result.data.length
                    }
                }
            };
        }
        
        if (toolName === 'search_flights' && result.data.length > 0) {
            return {
                type: 'ui_component' as const,
                data: {
                    component: 'FlightList',
                    props: { flights: this.transformFlightsData(result.data) }
                }
            };
        }
        
        if (toolName === 'search_hotels' && result.data.length > 0) {
            return {
                type: 'ui_component' as const,
                data: {
                    component: 'HotelList',
                    props: { hotels: this.transformHotelsData(result.data) }
                }
            };
        }
        
        return null;
    }

    /**
     * Transform Amadeus flight data to UI format
     */
    private transformFlightsData(data: any[]): any[] {
        return data
            .map((offer) => FlightOffer.parse(offer))
            .slice(0, 3)
            .map((offer: any) => ({
                id: offer.id,
                price: availablePrice(offer.price),
                outbound: this.transformItinerary(offer.itineraries[0], offer.validatingAirlineCodes),
                inbound: offer.itineraries[1] ? this.transformItinerary(offer.itineraries[1], offer.validatingAirlineCodes) : undefined,
            }));
    }

    /**
     * Transform flight itinerary
     */
    private transformItinerary(itinerary: any, validatingCodes: string[]): any {
        const firstSegment = itinerary.segments[0];
        const lastSegment = itinerary.segments[itinerary.segments.length - 1];
        
        return {
            departure: {
                airport: {
                    code: firstSegment.departure.iataCode,
                },
                time: firstSegment.departure.at
            },
            arrival: {
                airport: {
                    code: lastSegment.arrival.iataCode,
                },
                time: lastSegment.arrival.at
            },
            airline: {
                code: firstSegment.carrierCode,
            },
            duration: itinerary.duration?.replace('PT', '').replace('H', 'h ').replace('M', 'm'),
            stops: itinerary.segments.length - 1
        };
    }

    /**
     * Transform Amadeus hotel data to UI format
     */
    private transformHotelsData(data: any[]): any[] {
        return data.map((offer) => HotelOffer.parse(offer)).filter((offer) => !!offer.hotel.name).slice(0, 4).map((hotelOffer) => {
            const rawRating = hotelOffer.hotel.rating;
            const rating = rawRating === undefined ? undefined : Number(rawRating);
            return {
                id: hotelOffer.hotel.hotelId || hotelOffer.id,
                name: hotelOffer.hotel.name,
                rating: Number.isFinite(rating) && rating! >= 0 && rating! <= 5 ? rating : undefined,
                address: {
                    street: hotelOffer.hotel.address?.lines?.[0],
                    city: hotelOffer.hotel.cityCode,
                    postalCode: hotelOffer.hotel.address?.postalCode
                },
                location: hotelOffer.hotel.latitude !== undefined && hotelOffer.hotel.longitude !== undefined
                    ? { latitude: hotelOffer.hotel.latitude, longitude: hotelOffer.hotel.longitude } : undefined,
                description: hotelOffer.offers?.[0]?.room?.description?.text,
                amenities: hotelOffer.hotel.amenities,
                price: availablePrice(hotelOffer.offers?.[0]?.price),
                images: undefined,
            };
        });
    }

    /**
     * Create a human-readable summary of tool results
     */
    private summarizeToolResult(toolName: string, result: any): string {
        if (!result || result.kind !== 'success') return 'Tool unavailable';

        switch (toolName) {
            case 'search_cities':
                return `Found ${result.data.length} cities`;
            case 'search_tours_activities':
                return `Found ${result.meta?.totalAvailable ?? result.data.length} activities`;
            case 'search_hotels':
                return `Found ${result.data.length} hotels`;
            case 'search_flights':
                return `Found ${result.data.length} flights`;
            default:
                return 'Results received';
        }
    }

    getTools() {
        return this.tools;
    }

    /**
     * Get context statistics for a thread
     */
    async getContextStats(threadId: string = "default") {
        const state = await this.graph.getState({ configurable: { thread_id: threadId } });
        const messages = state.values?.messages || [];
        
        return {
            messageCount: messages.length,
            estimatedTokens: this.contextManager.calculateMessageTokens(messages),
            hasSummary: !!this.contextManager.getSummary(threadId),
            hasMetadata: !!this.contextManager.getMetadata(threadId),
            summary: this.contextManager.getSummary(threadId),
            metadata: this.contextManager.getMetadata(threadId),
        };
    }

    /**
     * Get the context manager instance
     */
    getContextManager() {
        return this.contextManager;
    }
}

const agent = TravelAssistantAgent.getInstance();
export default agent;
export { TravelAssistantAgent };
