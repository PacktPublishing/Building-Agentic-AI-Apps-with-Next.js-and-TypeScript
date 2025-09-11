import Amadeus from "amadeus";
import { z } from "zod";
import {
  FlightSearchParams,
  FlightPriceAnalysisParams,
  AirportSearchParams,
  AirlineSearchParams,
  HotelSearchParams,
  CitySearchParams,
  DestinationExperiencesParams,
  ToursActivitiesParams,
} from "../types/amadeus";

// Amadeus API response schema
export const AmadeusResponseSchema = z.object({
  data: z.array(z.unknown()),
  meta: z.record(z.unknown()).optional(),
  dictionaries: z.record(z.unknown()).optional(),
});

export type AmadeusResponse = z.infer<typeof AmadeusResponseSchema>;

// Amadeus client configuration schema
export const AmadeusConfigSchema = z.object({
  clientId: z.string(),
  clientSecret: z.string(),
  hostname: z.enum(["test", "production"]),
});

export type AmadeusConfig = z.infer<typeof AmadeusConfigSchema>;

// Type for Amadeus client with proper method signatures
type AmadeusClientType = Amadeus & {
  referenceData: {
    locations: {
      get(params: Record<string, unknown>): Promise<AmadeusResponse>;
      airports: {
        get(params: Record<string, unknown>): Promise<AmadeusResponse>;
      };
      hotels: {
        byCity: {
          get(params: Record<string, unknown>): Promise<AmadeusResponse>;
        };
      };
    };
    airlines: {
      get(params: Record<string, unknown>): Promise<AmadeusResponse>;
    };
  };
  shopping: {
    flightOffersSearch: {
      get(params: Record<string, unknown>): Promise<AmadeusResponse>;
    };
    hotelOffersSearch: {
      get(params: Record<string, unknown>): Promise<AmadeusResponse>;
    };
    activities: {
      get(params: Record<string, unknown>): Promise<AmadeusResponse>;
    };
  };
  analytics: {
    itineraryPriceMetrics: {
      get(params: Record<string, unknown>): Promise<AmadeusResponse>;
    };
  };
  ereputation: {
    hotelSentiments: {
      get(params: Record<string, unknown>): Promise<AmadeusResponse>;
    };
  };
};

export class AmadeusClient {
  private client: AmadeusClientType;

  constructor(config: AmadeusConfig) {
    // Validate config with Zod
    const validatedConfig = AmadeusConfigSchema.parse(config);
    
    this.client = new Amadeus({
      clientId: validatedConfig.clientId,
      clientSecret: validatedConfig.clientSecret,
      hostname: validatedConfig.hostname,
    }) as AmadeusClientType;
  }

