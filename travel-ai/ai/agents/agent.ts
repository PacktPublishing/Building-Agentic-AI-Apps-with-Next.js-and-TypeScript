import { ChatAnthropic } from "@langchain/anthropic";
import { MemorySaver } from "@langchain/langgraph";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { MultiServerMCPClient } from "@langchain/mcp-adapters"; 
import type { DynamicStructuredTool } from "@langchain/core/tools";
import { config } from "../../config";

class MyFirstAgent {
    private model: ChatAnthropic;
    private tools: DynamicStructuredTool[];
    private memory: MemorySaver;
    private graph: any;
    private mcpClient: MultiServerMCPClient | null = null;
    private isInitialized: boolean = false;

    // Singleton
    private static instance: MyFirstAgent;

    private constructor() {
        this.model = new ChatAnthropic({
            apiKey: config.anthropic_api_key,
            model: config.model_name || "claude-3-7-sonnet-20250219",
            streaming: true,
            temperature: 0.5,
        });
        
        this.tools = [];
        this.memory = new MemorySaver();
        this.graph = null;
    }

    static getInstance(): MyFirstAgent {
        if (!MyFirstAgent.instance) {
            MyFirstAgent.instance = new MyFirstAgent();
        }
        return MyFirstAgent.instance;
    }

