import { ChatOpenAI } from "@langchain/openai";
import { MemorySaver } from "@langchain/langgraph";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { MultiServerMCPClient } from "@langchain/mcp-adapters"; 
import type { DynamicStructuredTool } from "@langchain/core/tools";
import { config } from "../../config";

class MyFirstAgent {
    private model: ChatOpenAI;
    private tools: DynamicStructuredTool[];
    private memory: MemorySaver;
    private graph: any;
    private mcpClient: MultiServerMCPClient | null = null;
    private isInitialized: boolean = false;

    // Singleton
    private static instance: MyFirstAgent;

    private constructor() {
        this.model = new ChatOpenAI({
            apiKey: config.openai_api_key,
            model: config.model_name || "gpt-4.1-mini",
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
            content: m.content?.substring(0, 100),
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
                content: m.content?.substring(0, 100),
                hasToolCalls: !!m.tool_calls
            })));
        }
        
        // Find the last AI message with content
        for (let i = result.messages.length - 1; i >= 0; i--) {
            const msg = result.messages[i];
            if ((msg.type === 'ai' || msg._getType?.() === 'ai') && msg.content) {
                console.log('Found AI message with content:', msg.content.substring(0, 100));
                return msg.content;
            }
        }
        
        // Fallback
        console.log('No AI message found, returning last message');
        return result.messages[result.messages.length - 1].content || '';
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
            config
        );

        for await (const chunk of stream) {
            if (chunk.agent?.messages) {
                for (const msg of chunk.agent.messages) {
                    if (msg.content) {
                        yield msg.content;
                    }
                }
            }
        }
    }

    getTools() {
        return this.tools;
    }
}

const agent = MyFirstAgent.getInstance();
export default agent;
export { MyFirstAgent };