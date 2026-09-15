/**
 * Tools Index
 * 
 * Central export for all agent tools
 */

import { DynamicStructuredTool } from "@langchain/core/tools";

// MCP Client
export { getMcpClient, getMcpTools, closeMcpClient } from "./mcp-client";

// Individual tools
export { getCurrentDateTool } from "./date-tool";
export { searchTripsTool, findSimilarTripsTool, createSearchTripsTool, createSearchTripsToolFromSession, createSearchTripsToolFromRequest, createFindSimilarTripsTool } from "./retrieval-tools";

/**
 * Get all custom tools (non-MCP)
 */
export function getCustomTools(): DynamicStructuredTool[] {
    // Import here to avoid circular dependencies
    const { getCurrentDateTool } = require("./date-tool");
    const { searchTripsTool, findSimilarTripsTool } = require("./retrieval-tools");
    
    return [
        getCurrentDateTool,
        searchTripsTool,
        findSimilarTripsTool,
    ];
}

/**
 * Get all tools (MCP + custom)
 */
export async function getAllTools(): Promise<DynamicStructuredTool[]> {
    const { getMcpTools } = require("./mcp-client");
    
    const mcpTools = await getMcpTools();
    const customTools = getCustomTools();
    
    return [...mcpTools, ...customTools];
}
