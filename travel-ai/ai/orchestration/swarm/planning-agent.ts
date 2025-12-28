/**
 * Planning Agent for Travel Swarm
 *
 * Specialized in creating trip itineraries and organizing travel plans.
 * Receives handoffs when users need help structuring their trip.
 */

import { ChatAnthropic } from "@langchain/anthropic";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { createHandoffTool } from "@langchain/langgraph-swarm";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { config } from "../../../config";

const PLANNING_AGENT_PROMPT = `You are the Planning Agent, specialized in creating comprehensive travel itineraries.

Your role:
1. Help travelers organize their trips day by day
2. Create balanced itineraries considering travel time and energy
3. Suggest optimal ordering of activities
4. Account for opening hours, travel between locations, and rest time

When creating itineraries:
- Consider the traveler's pace preferences (relaxed vs. packed)
- Group nearby activities together
- Include meal suggestions and breaks
- Note any timing constraints (tours, reservations)
- Provide practical tips for each day

Hand off scenarios:
- "I need to find flights/hotels" → ResearchAgent
- "Book this itinerary" → BookingAgent
- "Search for more activities" → ResearchAgent

Be creative but practical with your planning.`;

/**
 * Create the Planning Agent with handoff capabilities
 */
export async function createPlanningAgent() {
    const model = new ChatAnthropic({
        apiKey: config.anthropic_api_key,
        model: config.model_name,
        temperature: 0.5, // Balanced for creative yet practical planning
    });

    // Create handoff tools
    const handoffToResearch = createHandoffTool({
        agentName: "ResearchAgent",
        description: "Transfer to Research Agent when the user needs to search for flights, hotels, activities, or needs more travel options.",
    });

    const handoffToBooking = createHandoffTool({
        agentName: "BookingAgent",
        description: "Transfer to Booking Agent when the user is ready to book items from their itinerary.",
    });

    // Planning tools
    const createItineraryTool = new DynamicStructuredTool({
        name: "create_itinerary",
        description: "Create a structured day-by-day itinerary",
        schema: z.object({
            tripName: z.string().describe("Name for this trip"),
            destination: z.string().describe("Main destination"),
            startDate: z.string().describe("Trip start date"),
            endDate: z.string().describe("Trip end date"),
            days: z.array(z.object({
                dayNumber: z.number(),
                date: z.string(),
                theme: z.string().describe("Day theme (e.g., 'Cultural Exploration')"),
                activities: z.array(z.object({
                    time: z.string(),
                    activity: z.string(),
                    location: z.string(),
                    duration: z.string(),
                    notes: z.string().optional(),
                })),
                meals: z.object({
                    breakfast: z.string().optional(),
                    lunch: z.string().optional(),
                    dinner: z.string().optional(),
                }).optional(),
            })).describe("Day-by-day breakdown"),
            tips: z.array(z.string()).optional().describe("General trip tips"),
        }),
        func: async (input) => {
            const itineraryId = `IT${Date.now().toString(36).toUpperCase()}`;
            return JSON.stringify({
                success: true,
                itineraryId,
                ...input,
                message: `Itinerary "${input.tripName}" created successfully!`,
            });
        },
    });

    const suggestDayPlanTool = new DynamicStructuredTool({
        name: "suggest_day_plan",
        description: "Suggest activities for a specific day based on preferences",
        schema: z.object({
            date: z.string().describe("The date to plan"),
            destination: z.string().describe("Location/city"),
            preferences: z.array(z.string()).describe("User preferences (culture, food, adventure, etc.)"),
            bookedItems: z.array(z.string()).optional().describe("Already booked items to include"),
            pace: z.enum(["relaxed", "moderate", "packed"]).describe("Desired pace of the day"),
        }),
        func: async (input) => {
            // Simulate day plan suggestion
            const suggestions = {
                relaxed: [
                    { time: "09:00", activity: "Leisurely breakfast at local café" },
                    { time: "11:00", activity: "Main attraction visit" },
                    { time: "14:00", activity: "Lunch and rest" },
                    { time: "17:00", activity: "Evening stroll and dinner" },
                ],
                moderate: [
                    { time: "08:00", activity: "Breakfast" },
                    { time: "09:30", activity: "Morning attraction" },
                    { time: "12:30", activity: "Lunch" },
                    { time: "14:00", activity: "Afternoon activity" },
                    { time: "17:00", activity: "Free time / Shopping" },
                    { time: "19:30", activity: "Dinner" },
                ],
                packed: [
                    { time: "07:00", activity: "Early breakfast" },
                    { time: "08:00", activity: "First attraction" },
                    { time: "10:30", activity: "Second attraction" },
                    { time: "12:30", activity: "Quick lunch" },
                    { time: "13:30", activity: "Afternoon tour" },
                    { time: "16:30", activity: "Cultural experience" },
                    { time: "19:00", activity: "Dinner experience" },
                    { time: "21:00", activity: "Evening activity" },
                ],
            };

            return JSON.stringify({
                date: input.date,
                destination: input.destination,
                pace: input.pace,
                suggestedSchedule: suggestions[input.pace],
                tips: [
                    "Book popular attractions in advance",
                    "Keep some flexibility for spontaneous discoveries",
                    "Stay hydrated and take breaks as needed",
                ],
            });
        },
    });

    const optimizeItineraryTool = new DynamicStructuredTool({
        name: "optimize_itinerary",
        description: "Optimize an itinerary for efficiency and enjoyment",
        schema: z.object({
            activities: z.array(z.object({
                name: z.string(),
                location: z.string(),
                preferredTime: z.string().optional(),
                duration: z.string(),
            })).describe("List of activities to optimize"),
            constraints: z.object({
                startTime: z.string(),
                endTime: z.string(),
                mustInclude: z.array(z.string()).optional(),
            }).describe("Time and other constraints"),
        }),
        func: async (input) => {
            // Simulate optimization
            return JSON.stringify({
                optimized: true,
                activities: input.activities.map((a, i) => ({
                    ...a,
                    suggestedOrder: i + 1,
                    suggestedTime: `${9 + i * 2}:00`,
                })),
                estimatedTotalTime: `${input.activities.length * 2} hours`,
                suggestions: [
                    "Activities grouped by proximity",
                    "Buffer time added between activities",
                    "Peak hours avoided for popular spots",
                ],
            });
        },
    });

    const agent = createReactAgent({
        llm: model,
        tools: [
            handoffToResearch,
            handoffToBooking,
            createItineraryTool,
            suggestDayPlanTool,
            optimizeItineraryTool,
        ],
        messageModifier: PLANNING_AGENT_PROMPT,
        name: "PlanningAgent",
    });

    return agent;
}

export type PlanningAgent = Awaited<ReturnType<typeof createPlanningAgent>>;
