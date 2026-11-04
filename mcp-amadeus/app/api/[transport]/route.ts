import { z } from "zod";
// app/api/[transport]/route.ts
import { McpServer, createMcpHandler } from "@modelcontextprotocol/server";
import { AmadeusClient, getAmadeusConfig } from "@/lib/tools/amadeus";
import {
  FlightSearchSchema,
  FlightPriceAnalysisSchema,
  AirportSearchSchema,
  AirlineSearchSchema,
  HotelSearchSchema,
  CitySearchSchema,
  HotelRatingsSchema,
  ToursActivitiesSchema,
} from "@/lib/types/amadeus";
import { NextRequest } from "next/server";
import { createHash, timingSafeEqual } from "node:crypto";
import { ZodError } from "zod";

export const runtime = "nodejs";
export const maxDuration = 60;

// Initialize Amadeus client lazily to avoid errors during build
let amadeus: AmadeusClient | null = null;

function getAmadeusClient() {
  if (!amadeus) {
    const amadeusConfig = getAmadeusConfig();
    amadeus = new AmadeusClient(amadeusConfig);
  }
  return amadeus;
}

// Bearer token authentication middleware
function authenticateRequest(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  const token = /^Bearer ([^\s]+)$/i.exec(authHeader ?? "")?.[1];
  const expectedToken = process.env.MCP_BEARER_TOKEN?.trim();
  if (!token || !expectedToken) return false;
  const suppliedHash = createHash("sha256").update(token).digest();
  const expectedHash = createHash("sha256").update(expectedToken).digest();
  return timingSafeEqual(suppliedHash, expectedHash);
}

function allowsOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (origin === null) return true; // Native MCP clients authenticate without Origin.
  try {
    const parsed = new URL(origin);
    if (
      !["http:", "https:"].includes(parsed.protocol) ||
      parsed.origin !== origin
    )
      return false;
    const allowed = (process.env.MCP_ALLOWED_ORIGINS ?? "")
      .split(",")
      .map((value) => value.trim());
    return allowed.includes(origin);
  } catch {
    return false;
  }
}

function rejection(request: NextRequest): Response | null {
  if (new URL(request.url).pathname !== "/api/mcp")
    return new Response(null, { status: 404 });
  if (!allowsOrigin(request)) return new Response("Forbidden", { status: 403 });
  if (!authenticateRequest(request)) {
    return new Response("Unauthorized", {
      status: 401,
      headers: { "WWW-Authenticate": 'Bearer realm="mcp"' },
    });
  }
  return null;
}

function safeToolFailure(error: unknown) {
  const message =
    error instanceof ZodError
      ? "Invalid tool input"
      : error instanceof Error &&
          error.message === "Amadeus configuration is missing or invalid"
        ? error.message
        : "Travel provider request unavailable";
  return {
    isError: true,
    content: [{ type: "text" as const, text: `Error: ${message}` }],
  };
}

