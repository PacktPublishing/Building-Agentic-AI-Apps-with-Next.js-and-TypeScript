import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/server";
import { AmadeusClient } from "../amadeus/client.js";
import {
  HotelSearchFields,
  HotelSearchSchema,
  HotelRatingsSchema,
} from "../amadeus/schemas.js";
import { toolFailure } from "./tool-result.js";

/**
 * Register hotel-related MCP tools on the server.
 */
export function registerHotelTools(
  server: McpServer,
  getClient: () => AmadeusClient,
) {
  // ── search_hotels ────────────────────────────────────────────────────
  server.registerTool(
    "search_hotels",
    {
      description:
        "Search for hotels in a city with dates, guest count, and rate filters",
      inputSchema: z.object({
        cityCode: HotelSearchFields.shape.cityCode,
        checkInDate: HotelSearchFields.shape.checkInDate,
        checkOutDate: HotelSearchFields.shape.checkOutDate,
        adults: HotelSearchFields.shape.adults,
        roomQuantity: HotelSearchFields.shape.roomQuantity,
        currency: HotelSearchFields.shape.currency,
        bestRateOnly: HotelSearchFields.shape.bestRateOnly,
      }),
    },
    async (params) => {
      try {
        const validated = HotelSearchSchema.parse(params);
        const result = await getClient().searchHotels(validated);
        return {
          content: [{ type: "text" as const, text: JSON.stringify(result) }],
        };
      } catch (err: unknown) {
        return toolFailure(err, "Hotel search");
      }
    },
  );

  // ── get_hotel_ratings ─────────────────────────────────────────────────
  server.registerTool(
    "get_hotel_ratings",
    {
      description:
        "Get available review sentiment ratings for one to three Amadeus hotel IDs",
      inputSchema: z.object({
        hotelIds: HotelRatingsSchema.shape.hotelIds,
      }),
    },
    async (params) => {
      try {
        const validated = HotelRatingsSchema.parse(params);
        const result = await getClient().getHotelRatings(validated);
        return {
          content: [{ type: "text" as const, text: JSON.stringify(result) }],
        };
      } catch (err: unknown) {
        return toolFailure(err, "Hotel ratings lookup");
      }
    },
  );
}
