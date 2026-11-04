/**
 * MCP Client Singleton
 *
 * Manages the stateless MCP adapter for external tool integrations
 */

import { MCPAdapter } from '@langchain/mcp-adapters'
import { config } from '../../config'
import { validateFeature } from '@/lib/config/feature-env'

let mcpClientInstance: MCPAdapter | null = null

/**
 * Get or create the MCP client singleton
 */
export async function getMcpClient(): Promise<MCPAdapter> {
  validateFeature('chat')
  if (!mcpClientInstance) {
    mcpClientInstance = new MCPAdapter({
      prefixToolNameWithServerName: false,
      servers: {
        amadeus: {
          transport: 'http',
          mode: 'modern',
          url: config.amadeus_url,
          headers: {
            Authorization: `Bearer ${config.amadeus_bearer_token}`,
          },
        },
      },
    })
  }
  return mcpClientInstance
}

/**
 * Get tools from MCP servers
 */
export async function getMcpTools() {
  const client = await getMcpClient()
  return client.listTools()
}

/**
 * Close the MCP client connection
 */
export async function closeMcpClient(): Promise<void> {
  if (mcpClientInstance) {
    await mcpClientInstance.close()
    mcpClientInstance = null
  }
}
