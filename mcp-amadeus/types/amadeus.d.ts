declare module 'amadeus' {
  interface AmadeusConfig {
    clientId: string;
    clientSecret: string;
    hostname?: string;
  }

  interface AmadeusResponse {
    data: unknown;
    meta?: unknown;
    dictionaries?: unknown;
  }

  interface AmadeusClient {
    shopping: {
      flightOffersSearch: {
        get(params: Record<string, unknown>): Promise<AmadeusResponse>;
      };
      hotelOffersSearch: {
        get(params: Record<string, unknown>): Promise<AmadeusResponse>;
      };
    };
    analytics: {
      itineraryPriceMetrics: {
        get(params: Record<string, unknown>): Promise<AmadeusResponse>;
      };
    };
    referenceData: {
      locations: {
        airports: {
          get(params: Record<string, unknown>): Promise<AmadeusResponse>;
        };
      };
      airlines: {
        get(params: Record<string, unknown>): Promise<AmadeusResponse>;
      };
    };
  }

  class Amadeus {
    constructor(config: AmadeusConfig);
    shopping: AmadeusClient['shopping'];
    analytics: AmadeusClient['analytics'];
    referenceData: AmadeusClient['referenceData'];
  }

  export = Amadeus;
}
