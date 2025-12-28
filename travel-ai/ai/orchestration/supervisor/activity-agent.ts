/**
 * Activity Specialist Agent
 *
 * Specialized agent for handling tours, activities, and experience searches.
 * Part of the Supervisor multi-agent architecture.
 */

import { ChatAnthropic } from "@langchain/anthropic";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { config } from "../../../config";
import { getMcpTools } from "../../tools/mcp-client";

const ACTIVITY_AGENT_PROMPT = `You are an Activity & Experiences Specialist Agent, an expert in finding tours, activities, and local experiences.

Your responsibilities:
1. Search for activities and tours based on user interests and location
2. Recommend experiences that match the traveler's preferences
3. Consider timing, duration, and physical requirements
4. Provide insights about local culture and must-see attractions

When searching for activities:
- Understand the traveler's interests (culture, adventure, relaxation, food)
- Consider the time available and energy levels
- Factor in group size and age ranges
- Note any accessibility requirements

Format your responses clearly with:
- Activity options with key details (name, duration, price, rating)
- What's included in each activity
- Best time to do each activity
- Your recommendation based on the traveler's profile
- Tips for getting the most out of the experience

You have access to the search_tours_activities tool to find available experiences.
Always be helpful and provide actionable information.`;

/**
 * Create the Activity Specialist Agent
 */
export async function createActivityAgent() {
    const model = new ChatAnthropic({
        apiKey: config.anthropic_api_key,
        model: config.model_name,
        temperature: 0.4, // Slightly higher for more creative recommendations
    });

    // Get MCP tools and filter for activity-related ones
    const allMcpTools = await getMcpTools();
    const activityTools = allMcpTools.filter(
        (tool) => tool.name === "search_tours_activities" || tool.name === "search_cities"
    );

    // Add a summary tool for the agent to report back to supervisor
    const reportResultsTool = new DynamicStructuredTool({
        name: "report_activity_results",
        description: "Report the activity search results back to the supervisor with a summary",
        schema: z.object({
            summary: z.string().describe("A brief summary of the activity search results"),
            bestOption: z.string().optional().describe("The recommended activity option"),
            totalOptions: z.number().describe("Total number of activities found"),
            categories: z.array(z.string()).optional().describe("Types of activities found"),
            priceRange: z.object({
                min: z.number(),
                max: z.number(),
                currency: z.string(),
            }).optional().describe("Price range of found activities"),
        }),
        func: async (input) => {
            return JSON.stringify({
                type: "activity_report",
                ...input,
            });
        },
    });

    const agent = createReactAgent({
        llm: model,
        tools: [...activityTools, reportResultsTool],
        messageModifier: ACTIVITY_AGENT_PROMPT,
    });

    return {
        agent,
        name: "ActivityAgent",
        description: "Specialist agent for searching tours, activities, and local experiences. Use for any queries about things to do, attractions, tours, and entertainment.",
    };
}

export type ActivityAgent = Awaited<ReturnType<typeof createActivityAgent>>;
