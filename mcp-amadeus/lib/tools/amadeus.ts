import Amadeus from "amadeus";
import { z } from "zod";
import {
  FlightSearchParams,
  FlightPriceAnalysisParams,
  AirportSearchParams,
  AirlineSearchParams,
  HotelSearchParams,
  CitySearchParams,
  HotelRatingsParams,
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
  clientId: z.string().trim().min(1),
  clientSecret: z.string().trim().min(1),
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

  constructor(config: AmadeusConfig, sdk?: AmadeusClientType) {
    // Validate config with Zod
    const validatedConfig = AmadeusConfigSchema.parse(config);
    
    this.client = sdk ?? new Amadeus({
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
    } catch {
      throw new Error("Flight search unavailable");
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
    } catch {
      throw new Error("Flight price analysis unavailable");
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
    } catch {
      throw new Error("Airport search unavailable");
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
    } catch {
      throw new Error("Airline lookup unavailable");
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
    } catch {
      throw new Error("Hotel search unavailable");
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
    } catch {
      throw new Error("City search unavailable");
    }
  }

  async getHotelRatings(params: HotelRatingsParams) {
    try {
      const response = await this.client.ereputation.hotelSentiments.get({
        hotelIds: params.hotelIds.join(","),
      });

      return {
        success: true,
        data: response.data ?? [],
        status: response.data?.length ? "available" : "unavailable",
        meta: response.meta,
      };
    } catch {
      throw new Error("Hotel ratings unavailable");
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
    } catch {
      throw new Error("Tours and activities search unavailable");
    }
  }
}

// Helper function to get Amadeus config from environment
export function getAmadeusConfig(): AmadeusConfig {
  const host = process.env.AMADEUS_HOSTNAME?.trim() || "test";
  const hostname = host === "test.api.amadeus.com" ? "test"
    : host === "api.amadeus.com" ? "production" : host;
  const parsed = AmadeusConfigSchema.safeParse({
    clientId: process.env.AMADEUS_CLIENT_ID,
    clientSecret: process.env.AMADEUS_CLIENT_SECRET,
    hostname,
  });
  if (!parsed.success) throw new Error("Amadeus configuration is missing or invalid");
  return parsed.data;
}
