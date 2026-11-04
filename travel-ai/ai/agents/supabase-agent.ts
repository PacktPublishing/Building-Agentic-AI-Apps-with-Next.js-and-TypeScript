import { ChatAnthropic } from "@langchain/anthropic";
import { MemorySaver } from "@langchain/langgraph";
import { createAgent } from "langchain";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { config } from "../../config";
import { z } from "zod";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";

class SupabaseAgent {
    private model: ChatAnthropic;
    private tools: DynamicStructuredTool[] = [];
    private memory: MemorySaver;
    private graph: any;
    private mcpClient: Client | null = null;
    private isInitialized: boolean = false;

    // Singleton
    private static instance: SupabaseAgent;

    private constructor() {
        this.model = new ChatAnthropic({
            apiKey: config.anthropic_api_key,
            model: config.model_name || "claude-sonnet-4-5",
            streaming: false,
            temperature: 0,
            tags: ["supabase-agent", "database"],
        });

        this.memory = new MemorySaver();
        this.graph = null;
    }

    static getInstance(): SupabaseAgent {
        if (!SupabaseAgent.instance) {
            SupabaseAgent.instance = new SupabaseAgent();
        }
        return SupabaseAgent.instance;
    }

    /**
     * Initialize the MCP client and load tools
     */
    async initialize(): Promise<void> {
        if (this.isInitialized) {
            console.warn("Supabase Agent already initialized");
            return;
        }

        // Créer le client MCP avec stdio transport
        this.mcpClient = new Client({
            name: "supabase-agent",
            version: "1.0.0"
        }, {
            capabilities: {},
            versionNegotiation: { mode: "auto" }
        });

        // Configurer le transport stdio
        const transport = new StdioClientTransport({
            command: "npx",
            args: [
                "-y",
                "@supabase/mcp-server-supabase@latest",
                "--access-token",
                config.supabase_access_token
            ],
        });

        // Connecter le client
        await this.mcpClient.connect(transport);

        // Récupérer les outils disponibles
        const toolsResponse = await this.mcpClient.listTools();

        // Convertir les outils MCP en DynamicStructuredTool LangChain
        this.tools = toolsResponse.tools.map((tool: any) =>
            new DynamicStructuredTool({
                name: tool.name,
                description: tool.description || `Tool: ${tool.name}`,
                schema: this.parseToolSchema(tool.inputSchema),
                func: async (input: any) => {
                    const result = await this.mcpClient!.callTool({
                        name: tool.name,
                        arguments: input
                    });
                    return JSON.stringify(result.content);
                }
            })
        );

        // Créer l'agent simple
        this.graph = createAgent({
            model: this.model,
            tools: this.tools,
            checkpointer: this.memory,
            systemPrompt: "You are a Supabase database assistant. Help users query and manage their Supabase database. Be precise and always verify operations before executing mutations."
        });

        this.isInitialized = true;
        console.log(`Supabase Agent initialized with ${this.tools.length} tools`);
    }

    /**
     * Parse MCP tool schema to Zod schema
     */
    private parseToolSchema(inputSchema: any): z.ZodObject<any> {
        if (!inputSchema || !inputSchema.properties) {
            return z.object({});
        }

        const shape: Record<string, z.ZodTypeAny> = {};

        for (const [key, value] of Object.entries(inputSchema.properties)) {
            const prop = value as any;

            // Type de base
            if (prop.type === "string") {
                shape[key] = z.string();
            } else if (prop.type === "number") {
                shape[key] = z.number();
            } else if (prop.type === "boolean") {
                shape[key] = z.boolean();
            } else if (prop.type === "array") {
                shape[key] = z.array(z.unknown());
            } else {
                shape[key] = z.unknown();
            }

            // Optionnel
            if (!inputSchema.required || !inputSchema.required.includes(key)) {
                shape[key] = shape[key].optional();
            }
        }

        return z.object(shape);
    }

    /**
     * Ensure the agent is initialized
     */
    private ensureInitialized(): void {
        if (!this.isInitialized || !this.graph) {
            throw new Error("Supabase Agent not initialized. Call initialize() first.");
        }
    }

    /**
     * Invoke the agent with a message
     */
    async invoke(message: string, threadId: string = "default"): Promise<string> {
        this.ensureInitialized();

        const config = {
            configurable: { thread_id: threadId },
            tags: ["supabase-agent", "database", `thread:${threadId}`],
            metadata: {
                thread_id: threadId,
                agent_type: "supabase"
            }
        };

        // Invocation simple
        const result = await this.graph.invoke(
            { messages: [{ role: "user", content: message }] },
            config
        );

        // Extraction de la réponse
        const lastMsg = result.messages[result.messages.length - 1];

        if (lastMsg.type === 'ai' || lastMsg._getType?.() === 'ai') {
            const content = typeof lastMsg.content === 'string'
                ? lastMsg.content
                : Array.isArray(lastMsg.content)
                    ? lastMsg.content.map((c: any) => c.text || JSON.stringify(c)).join('')
                    : JSON.stringify(lastMsg.content);

            return content;
        }

        return typeof lastMsg.content === 'string'
            ? lastMsg.content
            : JSON.stringify(lastMsg.content) || '';
    }

    /**
     * Get available tools
     */
    getTools(): DynamicStructuredTool[] {
        return this.tools;
    }

    /**
     * Get conversation state
     */
    async getState(threadId: string = "default") {
        this.ensureInitialized();
        const config = { configurable: { thread_id: threadId } };
        const state = await this.graph.getState(config);
        return state;
    }

    /**
     * Close MCP connection
     */
    async close(): Promise<void> {
        if (this.mcpClient) {
            await this.mcpClient.close();
            this.isInitialized = false;
            console.log("Supabase Agent closed");
        }
    }
}

const supabaseAgent = SupabaseAgent.getInstance();
export default supabaseAgent;
export { SupabaseAgent };
