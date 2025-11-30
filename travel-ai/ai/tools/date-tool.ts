/**
 * Date Tool
 * 
 * Provides current date information to agents
 */

import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";

/**
 * Tool that returns the current date with various formats
 */
export const getCurrentDateTool = new DynamicStructuredTool({
    name: "get_current_date",
    description: "Returns the current date with day, month, and year. Use this tool when you need to know today's date.",
    schema: z.object({}),
    func: async () => {
        const now = new Date();
        return JSON.stringify({
            day: now.getDate(),
            month: now.getMonth() + 1,
            year: now.getFullYear(),
            formatted: now.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            }),
            iso: now.toISOString()
        });
    }
});
