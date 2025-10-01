/**
 * Amadeus API Wrapper
 * Adapter for Amadeus travel API
 */

import { z } from 'zod';

// Input validation schemas
export const flightSearchSchema = z.object({
  origin: z.string().length(3, 'Origin must be a 3-letter IATA code'),
  destination: z.string().length(3, 'Destination must be a 3-letter IATA code'),
  departureDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  returnDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  adults: z.number().int().positive().default(1),
  maxResults: z.number().int().positive().max(50).default(10),
});

export const hotelSearchSchema = z.object({
  cityCode: z.string().length(3, 'City code must be a 3-letter IATA code'),
  checkInDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOutDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  adults: z.number().int().positive().default(1),
  maxResults: z.number().int().positive().max(50).default(10),
});

export type FlightSearchInput = z.infer<typeof flightSearchSchema>;
export type HotelSearchInput = z.infer<typeof hotelSearchSchema>;

// Response types
export interface FlightOffer {
  id: string;
  price: {
    total: string;
    currency: string;
  };
  itineraries: Array<{
    duration: string;
    segments: Array<{
      departure: {
        iataCode: string;
        at: string;
      };
      arrival: {
        iataCode: string;
        at: string;
      };
      carrierCode: string;
      number: string;
    }>;
  }>;
}

export interface HotelOffer {
  id: string;
  name: string;
  price: {
    total: string;
    currency: string;
  };
  rating?: number;
  address?: {
    cityName: string;
    countryCode: string;
  };
}

/**
 * Amadeus API Client
 */
export class AmadeusClient {
  private apiKey: string;
  private apiSecret: string;
  private baseUrl: string = 'https://test.api.amadeus.com/v2';

  constructor() {
    this.apiKey = process.env.AMADEUS_API_KEY || '';
    this.apiSecret = process.env.AMADEUS_API_SECRET || '';
    
    if (!this.apiKey || !this.apiSecret) {
      throw new Error('Amadeus API credentials not configured');
    }
  }

  /**
   * Search for flight offers
   */
  async searchFlights(input: FlightSearchInput): Promise<FlightOffer[]> {
    // Validate input
    const validatedInput = flightSearchSchema.parse(input);
    
    // TODO: Implement actual Amadeus API call
    console.log('Searching flights with:', validatedInput);
    
    // Mock response for now
    return [];
  }

  /**
   * Search for hotel offers
   */
  async searchHotels(input: HotelSearchInput): Promise<HotelOffer[]> {
    // Validate input
    const validatedInput = hotelSearchSchema.parse(input);
    
    // TODO: Implement actual Amadeus API call
    console.log('Searching hotels with:', validatedInput);
    
    // Mock response for now
    return [];
  }
}

// Singleton instance
let amadeusClient: AmadeusClient | null = null;

/**
 * Get Amadeus client instance
 */
export function getAmadeusClient(): AmadeusClient {
  if (!amadeusClient) {
    amadeusClient = new AmadeusClient();
  }
  return amadeusClient;
}
