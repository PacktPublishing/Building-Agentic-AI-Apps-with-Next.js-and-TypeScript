// app/api/[transport]/route.ts
import { createMcpHandler } from "mcp-handler";
import { AmadeusClient, getAmadeusConfig } from "@/lib/tools/amadeus";
import {
  FlightSearchSchema,
  FlightPriceAnalysisSchema,
  AirportSearchSchema,
  AirlineSearchSchema,
  HotelSearchSchema,
  CitySearchSchema,
  DestinationExperiencesSchema,
  ToursActivitiesSchema,
} from "@/lib/types/amadeus";
import { NextRequest } from "next/server";

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
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return false;
  }
  
  const token = authHeader.substring(7); // Remove "Bearer " prefix
  const expectedToken = process.env.MCP_BEARER_TOKEN;
  
  if (!expectedToken) {
    console.warn("MCP_BEARER_TOKEN not configured - authentication disabled");
    return true; // Allow access if no token is configured
  }
  
  return token === expectedToken;
}

const handler = createMcpHandler(
  (server) => {
    // Flight search tool
    server.tool(
      "search_flights",
      "Search for flights between two airports with various filters and options",
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
          const validatedParams = FlightSearchSchema.parse(params);
          const result = await getAmadeusClient().searchFlights(validatedParams);
          const outputStr = JSON.stringify(result);
          return {
            content: [
              { type: "text", text: outputStr },
            ],
          };
        } catch (err: unknown) {
          return {
            content: [
              { type: "text", text: "Error: " + String(err) },
            ],
          };
        }
      }
    );

    // Flight price analysis tool
    server.tool(
      "analyze_flight_prices",
      "Get flight price analysis and predictions for a specific route",
      {
        origin: FlightPriceAnalysisSchema.shape.origin,
        destination: FlightPriceAnalysisSchema.shape.destination,
        departureDate: FlightPriceAnalysisSchema.shape.departureDate,
        currency: FlightPriceAnalysisSchema.shape.currency,
      },
      async (params) => {
        try {
          const validatedParams = FlightPriceAnalysisSchema.parse(params);
          const result = await getAmadeusClient().analyzeFlightPrices(validatedParams);
          const outputStr = JSON.stringify(result);
          return {
            content: [
              { type: "text", text: outputStr },
            ],
          };
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          return {
            content: [
              { type: "text", text: "Error: " + msg },
            ],
          };
        }
      }
    );

    // Airport search tool
    server.tool(
      "search_airports",
      "Search for airports by name, city, or IATA code",
      {
        keyword: AirportSearchSchema.shape.keyword,
        countryCode: AirportSearchSchema.shape.countryCode,
      },
      async (params) => {
        try {
          const validatedParams = AirportSearchSchema.parse(params);
          const result = await getAmadeusClient().searchAirports(validatedParams);
          const outputStr = JSON.stringify(result);
          return {
            content: [
              { type: "text", text: outputStr },
            ],
          };
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          return {
            content: [
              { type: "text", text: "Error: " + msg },
            ],
          };
        }
      }
    );

    // Airline info tool
    server.tool(
      "get_airline_info",
      "Get information about airlines by their IATA codes",
      {
        airlineCodes: AirlineSearchSchema.shape.airlineCodes,
      },
      async (params) => {
        try {
          const validatedParams = AirlineSearchSchema.parse(params);
          const result = await getAmadeusClient().getAirlineInfo(validatedParams);
          const outputStr = JSON.stringify(result);
          return {
            content: [
              { type: "text", text: outputStr },
            ],
          };
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          return {
            content: [
              { type: "text", text: "Error: " + msg },
            ],
          };
        }
      }
    );

    // Hotel search tool
    server.tool(
      "search_hotels",
      "Search for hotels in a specific city with dates and guest information",
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
          const validatedParams = HotelSearchSchema.parse(params);
          const result = await getAmadeusClient().searchHotels(validatedParams);
          const outputStr = JSON.stringify(result);
          return {
            content: [
              { type: "text", text: outputStr },
            ],
          };
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          return {
            content: [
              { type: "text", text: "Error: " + msg },
            ],
          };
        }
      }
    );

    // City search tool
    server.tool(
      "search_cities",
      "Search for cities by name or IATA code",
      {
        keyword: CitySearchSchema.shape.keyword,
        countryCode: CitySearchSchema.shape.countryCode,
      },
      async (params) => {
        try {
          const validatedParams = CitySearchSchema.parse(params);
          const result = await getAmadeusClient().searchCities(validatedParams);
          const outputStr = JSON.stringify(result);
          return {
            content: [
              { type: "text", text: outputStr },
            ],
          };
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          return {
            content: [
              { type: "text", text: "Error: " + msg },
            ],
          };
        }
      }
    );

    // Destination experiences tool
    server.tool(
      "get_destination_experiences",
      "Get destination experiences and hotel sentiments for a geographic area",
      {
        north: DestinationExperiencesSchema.shape.north,
        west: DestinationExperiencesSchema.shape.west,
        south: DestinationExperiencesSchema.shape.south,
        east: DestinationExperiencesSchema.shape.east,
      },
      async (params) => {
        try {
          const validatedParams = DestinationExperiencesSchema.parse(params);
          const result = await getAmadeusClient().getDestinationExperiences(validatedParams);
          const outputStr = JSON.stringify(result);
          return {
            content: [
              { type: "text", text: outputStr },
            ],
          };
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          return {
            content: [
              { type: "text", text: "Error: " + msg },
            ],
          };
        }
      }
    );

    // Tours and activities tool
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
          const validatedParams = ToursActivitiesSchema.parse(params);
          const result = await getAmadeusClient().searchToursActivities(validatedParams);
          const outputStr = JSON.stringify(result);
          return {
            content: [
              { type: "text", text: outputStr },
            ],
          };
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          return {
            content: [
              { type: "text", text: "Error: " + msg },
            ],
          };
        }
      }
    );
  },
  {
    // Optional server options

  },
  {
    basePath: "/api", // this needs to match where the [transport] is located.
    maxDuration: 60,
    verboseLogs: true,
  }
);
// Wrapper functions with authentication
async function GET(request: NextRequest) {
  if (!authenticateRequest(request)) {
    return new Response(
      JSON.stringify({ 
        jsonrpc: "2.0", 
        error: { 
          code: -32001, 
          message: "Unauthorized - Bearer token required" 
        } 
      }),
      { 
        status: 401, 
        headers: { "Content-Type": "application/json" } 
      }
    );
  }
  return handler(request);
}

async function POST(request: NextRequest) {
  if (!authenticateRequest(request)) {
    return new Response(
      JSON.stringify({ 
        jsonrpc: "2.0", 
        error: { 
          code: -32001, 
          message: "Unauthorized - Bearer token required" 
        } 
      }),
      { 
        status: 401, 
        headers: { "Content-Type": "application/json" } 
      }
    );
  }
  return handler(request);
}

export { GET, POST };