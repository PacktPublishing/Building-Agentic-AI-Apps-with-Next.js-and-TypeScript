import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { AmadeusClient } from "../amadeus/client.js";
import {
  HotelSearchSchema,
  DestinationExperiencesSchema,
} from "../amadeus/schemas.js";

/**
 * Register hotel-related MCP tools on the server.
 */
export function registerHotelTools(
  server: McpServer,
  getClient: () => AmadeusClient,
) {
  // ── search_hotels ────────────────────────────────────────────────────
  server.tool(
    "search_hotels",
    "Search for hotels in a city with dates, guest count, and rate filters",
    {
      cityCode: HotelSearchSchema.shape.cityCode,
      checkInDate: HotelSearchSchema.shape.checkInDate,
      checkOutDate: HotelSearchSchema.shape.checkOutDate,
      adults: HotelSearchSchema.shape.adults,
      roomQuantity: HotelSearchSchema.shape.roomQuantity,
      currency: HotelSearchSchema.shape.currency,
      bestRateOnly: HotelSearchSchema.shape.bestRateOnly,
    },
    async (params) => {
      try {
        const validated = HotelSearchSchema.parse(params);
        const result = await getClient().searchHotels(validated);
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

  // ── get_destination_experiences ──────────────────────────────────────
  server.tool(
    "get_destination_experiences",
    "Get hotel sentiments and experiences for a geographic area",
    {
      north: DestinationExperiencesSchema.shape.north,
      west: DestinationExperiencesSchema.shape.west,
      south: DestinationExperiencesSchema.shape.south,
      east: DestinationExperiencesSchema.shape.east,
    },
    async (params) => {
      try {
        const validated = DestinationExperiencesSchema.parse(params);
        const result =
          await getClient().getDestinationExperiences(validated);
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