const handler = createMcpHandler(
  () => {
    const server = new McpServer({
      name: "amadeus-travel-http",
      version: "2.0.0",
    });
    // Flight search tool
    server.registerTool(
      "search_flights",
      {
        description:
          "Search for flights between two airports with various filters and options",
        inputSchema: z.object({
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
        }),
      },
      async (params) => {
        try {
          const validatedParams = FlightSearchSchema.parse(params);
          const result =
            await getAmadeusClient().searchFlights(validatedParams);
          const outputStr = JSON.stringify(result);
          return {
            content: [{ type: "text", text: outputStr }],
          };
        } catch (err: unknown) {
          return safeToolFailure(err);
        }
      },
    );

    // Flight price analysis tool
    server.registerTool(
      "analyze_flight_prices",
      {
        description:
          "Get flight price analysis and predictions for a specific route",
        inputSchema: z.object({
          origin: FlightPriceAnalysisSchema.shape.origin,
          destination: FlightPriceAnalysisSchema.shape.destination,
          departureDate: FlightPriceAnalysisSchema.shape.departureDate,
          currency: FlightPriceAnalysisSchema.shape.currency,
        }),
      },
      async (params) => {
        try {
          const validatedParams = FlightPriceAnalysisSchema.parse(params);
          const result =
            await getAmadeusClient().analyzeFlightPrices(validatedParams);
          const outputStr = JSON.stringify(result);
          return {
            content: [{ type: "text", text: outputStr }],
          };
        } catch (err: unknown) {
          return safeToolFailure(err);
        }
      },
    );

    // Airport search tool
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
          const validatedParams = AirportSearchSchema.parse(params);
          const result =
            await getAmadeusClient().searchAirports(validatedParams);
          const outputStr = JSON.stringify(result);
          return {
            content: [{ type: "text", text: outputStr }],
          };
        } catch (err: unknown) {
          return safeToolFailure(err);
        }
      },
    );

    // Airline info tool
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
          const validatedParams = AirlineSearchSchema.parse(params);
          const result =
            await getAmadeusClient().getAirlineInfo(validatedParams);
          const outputStr = JSON.stringify(result);
          return {
            content: [{ type: "text", text: outputStr }],
          };
        } catch (err: unknown) {
          return safeToolFailure(err);
        }
      },
    );

    // Hotel search tool
    server.registerTool(
      "search_hotels",
      {
        description:
          "Search for hotels in a specific city with dates and guest information",
        inputSchema: z.object({
          cityCode: HotelSearchSchema.shape.cityCode,
          checkInDate: HotelSearchSchema.shape.checkInDate,
          checkOutDate: HotelSearchSchema.shape.checkOutDate,
          adults: HotelSearchSchema.shape.adults,
          roomQuantity: HotelSearchSchema.shape.roomQuantity,
          currency: HotelSearchSchema.shape.currency,
          bestRateOnly: HotelSearchSchema.shape.bestRateOnly,
        }),
      },
      async (params) => {
        try {
          const validatedParams = HotelSearchSchema.parse(params);
          const result = await getAmadeusClient().searchHotels(validatedParams);
          const outputStr = JSON.stringify(result);
          return {
            content: [{ type: "text", text: outputStr }],
          };
        } catch (err: unknown) {
          return safeToolFailure(err);
        }
      },
    );

    // City search tool
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
          const validatedParams = CitySearchSchema.parse(params);
          const result = await getAmadeusClient().searchCities(validatedParams);
          const outputStr = JSON.stringify(result);
          return {
            content: [{ type: "text", text: outputStr }],
          };
        } catch (err: unknown) {
          return safeToolFailure(err);
        }
      },
    );

    // Hotel Ratings is keyed by hotel IDs returned by a hotel search.
    server.registerTool(
      "get_hotel_ratings",
      {
        description:
          "Get hotel review sentiment by Amadeus hotel IDs; unavailable ratings return an empty list",
        inputSchema: z.object({
          hotelIds: HotelRatingsSchema.shape.hotelIds,
        }),
      },
      async (params) => {
        try {
          const validatedParams = HotelRatingsSchema.parse(params);
          const result =
            await getAmadeusClient().getHotelRatings(validatedParams);
          const outputStr = JSON.stringify(result);
          return {
            content: [{ type: "text", text: outputStr }],
          };
        } catch (err: unknown) {
          return safeToolFailure(err);
        }
      },
    );

    // Tours and activities tool
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
          const validatedParams = ToursActivitiesSchema.parse(params);
          const result =
            await getAmadeusClient().searchToursActivities(validatedParams);
          const outputStr = JSON.stringify(result);
          return {
            content: [{ type: "text", text: outputStr }],
          };
        } catch (err: unknown) {
          return safeToolFailure(err);
        }
      },
    );
    return server;
  },
  { legacy: "reject" },
);
// Wrapper functions with authentication
async function GET(request: NextRequest) {
  const rejected = rejection(request);
  if (rejected) return rejected;
  return handler.fetch(request);
}

async function POST(request: NextRequest) {
  const rejected = rejection(request);
  if (rejected) return rejected;
  return handler.fetch(request);
}

export { GET, POST };
