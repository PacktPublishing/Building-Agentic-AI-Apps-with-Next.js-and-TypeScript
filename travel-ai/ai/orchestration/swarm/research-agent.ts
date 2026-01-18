/**
 * Research Agent for Travel Swarm
 *
 * Specialized in gathering information about destinations, travel options,
 * and providing recommendations. First point of contact in the swarm.
 */

import { ChatAnthropic } from '@langchain/anthropic'
import { createReactAgent } from '@langchain/langgraph/prebuilt'
import { createHandoffTool } from '@langchain/langgraph-swarm'
import { DynamicStructuredTool } from '@langchain/core/tools'
import { z } from 'zod'
import { config } from '../../../config'
import { getMcpTools } from '../../tools/mcp-client'

const RESEARCH_AGENT_PROMPT = `You are the Research Agent, the primary contact for travelers seeking information.

Your role:
1. Understand what the traveler is looking for
2. Search for flights, hotels, and activities as needed
3. Provide comprehensive information about options
4. Hand off to specialized agents when appropriate:
   - Hand off to BookingAgent when the user wants to proceed with a booking
   - Hand off to PlanningAgent when the user needs help creating an itinerary

You have access to search tools for flights, hotels, and activities.

When to hand off:
- "I want to book this" → BookingAgent
- "Help me plan my trip" → PlanningAgent
- "Create an itinerary" → PlanningAgent
- "Reserve this hotel" → BookingAgent

Always be helpful and proactive in suggesting options.`

/**
 * Create the Research Agent with handoff capabilities
 */
export async function createResearchAgent() {
  const model = new ChatAnthropic({
    apiKey: config.anthropic_api_key,
    model: config.model_name,
    temperature: 0.4,
  })

  // Get all MCP tools for research
  const mcpTools = await getMcpTools()

  // Create handoff tools
  const handoffToBooking = createHandoffTool({
    agentName: 'BookingAgent',
    description:
      'Transfer to the Booking Agent when the user wants to make a reservation or book flights, hotels, or activities.',
  })

  const handoffToPlanning = createHandoffTool({
    agentName: 'PlanningAgent',
    description:
      'Transfer to the Planning Agent when the user needs help creating a trip itinerary or organizing their travel schedule.',
  })

  // Summary tool for tracking research findings
  const saveResearchTool = new DynamicStructuredTool({
    name: 'save_research_findings',
    description: 'Save research findings for later reference by other agents',
    schema: z.object({
      category: z.enum(['flights', 'hotels', 'activities', 'general']),
      findings: z.string().describe('Summary of research findings'),
      recommendations: z.array(z.string()).describe('Top recommendations'),
    }),
    func: async (input) => {
      console.log('[ResearchAgent] Saving findings:', input.category)
      return JSON.stringify({ saved: true, ...input })
    },
  })

  const agent = createReactAgent({
    llm: model,
    tools: [...mcpTools, handoffToBooking, handoffToPlanning, saveResearchTool],
    messageModifier: RESEARCH_AGENT_PROMPT,
    name: 'ResearchAgent',
  })

  return agent
}

export type ResearchAgent = Awaited<ReturnType<typeof createResearchAgent>>
