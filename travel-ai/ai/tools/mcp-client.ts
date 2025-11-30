/**
 * MCP Client Singleton
 * 
 * Manages the Multi-Server MCP Client for external tool integrations
 */

import { MultiServerMCPClient } from "@langchain/mcp-adapters";
import { config } from "../../config";

let mcpClientInstance: MultiServerMCPClient | null = null;

/**
 * Get or create the MCP client singleton
 */
export async function getMcpClient(): Promise<MultiServerMCPClient> {
    if (!mcpClientInstance) {
        mcpClientInstance = new MultiServerMCPClient({
            amadeus: {
                transport: "http",
                url: config.amadeus_url,
                headers: {
                    "Authorization": `Bearer ${config.amadeus_bearer_token}`
                }
            },
        });
    }
    return mcpClientInstance;
}

/**
 * Get tools from MCP servers
 */
export async function getMcpTools() {
    const client = await getMcpClient();
    return client.getTools();
}

/**
 * Close the MCP client connection
 */
export async function closeMcpClient(): Promise<void> {
    if (mcpClientInstance) {
        await mcpClientInstance.close();
        mcpClientInstance = null;
    }
}
