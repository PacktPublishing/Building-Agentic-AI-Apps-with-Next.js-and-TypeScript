import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { AmadeusClient } from "../amadeus/client.js";
import {
  FlightSearchFields,
  FlightSearchSchema,
  FlightPriceAnalysisSchema,
} from "../amadeus/schemas.js";
import { toolFailure } from "./tool-result.js";

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
      origin: FlightSearchFields.shape.origin,
      destination: FlightSearchFields.shape.destination,
      departureDate: FlightSearchFields.shape.departureDate,
      returnDate: FlightSearchFields.shape.returnDate,
      adults: FlightSearchFields.shape.adults,
      children: FlightSearchFields.shape.children,
      infants: FlightSearchFields.shape.infants,
      travelClass: FlightSearchFields.shape.travelClass,
      nonStop: FlightSearchFields.shape.nonStop,
      maxPrice: FlightSearchFields.shape.maxPrice,
      currency: FlightSearchFields.shape.currency,
    },
    async (params) => {
      try {
        const validated = FlightSearchSchema.parse(params);
        const result = await getClient().searchFlights(validated);
        return {
          content: [{ type: "text" as const, text: JSON.stringify(result) }],
        };
      } catch (err: unknown) {
        return toolFailure(err, "Flight search");
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
        return toolFailure(err, "Flight price analysis");
      }
    },
  );
}
