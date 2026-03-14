import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { AmadeusClient } from "../amadeus/client.js";
import {
  FlightSearchSchema,
  FlightPriceAnalysisSchema,
} from "../amadeus/schemas.js";

/**
 * Register flight-related MCP tools on the server.
 *
 * Each tool follows the same pattern:
 * 1. Validate input with Zod
 * 2. Delegate to AmadeusClient
 * 3. Return a JSON-RPC compliant MCP response
 * 4. Catch errors and return them as text (never throw from a handler)
 */
export function registerFlightTools(
  server: McpServer,
  getClient: () => AmadeusClient,
) {
  // ── search_flights ───────────────────────────────────────────────────
  server.tool(
    "search_flights",
    "Search for flights between two airports with filters (dates, class, stops, price)",
    {
      origin: FlightSearchSchema.shape.origin,
      destination: FlightSearchSchema.shape.destination,
      departureDate: FlightSearchSchema.shape.departureDate,
      returnDate: FlightSearchSchema.shape.returnDate,
      adults: FlightSearchSchema.shape.adults,
      children: FlightSearchSchema.shape.children,
      infants: FlightSearchSchema.shape.infants,
      travelClass: FlightSearchSchema.shape.travelClass,
      nonStop: FlightSearchSchema.shape.nonStop,
      maxPrice: FlightSearchSchema.shape.maxPrice,
      currency: FlightSearchSchema.shape.currency,
    },
    async (params) => {
      try {
        const validated = FlightSearchSchema.parse(params);
        const result = await getClient().searchFlights(validated);
        return {
          content: [{ type: "text" as const, text: JSON.stringify(result) }],
        };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return {
          content: [{ type: "text" as const, text: `Error: ${msg}` }],
        };
      }
    },
  );

  // ── analyze_flight_prices ────────────────────────────────────────────
  server.tool(
    "analyze_flight_prices",
    "Get flight price metrics and predictions for a specific route",
    {
      origin: FlightPriceAnalysisSchema.shape.origin,
      destination: FlightPriceAnalysisSchema.shape.destination,
      departureDate: FlightPriceAnalysisSchema.shape.departureDate,
      currency: FlightPriceAnalysisSchema.shape.currency,
    },
    async (params) => {
      try {
        const validated = FlightPriceAnalysisSchema.parse(params);
        const result = await getClient().analyzeFlightPrices(validated);
        return {
          content: [{ type: "text" as const, text: JSON.stringify(result) }],
        };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return {
          content: [{ type: "text" as const, text: `Error: ${msg}` }],
        };
      }
    },
  );
}
