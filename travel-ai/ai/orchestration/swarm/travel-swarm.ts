/**
 * Travel Swarm - Multi-Agent System
 *
 * Implements the Swarm pattern from LangGraph where agents can
 * dynamically hand off control to each other based on the conversation context.
 *
 * Architecture:
 * - ResearchAgent: Primary contact, handles searches (default entry point)
 * - BookingAgent: Handles reservations and bookings
 * - PlanningAgent: Creates itineraries and organizes trips
 *
 * Key characteristics:
 * - Agents can directly respond to users (no central coordinator)
 * - Dynamic handoffs based on conversation needs
 * - System remembers which agent was last active
 * - More token-efficient than supervisor pattern
 */

import { createSwarm } from '@langchain/langgraph-swarm'
import { getOrchestrationCheckpointer } from '../../../lib/orchestration/checkpointer'
import { HumanMessage } from '@langchain/core/messages'
import type { RunnableConfig } from '@langchain/core/runnables'
import { createResearchAgent } from './research-agent'
import { createBookingAgent } from './booking-agent'
import { createPlanningAgent } from './planning-agent'

/**
 * Create the Travel Swarm multi-agent system
 */
export async function createTravelSwarm() {
  console.log('[TravelSwarm] Initializing agents...')

  // Create all specialized agents
  const researchAgent = await createResearchAgent()
  const bookingAgent = await createBookingAgent()
  const planningAgent = await createPlanningAgent()

  console.log('[TravelSwarm] Creating swarm workflow...')

  // Create the swarm with all agents
  const workflow = createSwarm({
    agents: [researchAgent, bookingAgent, planningAgent],
    defaultActiveAgent: 'ResearchAgent', // Start with research agent
  })

  // Compile with memory for conversation persistence
  const memory = await getOrchestrationCheckpointer()
  const graph = workflow.compile({ checkpointer: memory })

  console.log('[TravelSwarm] Swarm initialized successfully')

  return {
    graph,
    memory,
    agents: {
      research: researchAgent,
      booking: bookingAgent,
      planning: planningAgent,
    },
  }
}

/**
 * Singleton instance management
 */
let swarmInstance: Awaited<ReturnType<typeof createTravelSwarm>> | null = null

export async function getTravelSwarm() {
  if (!swarmInstance) {
    swarmInstance = await createTravelSwarm()
  }
  return swarmInstance
}

/**
 * Reset the swarm instance (useful for testing)
 */
export function resetTravelSwarm() {
  swarmInstance = null
}

/**
 * Default agent name when no handoff has occurred
 */
const DEFAULT_AGENT = 'ResearchAgent'

/**
 * Execute a query through the swarm
 */
export async function invokeSwarm(
  message: string,
  threadId: string,
  signal?: AbortSignal,
  callbacks?: RunnableConfig['callbacks']
) {
  const { graph } = await getTravelSwarm()

  const result = await graph.invoke(
    { messages: [new HumanMessage(message)] },
    { configurable: { thread_id: threadId }, signal, recursionLimit: 12, callbacks }
  )

  // Get the last message (response from active agent)
  const lastMessage = [...result.messages].reverse().find((message: any) => message._getType?.() === 'ai')
  const response =
    typeof lastMessage?.content === 'string'
      ? lastMessage.content
      : 'No response generated'

  // Get state to determine active agent
  // activeAgent is undefined until a handoff occurs, then use defaultActiveAgent
  const state = await graph.getState({ configurable: { thread_id: threadId } })
  const activeAgent = state.values?.activeAgent || DEFAULT_AGENT

  return {
    response,
    activeAgent,
    messageCount: result.messages.length,
    threadId,
  }
}

/**
 * Stream execution through the swarm
 */
export async function* streamSwarm(
  message: string,
  threadId: string,
  signal?: AbortSignal
) {
  const { graph } = await getTravelSwarm()

  const stream = await graph.stream(
    { messages: [new HumanMessage(message)] },
    {
      configurable: { thread_id: threadId },
      streamMode: 'updates',
      signal,
      recursionLimit: 12,
    }
  )

  let currentActiveAgent = DEFAULT_AGENT

  for await (const update of stream) {
    for (const [nodeName, nodeData] of Object.entries(update)) {
      // Extract relevant information from the update
      const data = nodeData as any

      // Track active agent from handoffs or use node name as agent
      if (data.activeAgent) {
        currentActiveAgent = data.activeAgent
      } else if (nodeName !== '__start__' && nodeName !== '__end__') {
        // The node name is the agent name when processing
        currentActiveAgent = nodeName
      }

      // Extract the last AI message content for the response
      let responseContent = ''
      if (data.messages && Array.isArray(data.messages)) {
        for (let i = data.messages.length - 1; i >= 0; i--) {
          const m = data.messages[i]
          const msgType = m._getType?.() || m.type
          if (msgType === 'ai' && m.content) {
            responseContent =
              typeof m.content === 'string'
                ? m.content
                : Array.isArray(m.content)
                  ? m.content
                      .filter((c: any) => c.type === 'text')
                      .map((c: any) => c.text)
                      .join('')
                  : JSON.stringify(m.content)
            break
          }
        }
      }

      yield {
        node: nodeName,
        activeAgent: currentActiveAgent,
        data: {
          messages: data.messages?.map((m: any) => ({
            type: m._getType?.() || m.type,
            content:
              typeof m.content === 'string'
                ? m.content
                : Array.isArray(m.content)
                  ? m.content
                      .filter((c: any) => c.type === 'text')
                      .map((c: any) => c.text)
                      .join('')
                  : JSON.stringify(m.content),
          })),
          response: responseContent,
        },
        timestamp: new Date().toISOString(),
      }
    }
  }
}

/**
 * Get the current state of a swarm conversation
 */
export async function getSwarmState(threadId: string) {
  const { graph } = await getTravelSwarm()

  const state = await graph.getState({ configurable: { thread_id: threadId } })

  return {
    activeAgent: state.values?.activeAgent,
    messageCount: state.values?.messages?.length || 0,
    lastMessage: state.values?.messages?.[state.values.messages.length - 1],
  }
}

/**
 * Continue a swarm conversation (resume from where it left off)
 */
export async function continueSwarm(message: string, threadId: string) {
  return invokeSwarm(message, threadId)
}

export type TravelSwarm = Awaited<ReturnType<typeof createTravelSwarm>>
