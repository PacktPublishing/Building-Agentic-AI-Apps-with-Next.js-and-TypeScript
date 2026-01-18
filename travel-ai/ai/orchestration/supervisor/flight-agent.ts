/**
 * Flight Specialist Agent
 *
 * Specialized agent for handling flight searches and recommendations.
 * Part of the Supervisor multi-agent architecture.
 */

import { ChatAnthropic } from '@langchain/anthropic'
import { createAgent } from 'langchain'
import { DynamicStructuredTool } from '@langchain/core/tools'
import { z } from 'zod'
import { config } from '../../../config'
import { getMcpTools } from '../../tools/mcp-client'

const FLIGHT_AGENT_PROMPT = `You are a Flight Specialist Agent, an expert in finding and recommending flights.

Your responsibilities:
1. Search for flights based on user criteria (origin, destination, dates, class)
2. Analyze flight options considering price, duration, and stops
3. Provide clear recommendations with pros and cons
4. Handle complex itineraries (multi-city, connections)

When searching for flights:
- Always confirm the departure and arrival cities/airports
- Consider both direct and connecting flights
- Factor in the user's budget and preferences
- Mention important details like baggage allowances and layover times

Format your responses clearly with:
- Flight options with key details (airline, times, duration, price)
- Your recommendation based on value/convenience
- Any important notes or warnings

You have access to the search_flights tool to find available flights.
Always be helpful and provide actionable information.`

/**
 * Create the Flight Specialist Agent
 */
export async function createFlightAgent() {
  const model = new ChatAnthropic({
    apiKey: config.anthropic_api_key,
    model: config.model_name,
    temperature: 0.3,
  })

  // Get MCP tools and filter for flight-related ones
  const allMcpTools = await getMcpTools()
  const flightTools = allMcpTools.filter(
    (tool) => tool.name === 'search_flights' || tool.name === 'search_cities'
  )

  // Add a summary tool for the agent to report back to supervisor
  const reportResultsTool = new DynamicStructuredTool({
    name: 'report_flight_results',
    description:
      'Report the flight search results back to the supervisor with a summary',
    schema: z.object({
      summary: z
        .string()
        .describe('A brief summary of the flight search results'),
      bestOption: z
        .string()
        .optional()
        .describe('The recommended flight option'),
      totalOptions: z.number().describe('Total number of flights found'),
      priceRange: z
        .object({
          min: z.number(),
          max: z.number(),
          currency: z.string(),
        })
        .optional()
        .describe('Price range of found flights'),
    }),
    func: async (input) => {
      return JSON.stringify({
        type: 'flight_report',
        ...input,
      })
    },
  })

  const agent = createAgent({
    model,
    tools: [...flightTools, reportResultsTool],
    systemPrompt: FLIGHT_AGENT_PROMPT,
  })

  return {
    agent,
    name: 'FlightAgent',
    description:
      'Specialist agent for searching and recommending flights. Use for any flight-related queries including routes, prices, and schedules.',
  }
}

export type FlightAgent = Awaited<ReturnType<typeof createFlightAgent>>