  async searchFlights(params: FlightSearchParams) {
    try {
      const searchParams: Record<string, unknown> = {
        originLocationCode: params.origin,
        destinationLocationCode: params.destination,
        departureDate: params.departureDate,
        adults: params.adults,
        children: params.children,
        infants: params.infants,
        travelClass: params.travelClass,
        nonStop: params.nonStop,
        currencyCode: params.currency,
      };

      if (params.returnDate) {
        searchParams.returnDate = params.returnDate;
      }

      if (params.maxPrice) {
        searchParams.maxPrice = params.maxPrice;
      }

      const response = await this.client.shopping.flightOffersSearch.get(searchParams);

      return {
        success: true,
        data: response.data,
        meta: response.meta,
        dictionaries: response.dictionaries,
      };
    } catch (error) {
      console.error("Flight search error:", error);
      
      // Handle Amadeus API specific errors
      if (error && typeof error === 'object' && 'response' in error) {
        const amadeusError = error as { response?: { result?: { errors?: Array<{ title: string; detail: string }> } } };
        const errorDetails = amadeusError.response?.result?.errors?.[0];
        if (errorDetails) {
          throw new Error(`Flight search failed: ${errorDetails.title} - ${errorDetails.detail}`);
        }
      }
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Flight search failed: ${errorMessage}`);
    }
  }

  async analyzeFlightPrices(params: FlightPriceAnalysisParams) {
    try {
      const response = await this.client.analytics.itineraryPriceMetrics.get({
        originIataCode: params.origin,
        destinationIataCode: params.destination,
        departureDate: params.departureDate,
        currencyCode: params.currency,
      });

      return {
        success: true,
        data: response.data,
        meta: response.meta,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Flight price analysis failed: ${errorMessage}`);
    }
  }

  async searchAirports(params: AirportSearchParams) {
    try {
      const searchParams: Record<string, unknown> = {
        keyword: params.keyword,
        subType: "AIRPORT",
        "page[limit]": 10,
      };

      if (params.countryCode) {
        searchParams.countryCode = params.countryCode;
      }

      const response = await this.client.referenceData.locations.get(searchParams);

      return {
        success: true,
        data: response.data,
        meta: response.meta,
      };
    } catch (error) {
      console.error("Airport search error:", error);
      
      // Handle Amadeus API specific errors
      if (error && typeof error === 'object' && 'response' in error) {
        const amadeusError = error as { response?: { result?: { errors?: Array<{ title: string; detail: string }> } } };
        const errorDetails = amadeusError.response?.result?.errors?.[0];
        if (errorDetails) {
          throw new Error(`Airport search failed: ${errorDetails.title} - ${errorDetails.detail}`);
        }
      }
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Airport search failed: ${errorMessage}`);
    }
  }

  async getAirlineInfo(params: AirlineSearchParams) {
    try {
      const airlineCodes = params.airlineCodes.split(",").map((code) => code.trim());

      const response = await this.client.referenceData.airlines.get({
        airlineCodes: airlineCodes.join(","),
      });

      return {
        success: true,
        data: response.data,
        meta: response.meta,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Airline info search failed: ${errorMessage}`);
    }
  }

  async searchHotels(params: HotelSearchParams) {
    try {
      // First, get hotel IDs for the city using the correct API path
      const hotelListResponse = await this.client.referenceData.locations.hotels.byCity.get({
        cityCode: params.cityCode,
      });

      if (!hotelListResponse.data || hotelListResponse.data.length === 0) {
        return {
          success: true,
          data: [],
          meta: { count: 0 },
        };
      }

      // Take first 10 hotels for the search
      const hotels = hotelListResponse.data as Array<{ hotelId: string }>;
      const hotelIds = hotels.slice(0, 10).map((hotel) => hotel.hotelId).join(',');

      // Then search for offers using hotel IDs
      const response = await this.client.shopping.hotelOffersSearch.get({
        hotelIds,
        adults: params.adults,
        checkInDate: params.checkInDate,
        checkOutDate: params.checkOutDate,
        roomQuantity: params.roomQuantity,
        currency: params.currency,
        bestRateOnly: params.bestRateOnly,
      });

      return {
        success: true,
        data: response.data,
        meta: response.meta,
      };
    } catch (error) {
      console.error("Hotel search error:", error);
      
      // Handle Amadeus API specific errors
      if (error && typeof error === 'object' && 'response' in error) {
        const amadeusError = error as { response?: { result?: { errors?: Array<{ title: string; detail: string }> } } };
        const errorDetails = amadeusError.response?.result?.errors?.[0];
        if (errorDetails) {
          throw new Error(`Hotel search failed: ${errorDetails.title} - ${errorDetails.detail}`);
        }
      }
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Hotel search failed: ${errorMessage}`);
    }
  }

  async searchCities(params: CitySearchParams) {
    try {
      const searchParams: Record<string, unknown> = {
        keyword: params.keyword,
        subType: "CITY",
        "page[limit]": 10,
      };

      if (params.countryCode) {
        searchParams.countryCode = params.countryCode;
      }

      const response = await this.client.referenceData.locations.get(searchParams);

      return {
        success: true,
        data: response.data,
        meta: response.meta,
      };
    } catch (error) {
      console.error("City search error:", error);
      
      // Handle Amadeus API specific errors
      if (error && typeof error === 'object' && 'response' in error) {
        const amadeusError = error as { response?: { result?: { errors?: Array<{ title: string; detail: string }> } } };
        const errorDetails = amadeusError.response?.result?.errors?.[0];
        if (errorDetails) {
          throw new Error(`City search failed: ${errorDetails.title} - ${errorDetails.detail}`);
        }
      }
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`City search failed: ${errorMessage}`);
    }
  }

  async getDestinationExperiences(params: DestinationExperiencesParams) {
    try {
      // Use the correct API endpoint for hotel sentiments
      const response = await this.client.ereputation.hotelSentiments.get({
        north: params.north,
        west: params.west,
        south: params.south,
        east: params.east,
      });

      return {
        success: true,
        data: response.data,
        meta: response.meta,
      };
    } catch (error) {
      console.error("Destination experiences error:", error);
      
      // Handle Amadeus API specific errors
      if (error && typeof error === 'object' && 'response' in error) {
        const amadeusError = error as { response?: { result?: { errors?: Array<{ title: string; detail: string }> } } };
        const errorDetails = amadeusError.response?.result?.errors?.[0];
        if (errorDetails) {
          throw new Error(`Destination experiences failed: ${errorDetails.title} - ${errorDetails.detail}`);
        }
      }
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Destination experiences failed: ${errorMessage}`);
    }
  }

  async searchToursActivities(params: ToursActivitiesParams) {
    try {
      const response = await this.client.shopping.activities.get({
        latitude: params.latitude,
        longitude: params.longitude,
        radius: params.radius,
      });

      return {
        success: true,
        data: response.data,
        meta: response.meta,
      };
    } catch (error) {
      console.error("Tours and activities search error:", error);
      
      // Handle Amadeus API specific errors
      if (error && typeof error === 'object' && 'response' in error) {
        const amadeusError = error as { response?: { result?: { errors?: Array<{ title: string; detail: string }> } } };
        const errorDetails = amadeusError.response?.result?.errors?.[0];
        if (errorDetails) {
          throw new Error(`Tours and activities search failed: ${errorDetails.title} - ${errorDetails.detail}`);
        }
      }
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Tours and activities search failed: ${errorMessage}`);
    }
  }
}

// Helper function to get Amadeus config from environment
export function getAmadeusConfig(): AmadeusConfig {
  const clientId = process.env.AMADEUS_CLIENT_ID || "test_client_id";
  const clientSecret = process.env.AMADEUS_CLIENT_SECRET || "test_client_secret";
  const hostname = process.env.AMADEUS_HOSTNAME === "test.api.amadeus.com" ? "test" : 
                   process.env.AMADEUS_HOSTNAME === "production" ? "production" : "test";

  const config = {
    clientId,
    clientSecret,
    hostname: hostname as "test" | "production",
  };

  // Validate config with Zod
  const validatedConfig = AmadeusConfigSchema.parse(config);

  console.log("Amadeus Config:", { 
    clientId: validatedConfig.clientId ? `${validatedConfig.clientId.substring(0, 4)}...` : "undefined",
    clientSecret: validatedConfig.clientSecret ? `${validatedConfig.clientSecret.substring(0, 4)}...` : "undefined",
    hostname: validatedConfig.hostname 
  });

  // For demo purposes, allow test values
  if (validatedConfig.clientId === "test_client_id" || validatedConfig.clientSecret === "test_client_secret") {
    console.warn("⚠️  Using test credentials - API calls will fail. Please configure real Amadeus credentials.");
  }

  return validatedConfig;
}