    /**
     * Initialize the MCP client and load tools
     * Must be called before using the agent
     */
    async initialize(): Promise<void> {
        if (this.isInitialized) {
            console.warn("Agent already initialized");
            return;
        }


        this.mcpClient = new MultiServerMCPClient({  
            amadeus: {
                transport: "http",
                url: config.amadeus_url,
                headers: {
                    "Authorization": `Bearer ${config.amadeus_bearer_token}`
                }
            },
        });


        const mcpTools = await this.mcpClient.getTools();
        this.tools = [...mcpTools];
        
        this.tools = [ ...mcpTools ];

        // Create the ReAct agent with loaded tools and custom prompt
        const systemPrompt = `You are a helpful travel assistant. Answer questions as best you can. You have access to the following tools:

{tools}

Use the following format:

Question: the input question you must answer
Thought: you should always think about what to do
Action: the action to take, should be one of [{tool_names}]
Action Input: the input to the action
Observation: the result of the action
... (this Thought/Action/Action Input/Observation can repeat N times)
Thought: I now know the final answer
Final Answer: the final answer to the original input question

Begin!

Question: {input}
Thought:`;

        this.graph = createReactAgent({
            llm: this.model,
            tools: this.tools,
            checkpointSaver: this.memory,
           // interruptBefore: config.is_interrupt ? ["tools"] : [],
            messageModifier: systemPrompt
        });

        this.isInitialized = true;
        console.log(`Agent initialized with ${this.tools.length} tools`);
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
        const config = { configurable: { thread_id: threadId } };
        
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
        let lastMsg = result.messages[result.messages.length - 1];
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

    async approveAndContinue(threadId: string = "default") {
        this.ensureInitialized();
        const config = { configurable: { thread_id: threadId } };
        
        try {
            const stream = await this.graph.stream(null, config, { streamMode: "values" });
            let finalResponse = "";
            
            for await (const chunk of stream) {
                console.log('Continue stream chunk:', JSON.stringify(chunk, null, 2));
                
                if (chunk.agent?.messages) {
                    for (const message of chunk.agent.messages) {
                        if (message.content && typeof message.content === 'string') {
                            finalResponse = message.content;
                            console.log('Found final response:', finalResponse);
                        }
                    }
                }
                
                if (!finalResponse && chunk.messages) {
                    const lastMessage = chunk.messages[chunk.messages.length - 1];
                    if (lastMessage && (lastMessage.type === 'ai' || lastMessage._getType?.() === 'ai')) {
                        finalResponse = lastMessage.content || "";
                    }
                }
            }
            
            console.log('Final response to return:', finalResponse);
            return finalResponse;
        } catch (error) {
            console.error('Error in approveAndContinue:', error);
            throw error;
        }
    }

    async invokeWithApproval(message: string, threadId: string = "default") {
        this.ensureInitialized();
        const config = { configurable: { thread_id: threadId } };
        
        const result = await this.graph.invoke(
            { messages: [{ role: "user", content: message }] },
            config
        );

        const state = await this.graph.getState(config);
        
        if (state.next && state.next.includes("tools")) {
            const lastMessage = result.messages[result.messages.length - 1];
            return {
                needsApproval: true,
                toolCalls: lastMessage.tool_calls || [],
                threadId,
                partialResponse: lastMessage.content || ""
            };
        }

        return {
            needsApproval: false,
            response: result.messages[result.messages.length - 1].content,
            threadId
        };
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
            
            // LangGraph streams with 'agent' key containing messages
            const messages = chunk.agent?.messages || chunk.messages;
            
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
        const config = { configurable: { thread_id: threadId } };
        const stream = await this.graph.stream(
            { messages: [{ role: "user", content: message }] },
            config,
            { streamMode: "values" }
        );

        let processedMessageIds = new Set<string>();
        let lastMessageCount = 0;

        for await (const chunk of stream) {
            const messages = chunk.agent?.messages || chunk.messages;
            
            if (!messages || !Array.isArray(messages)) continue;

            // Only process NEW messages (not already seen)
            const newMessages = messages.slice(lastMessageCount);
            lastMessageCount = messages.length;

            for (const msg of newMessages) {
                const msgId = msg.id || `${msg.type}-${JSON.stringify(msg.content).substring(0, 50)}`;
                if (processedMessageIds.has(msgId)) continue;
                processedMessageIds.add(msgId);

                // Handle AI messages
                if (msg.type === 'ai' || msg._getType?.() === 'ai') {
                    // Extract content (can be string or array)
                    let textContent = '';
                    let toolCalls: any[] = [];

                    if (Array.isArray(msg.content)) {
                        for (const block of msg.content) {
                            if (block.type === 'text') {
                                textContent += block.text;
                            } else if (block.type === 'tool_use') {
                                toolCalls.push({
                                    id: block.id,
                                    name: block.name,
                                    args: typeof block.input === 'string' ? JSON.parse(block.input) : block.input
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

                    // Emit thinking event (text before tool calls or final answer)
                    if (textContent) {
                        // Remove "Thought:" and "Final Answer:" prefixes
                        let cleanText = textContent
                            .replace(/^Thought:\s*/i, '')
                            .replace(/^Final Answer:\s*/i, '');

                        if (cleanText.trim()) {
                            yield {
                                type: 'thinking' as const,
                                data: { content: cleanText.trim() }
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

                // Handle Tool messages (results)
                if (msg.type === 'tool' || msg._getType?.() === 'tool') {
                    const result = typeof msg.content === 'string' ? JSON.parse(msg.content) : msg.content;
                    
                    // Check if it's activities data (for UI component)
                    if (msg.name === 'search_tours_activities' && result.success && result.data) {
                        yield {
                            type: 'ui_component' as const,
                            data: {
                                component: 'ActivityList',
                                props: {
                                    activities: result.data,
                                    totalAvailable: result.meta?.totalAvailable || result.data.length
                                }
                            }
                        };
                    } else {
                        // Generic tool result
                        yield {
                            type: 'tool_result' as const,
                            data: {
                                toolName: msg.name,
                                toolCallId: msg.tool_call_id,
                                result: result,
                                summary: this.summarizeToolResult(msg.name, result)
                            }
                        };
                    }
                }
            }
        }
    }

    /**
     * Create a human-readable summary of tool results
     */
    private summarizeToolResult(toolName: string, result: any): string {
        if (!result || !result.success) return 'No results found';

        switch (toolName) {
            case 'search_cities':
                return `Found ${result.data?.length || 0} cities`;
            case 'search_tours_activities':
                return `Found ${result.meta?.totalAvailable || result.data?.length || 0} activities`;
            case 'search_hotels':
                return `Found ${result.data?.length || 0} hotels`;
            case 'search_flights':
                return `Found ${result.data?.length || 0} flights`;
            default:
                return 'Results received';
        }
    }

    getTools() {
        return this.tools;
    }
}

const agent = MyFirstAgent.getInstance();
export default agent;
export { MyFirstAgent };