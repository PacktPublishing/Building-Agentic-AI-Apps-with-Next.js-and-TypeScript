import Amadeus from "amadeus";
import { z } from "zod";
import type {
  FlightSearchParams,
  FlightPriceAnalysisParams,
  AirportSearchParams,
  AirlineSearchParams,
  HotelSearchParams,
  CitySearchParams,
  HotelRatingsParams,
  ToursActivitiesParams,
} from "./schemas.js";

// ─── Configuration ─────────────────────────────────────────────────────

const AmadeusConfigSchema = z.object({
  clientId: z.string().min(1, "AMADEUS_CLIENT_ID is required"),
  clientSecret: z.string().min(1, "AMADEUS_CLIENT_SECRET is required"),
  hostname: z.enum(["test", "production"]),
});

export class AmadeusConfigurationError extends Error {
  constructor() {
    super("Amadeus credentials are not configured");
    this.name = "AmadeusConfigurationError";
  }
}

export type AmadeusConfig = z.infer<typeof AmadeusConfigSchema>;

// ─── Amadeus SDK Type Extension ────────────────────────────────────────

type AmadeusResponse = {
  data: unknown[];
  meta?: Record<string, unknown>;
  dictionaries?: Record<string, unknown>;
};

type AmadeusClientType = Amadeus & {
  referenceData: {
    locations: {
      get(params: Record<string, unknown>): Promise<AmadeusResponse>;
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

// ─── Error Handling Helper ─────────────────────────────────────────────

function extractAmadeusError(error: unknown, context: string): string {
  if (error && typeof error === "object" && "response" in error) {
    const amadeusError = error as {
      response?: {
        result?: { errors?: Array<{ title: string; detail: string }> };
      };
    };
    const errorDetails = amadeusError.response?.result?.errors?.[0];
    if (errorDetails) {
      return `${context}: ${errorDetails.title} - ${errorDetails.detail}`;
    }
  }
  const message = error instanceof Error ? error.message : String(error);
  return `${context}: ${message}`;
}

// ─── AmadeusClient Class ───────────────────────────────────────────────

export class AmadeusClient {
  private client: AmadeusClientType;

  constructor(config: AmadeusConfig, sdk?: AmadeusClientType) {
    const validated = AmadeusConfigSchema.parse(config);
    this.client = sdk ?? new Amadeus({
      clientId: validated.clientId,
      clientSecret: validated.clientSecret,
      hostname: validated.hostname,
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
      if (params.returnDate) searchParams.returnDate = params.returnDate;
      if (params.maxPrice) searchParams.maxPrice = params.maxPrice;

      const response =
        await this.client.shopping.flightOffersSearch.get(searchParams);
      return { success: true, data: response.data, meta: response.meta, dictionaries: response.dictionaries };
    } catch (error) {
      throw new Error(extractAmadeusError(error, "Flight search failed"));
    }
  }

  async analyzeFlightPrices(params: FlightPriceAnalysisParams) {
    try {
      const response =
        await this.client.analytics.itineraryPriceMetrics.get({
          originIataCode: params.origin,
          destinationIataCode: params.destination,
          departureDate: params.departureDate,
          currencyCode: params.currency,
        });
      return { success: true, data: response.data, meta: response.meta };
    } catch (error) {
      throw new Error(
        extractAmadeusError(error, "Flight price analysis failed"),
      );
    }
  }

  async searchAirports(params: AirportSearchParams) {
    try {
      const searchParams: Record<string, unknown> = {
        keyword: params.keyword,
        subType: "AIRPORT",
        "page[limit]": 10,
      };
      if (params.countryCode) searchParams.countryCode = params.countryCode;

      const response =
        await this.client.referenceData.locations.get(searchParams);
      return { success: true, data: response.data, meta: response.meta };
    } catch (error) {
      throw new Error(extractAmadeusError(error, "Airport search failed"));
    }
  }

  async getAirlineInfo(params: AirlineSearchParams) {
    try {
      const codes = params.airlineCodes
        .split(",")
        .map((c) => c.trim())
        .join(",");
      const response = await this.client.referenceData.airlines.get({
        airlineCodes: codes,
      });
      return { success: true, data: response.data, meta: response.meta };
    } catch (error) {
      throw new Error(
        extractAmadeusError(error, "Airline info lookup failed"),
      );
    }
  }

  async searchHotels(params: HotelSearchParams) {
    try {
      // Step 1: get hotel IDs for the city
      const hotelList =
        await this.client.referenceData.locations.hotels.byCity.get({
          cityCode: params.cityCode,
        });

      if (!hotelList.data || hotelList.data.length === 0) {
        return { success: true, data: [], meta: { count: 0 } };
      }

      // Step 2: search offers for the first 10 hotels
      const hotels = hotelList.data as Array<{ hotelId: string }>;
      const hotelIds = hotels
        .slice(0, 10)
        .map((h) => h.hotelId)
        .join(",");

      const response = await this.client.shopping.hotelOffersSearch.get({
        hotelIds,
        adults: params.adults,
        checkInDate: params.checkInDate,
        checkOutDate: params.checkOutDate,
        roomQuantity: params.roomQuantity,
        currency: params.currency,
        bestRateOnly: params.bestRateOnly,
      });
      return { success: true, data: response.data, meta: response.meta };
    } catch (error) {
      throw new Error(extractAmadeusError(error, "Hotel search failed"));
    }
  }

  async searchCities(params: CitySearchParams) {
    try {
      const searchParams: Record<string, unknown> = {
        keyword: params.keyword,
        subType: "CITY",
        "page[limit]": 10,
      };
      if (params.countryCode) searchParams.countryCode = params.countryCode;

      const response =
        await this.client.referenceData.locations.get(searchParams);
      return { success: true, data: response.data, meta: response.meta };
    } catch (error) {
      throw new Error(extractAmadeusError(error, "City search failed"));
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
    } catch (error) {
      throw new Error(
        extractAmadeusError(error, "Hotel ratings lookup failed"),
      );
    }
  }

  async searchToursActivities(params: ToursActivitiesParams) {
    try {
      const response = await this.client.shopping.activities.get({
        latitude: params.latitude,
        longitude: params.longitude,
        radius: params.radius,
      });
      return { success: true, data: response.data, meta: response.meta };
    } catch (error) {
      throw new Error(
        extractAmadeusError(error, "Tours & activities search failed"),
      );
    }
  }
}

// ─── Factory ───────────────────────────────────────────────────────────

export function getAmadeusConfig(): AmadeusConfig {
  const hostname =
    process.env.AMADEUS_HOSTNAME === "production" ? "production" : "test";

  const parsed = AmadeusConfigSchema.safeParse({
    clientId: process.env.AMADEUS_CLIENT_ID,
    clientSecret: process.env.AMADEUS_CLIENT_SECRET,
    hostname,
  });
  if (!parsed.success) throw new AmadeusConfigurationError();
  return parsed.data;
}
