/**
 * Minimal ambient type declarations for the `amadeus` npm package,
 * which does not ship its own TypeScript types.
 */
declare module "amadeus" {
  interface AmadeusConfig {
    clientId: string;
    clientSecret: string;
    hostname?: string;
  }

  interface AmadeusResponse {
    data: unknown;
    meta?: unknown;
    dictionaries?: unknown;
    result: {
      statusCode: number;
    };
  }

  interface AmadeusAPI {
    get: (params?: Record<string, unknown>) => Promise<AmadeusResponse>;
    post: (params?: Record<string, unknown>) => Promise<AmadeusResponse>;
  }

  class Amadeus {
    constructor(config: AmadeusConfig);

    shopping: {
      flightOffersSearch: AmadeusAPI;
    };
    analytics: {
      itineraryPriceMetrics: AmadeusAPI;
    };
    referenceData: {
      locations: AmadeusAPI & {
        cities: AmadeusAPI;
      };
      airlines: AmadeusAPI;
    };
    shopping: {
      flightOffersSearch: AmadeusAPI;
      activities: AmadeusAPI;
    };
    e2e: {
      hotelSearch: AmadeusAPI;
    };
  }

  export default Amadeus;
}
