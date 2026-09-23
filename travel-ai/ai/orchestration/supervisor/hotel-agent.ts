/**
 * Hotel Specialist Agent
 *
 * Specialized agent for handling hotel searches and recommendations.
 * Part of the Supervisor multi-agent architecture.
 */

import { ChatAnthropic } from '@langchain/anthropic'
import { createAgent } from 'langchain'
import { DynamicStructuredTool } from '@langchain/core/tools'
import { z } from 'zod'
import { config } from '../../../config'
import { getMcpTools } from '../../tools/mcp-client'

const HOTEL_AGENT_PROMPT = `You are a Hotel Specialist Agent, an expert in finding and recommending accommodations.

Your responsibilities:
1. Search for hotels based on user criteria (location, dates, budget, amenities)
2. Analyze hotel options considering price, location, ratings, and facilities
3. Provide clear recommendations based on traveler type (business, leisure, family)
4. Consider proximity to key attractions or business districts

When searching for hotels:
- Understand the purpose of the trip (business, vacation, etc.)
- Consider the neighborhood and accessibility
- Factor in amenities that matter (WiFi, breakfast, pool, etc.)
- Note cancellation policies when relevant

Format your responses clearly with:
- Hotel options with key details (name, location, price, rating)
- Room types and what's included
- Your recommendation based on value and suitability
- Any important notes about the area or hotel

You have access to the search_hotels tool to find available accommodations.
Before finishing, call report_hotel_results once with an accurate summary and the number of results; this structured report is required by the supervisor.
Always be helpful and provide actionable information.`

/**
 * Create the Hotel Specialist Agent
 */
export async function createHotelAgent() {
  const model = new ChatAnthropic({
    apiKey: config.anthropic_api_key,
    model: config.model_name,
    temperature: 0.3,
  })

  // Get MCP tools and filter for hotel-related ones
  const allMcpTools = await getMcpTools()
  const hotelTools = allMcpTools.filter(
    (tool) => tool.name === 'search_hotels' || tool.name === 'search_cities'
  )

  // Add a summary tool for the agent to report back to supervisor
  const reportResultsTool = new DynamicStructuredTool({
    name: 'report_hotel_results',
    description:
      'Report the hotel search results back to the supervisor with a summary',
    schema: z.object({
      summary: z
        .string()
        .describe('A brief summary of the hotel search results'),
      bestOption: z
        .string()
        .optional()
        .describe('The recommended hotel option'),
      totalOptions: z.number().describe('Total number of hotels found'),
      priceRange: z
        .object({
          min: z.number(),
          max: z.number(),
          currency: z.string(),
        })
        .optional()
        .describe('Price range of found hotels'),
      starRatings: z
        .array(z.number())
        .optional()
        .describe('Available star ratings'),
    }),
    func: async (input) => {
      return JSON.stringify({
        type: 'hotel_report',
        ...input,
      })
    },
  })

  const agent = createAgent({
    model,
    tools: [...hotelTools, reportResultsTool],
    systemPrompt: HOTEL_AGENT_PROMPT,
  })

  return {
    agent,
    name: 'HotelAgent',
    description:
      'Specialist agent for searching and recommending hotels and accommodations. Use for any lodging-related queries including availability, prices, and amenities.',
  }
}

export type HotelAgent = Awaited<ReturnType<typeof createHotelAgent>>
