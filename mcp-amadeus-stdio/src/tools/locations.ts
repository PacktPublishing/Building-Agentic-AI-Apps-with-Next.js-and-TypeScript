import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { AmadeusClient } from "../amadeus/client.js";
import {
  AirportSearchSchema,
  AirlineSearchSchema,
  CitySearchSchema,
  ToursActivitiesSchema,
} from "../amadeus/schemas.js";
import { toolFailure } from "./tool-result.js";

/**
 * Register location & reference-data MCP tools on the server.
 */
export function registerLocationTools(
  server: McpServer,
  getClient: () => AmadeusClient,
) {
  // ── search_airports ──────────────────────────────────────────────────
  server.tool(
    "search_airports",
    "Search for airports by name, city, or IATA code",
    {
      keyword: AirportSearchSchema.shape.keyword,
      countryCode: AirportSearchSchema.shape.countryCode,
    },
    async (params) => {
      try {
        const validated = AirportSearchSchema.parse(params);
        const result = await getClient().searchAirports(validated);
        return {
          content: [{ type: "text" as const, text: JSON.stringify(result) }],
        };
      } catch (err: unknown) {
        return toolFailure(err, "Airport search");
      }
    },
  );

  // ── get_airline_info ─────────────────────────────────────────────────
  server.tool(
    "get_airline_info",
    "Get information about airlines by their IATA codes",
    {
      airlineCodes: AirlineSearchSchema.shape.airlineCodes,
    },
    async (params) => {
      try {
        const validated = AirlineSearchSchema.parse(params);
        const result = await getClient().getAirlineInfo(validated);
        return {
          content: [{ type: "text" as const, text: JSON.stringify(result) }],
        };
      } catch (err: unknown) {
        return toolFailure(err, "Airline lookup");
      }
    },
  );

  // ── search_cities ────────────────────────────────────────────────────
  server.tool(
    "search_cities",
    "Search for cities by name or IATA code",
    {
      keyword: CitySearchSchema.shape.keyword,
      countryCode: CitySearchSchema.shape.countryCode,
    },
    async (params) => {
      try {
        const validated = CitySearchSchema.parse(params);
        const result = await getClient().searchCities(validated);
        return {
          content: [{ type: "text" as const, text: JSON.stringify(result) }],
        };
      } catch (err: unknown) {
        return toolFailure(err, "City search");
      }
    },
  );

  // ── search_tours_activities ──────────────────────────────────────────
  server.tool(
    "search_tours_activities",
    "Search for tours and activities near a specific location",
    {
      latitude: ToursActivitiesSchema.shape.latitude,
      longitude: ToursActivitiesSchema.shape.longitude,
      radius: ToursActivitiesSchema.shape.radius,
    },
    async (params) => {
      try {
        const validated = ToursActivitiesSchema.parse(params);
        const result = await getClient().searchToursActivities(validated);
        return {
          content: [{ type: "text" as const, text: JSON.stringify(result) }],
        };
      } catch (err: unknown) {
        return toolFailure(err, "Activities search");
      }
    },
  );
}
