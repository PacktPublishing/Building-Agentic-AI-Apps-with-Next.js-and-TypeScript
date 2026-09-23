/**
 * Booking Agent for Travel Swarm
 *
 * Specialized in handling reservations and bookings.
 * Receives handoffs from ResearchAgent when user wants to book.
 */

import { ChatAnthropic } from '@langchain/anthropic'
import { createReactAgent } from '@langchain/langgraph/prebuilt'
import { createHandoffTool } from '@langchain/langgraph-swarm'
import { DynamicStructuredTool } from '@langchain/core/tools'
import { z } from 'zod'
import { config } from '../../../config'

const BOOKING_AGENT_PROMPT = `You are the Booking Agent for a demo. Every booking tool is a simulation and creates no real reservation. Never imply a real reservation exists.

Your role:
1. Confirm booking details with the traveler
2. Process reservations for flights, hotels, and activities
3. Provide booking confirmations and important details
4. Handle modifications and cancellations

When handling bookings:
- Always confirm all details before proceeding
- Provide clear pricing breakdowns
- Mention important policies (cancellation, baggage, check-in times)
- Give confirmation numbers and next steps

Hand off scenarios:
- "I need more options" → ResearchAgent (for more searches)
- "Help me plan the rest of my trip" → PlanningAgent
- "What else can I do there?" → ResearchAgent

Be precise and thorough with booking details.`

/**
 * Create the Booking Agent with handoff capabilities
 */
export async function createBookingAgent() {
  const model = new ChatAnthropic({
    apiKey: config.anthropic_api_key,
    model: config.model_name,
    temperature: 0.2, // Lower temperature for precise booking operations
  })

  // Create handoff tools
  const handoffToResearch = createHandoffTool({
    agentName: 'ResearchAgent',
    description:
      'Transfer back to Research Agent when the user needs to search for more options or has new travel queries.',
  })

  const handoffToPlanning = createHandoffTool({
    agentName: 'PlanningAgent',
    description:
      'Transfer to Planning Agent when the user needs help organizing their booked items into an itinerary.',
  })

  // Booking simulation tools
  const confirmFlightBookingTool = new DynamicStructuredTool({
    name: 'confirm_flight_booking',
    description: 'Simulate a flight booking; no real reservation is made',
    schema: z.object({
      flightId: z.string().describe('The flight offer ID'),
      passengers: z
        .array(
          z.object({
            firstName: z.string(),
            lastName: z.string(),
            email: z.string().email(),
          })
        )
        .describe('Passenger details'),
      paymentMethod: z.string().describe('Payment method reference'),
    }),
    func: async (input) => {
      // Simulate booking confirmation
      const confirmationNumber = `FL${Date.now().toString(36).toUpperCase()}`
      return JSON.stringify({
        success: true,
        simulated: true,
        confirmationNumber,
        flightId: input.flightId,
        passengers: input.passengers.length,
        message: `Simulated flight booking only. Demo reference: ${confirmationNumber}`,
      })
    },
  })

  const confirmHotelBookingTool = new DynamicStructuredTool({
    name: 'confirm_hotel_booking',
    description: 'Simulate a hotel booking; no real reservation is made',
    schema: z.object({
      hotelId: z.string().describe('The hotel ID'),
      checkIn: z.string().describe('Check-in date'),
      checkOut: z.string().describe('Check-out date'),
      guestName: z.string().describe('Primary guest name'),
      roomType: z.string().describe('Room type'),
      specialRequests: z.string().optional().describe('Special requests'),
    }),
    func: async (input) => {
      const confirmationNumber = `HT${Date.now().toString(36).toUpperCase()}`
      return JSON.stringify({
        success: true,
        simulated: true,
        confirmationNumber,
        hotelId: input.hotelId,
        checkIn: input.checkIn,
        checkOut: input.checkOut,
        message: `Simulated hotel booking only. Demo reference: ${confirmationNumber}`,
      })
    },
  })

  const confirmActivityBookingTool = new DynamicStructuredTool({
    name: 'confirm_activity_booking',
    description: 'Simulate an activity booking; no real reservation is made',
    schema: z.object({
      activityId: z.string().describe('The activity ID'),
      date: z.string().describe('Activity date'),
      participants: z.number().describe('Number of participants'),
      contactEmail: z.string().email().describe('Contact email'),
    }),
    func: async (input) => {
      const confirmationNumber = `AC${Date.now().toString(36).toUpperCase()}`
      return JSON.stringify({
        success: true,
        simulated: true,
        confirmationNumber,
        activityId: input.activityId,
        date: input.date,
        participants: input.participants,
        message: `Simulated activity booking only. Demo reference: ${confirmationNumber}`,
      })
    },
  })

  const agent = createReactAgent({
    llm: model,
    tools: [
      handoffToResearch,
      handoffToPlanning,
      confirmFlightBookingTool,
      confirmHotelBookingTool,
      confirmActivityBookingTool,
    ],
    messageModifier: BOOKING_AGENT_PROMPT,
    name: 'BookingAgent',
  })

  return agent
}

export type BookingAgent = Awaited<ReturnType<typeof createBookingAgent>>
