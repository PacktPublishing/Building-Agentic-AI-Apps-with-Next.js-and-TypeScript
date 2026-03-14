import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

/**
 * Register reusable prompt templates on the MCP server.
 *
 * Prompts are pre-authored message sequences that an MCP client can
 * request and inject into the conversation.  They standardise how
 * the LLM is instructed to use the available travel tools.
 */
export function registerTravelPrompts(server: McpServer) {
  // ── plan_trip ──────────────────────────────────────────────────────────
  server.prompt(
    "plan_trip",
    "Plan a complete trip including flights, hotels, and activities",
    {
      origin: z.string().describe("Departure city or IATA airport code"),
      destination: z.string().describe("Destination city or IATA airport code"),
      departureDate: z.string().describe("Departure date (YYYY-MM-DD)"),
      returnDate: z.string().describe("Return date (YYYY-MM-DD)"),
      travelers: z.string().optional().describe("Number of travelers (default: 1)"),
      budget: z.string().optional().describe("Approximate budget and currency (e.g. '2000 USD')"),
    },
    async (args) => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: [
              `Plan a complete trip from ${args.origin} to ${args.destination}.`,
              `Departure: ${args.departureDate} | Return: ${args.returnDate}`,
              args.travelers ? `Travelers: ${args.travelers}` : "",
              args.budget ? `Budget: approximately ${args.budget}` : "",
              "",
              "Please:",
              "1. Search for the best flight options and compare prices.",
              "2. Find hotels in the destination city for those dates.",
              "3. Suggest tours and activities near the destination.",
              "4. Provide a day-by-day itinerary with estimated costs.",
              "5. Analyze whether current flight prices are a good deal.",
            ]
              .filter(Boolean)
              .join("\n"),
          },
        },
      ],
    }),
  );

  // ── compare_flights ────────────────────────────────────────────────────
  server.prompt(
    "compare_flights",
    "Compare flight options between two cities with price analysis",
    {
      origin: z.string().describe("Departure IATA airport code"),
      destination: z.string().describe("Arrival IATA airport code"),
      date: z.string().describe("Travel date (YYYY-MM-DD)"),
    },
    async (args) => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: [
              `Compare all available flights from ${args.origin} to ${args.destination} on ${args.date}.`,
              "",
              "For each option, show:",
              "- Airline and flight number",
              "- Departure and arrival times (with duration)",
              "- Number of stops",
              "- Price",
              "",
              "Then run a price analysis on this route to tell me whether",
              "these prices are above or below the historical average.",
            ].join("\n"),
          },
        },
      ],
    }),
  );

  // ── explore_destination ────────────────────────────────────────────────
  server.prompt(
    "explore_destination",
    "Discover what a destination has to offer: hotels, activities, and local tips",
    {
      city: z.string().describe("Destination city name or IATA code"),
    },
    async (args) => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: [
              `I want to explore ${args.city} as a travel destination.`,
              "",
              "Please:",
              "1. Look up the city to confirm the IATA code and country.",
              "2. Search for available hotels and highlight a few options across price ranges.",
              "3. Find tours and activities near the city center.",
              "4. Summarise destination experiences and traveler sentiments if available.",
              "5. Give me a short overview of why this destination is worth visiting.",
            ].join("\n"),
          },
        },
      ],
    }),
  );
}
