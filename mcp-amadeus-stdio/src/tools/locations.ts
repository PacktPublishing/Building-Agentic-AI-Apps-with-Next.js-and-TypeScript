import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/server";
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
  server.registerTool(
    "search_airports",
    {
      description: "Search for airports by name, city, or IATA code",
      inputSchema: z.object({
        keyword: AirportSearchSchema.shape.keyword,
        countryCode: AirportSearchSchema.shape.countryCode,
      }),
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
  server.registerTool(
    "get_airline_info",
    {
      description: "Get information about airlines by their IATA codes",
      inputSchema: z.object({
        airlineCodes: AirlineSearchSchema.shape.airlineCodes,
      }),
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
  server.registerTool(
    "search_cities",
    {
      description: "Search for cities by name or IATA code",
      inputSchema: z.object({
        keyword: CitySearchSchema.shape.keyword,
        countryCode: CitySearchSchema.shape.countryCode,
      }),
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
  server.registerTool(
    "search_tours_activities",
    {
      description: "Search for tours and activities near a specific location",
      inputSchema: z.object({
        latitude: ToursActivitiesSchema.shape.latitude,
        longitude: ToursActivitiesSchema.shape.longitude,
        radius: ToursActivitiesSchema.shape.radius,
      }),
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
