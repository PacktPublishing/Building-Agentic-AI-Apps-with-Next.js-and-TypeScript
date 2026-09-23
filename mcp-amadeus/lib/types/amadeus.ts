import { z } from "zod";

// Zod schemas for validation
export const Gender = z.enum(["male", "female"]);
export const TravelClass = z.enum(["ECONOMY", "PREMIUM_ECONOMY", "BUSINESS", "FIRST"]);

// Flight search schema
export const FlightSearchSchema = z.object({
  origin: z.string().min(3).max(3).describe("Origin airport IATA code (3 letters)"),
  destination: z.string().min(3).max(3).describe("Destination airport IATA code (3 letters)"),
  departureDate: z.string().describe("Departure date in YYYY-MM-DD format"),
  returnDate: z.string().optional().describe("Return date in YYYY-MM-DD format (for round trip)"),
  adults: z.number().min(1).max(9).default(1).describe("Number of adult passengers"),
  children: z.number().min(0).max(9).default(0).describe("Number of child passengers"),
  infants: z.number().min(0).max(9).default(0).describe("Number of infant passengers"),
  travelClass: TravelClass.default("ECONOMY").describe("Travel class"),
  nonStop: z.boolean().default(false).describe("Search for non-stop flights only"),
  maxPrice: z.number().optional().describe("Maximum price filter"),
  currency: z.string().default("EUR").describe("Currency code (3 letters)"),
});

// Flight price analysis schema
export const FlightPriceAnalysisSchema = z.object({
  origin: z.string().min(3).max(3).describe("Origin airport IATA code"),
  destination: z.string().min(3).max(3).describe("Destination airport IATA code"),
  departureDate: z.string().describe("Departure date in YYYY-MM-DD format"),
  currency: z.string().default("EUR").describe("Currency code"),
});

// Airport search schema
export const AirportSearchSchema = z.object({
  keyword: z.string().describe("Airport name, city name, or IATA code to search for"),
  countryCode: z.string().optional().describe("Country code to filter results"),
});

// Airline search schema
export const AirlineSearchSchema = z.object({
  airlineCodes: z.string().describe("Comma-separated airline IATA codes (e.g., 'AF,KL,LH')"),
});

// Hotel search schema
export const HotelSearchSchema = z.object({
  cityCode: z.string().describe("City IATA code where to search for hotels"),
  checkInDate: z.string().describe("Check-in date in YYYY-MM-DD format"),
  checkOutDate: z.string().describe("Check-out date in YYYY-MM-DD format"),
  adults: z.number().min(1).max(9).default(1).describe("Number of adult guests"),
  roomQuantity: z.number().min(1).max(8).default(1).describe("Number of rooms"),
  currency: z.string().default("EUR").describe("Currency code"),
  bestRateOnly: z.boolean().default(true).describe("Return only best rate per hotel"),
});

// City search schema
export const CitySearchSchema = z.object({
  keyword: z.string().describe("City name or IATA code to search for"),
  countryCode: z.string().optional().describe("Country code to filter results"),
});

// Hotel Ratings uses hotel IDs, not geographic bounds.
export const HotelRatingsSchema = z.object({
  hotelIds: z.string().trim().min(1).regex(/^[A-Z0-9]+(?:,[A-Z0-9]+)*$/)
    .describe("Comma-separated hotel IDs returned by hotel search"),
}).strict();

// Tours and activities schema
export const ToursActivitiesSchema = z.object({
  latitude: z.number().describe("Latitude of the location"),
  longitude: z.number().describe("Longitude of the location"),
  radius: z.number().min(1).max(20).default(1).describe("Search radius in kilometers"),
});

// TypeScript interfaces
export interface FlightSearchParams {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  adults: number;
  children: number;
  infants: number;
  travelClass: "ECONOMY" | "PREMIUM_ECONOMY" | "BUSINESS" | "FIRST";
  nonStop: boolean;
  maxPrice?: number;
  currency: string;
}

export interface FlightPriceAnalysisParams {
  origin: string;
  destination: string;
  departureDate: string;
  currency: string;
}

export interface AirportSearchParams {
  keyword: string;
  countryCode?: string;
}

export interface AirlineSearchParams {
  airlineCodes: string;
}

export interface HotelSearchParams {
  cityCode: string;
  checkInDate: string;
  checkOutDate: string;
  adults: number;
  roomQuantity: number;
  currency: string;
  bestRateOnly: boolean;
}

export interface CitySearchParams {
  keyword: string;
  countryCode?: string;
}

export interface HotelRatingsParams {
  hotelIds: string;
}

export interface ToursActivitiesParams {
  latitude: number;
  longitude: number;
  radius: number;
}

// API Response types
export interface FlightOffer {
  id: string;
  source: string;
  instantTicketingRequired: boolean;
  nonHomogeneous: boolean;
  oneWay: boolean;
  lastTicketingDate: string;
  numberOfBookableSeats: number;
  itineraries: Itinerary[];
  price: Price;
  pricingOptions: PricingOptions;
  validatingAirlineCodes: string[];
  travelerPricings: TravelerPricing[];
}

export interface Itinerary {
  duration: string;
  segments: Segment[];
}

export interface Segment {
  departure: LocationInfo;
  arrival: LocationInfo;
  carrierCode: string;
  number: string;
  aircraft: Aircraft;
  operating?: Operating;
  duration: string;
  id: string;
  numberOfStops: number;
  blacklistedInEU: boolean;
}

export interface LocationInfo {
  iataCode: string;
  terminal?: string;
  at: string;
}

export interface Aircraft {
  code: string;
}

export interface Operating {
  carrierCode: string;
}

export interface Price {
  currency: string;
  total: string;
  base: string;
  fees: Fee[];
  grandTotal: string;
}

export interface Fee {
  amount: string;
  type: string;
}

export interface PricingOptions {
  fareType: string[];
  includedCheckedBagsOnly: boolean;
}

export interface TravelerPricing {
  travelerId: string;
  fareOption: string;
  travelerType: string;
  price: Price;
  fareDetailsBySegment: FareDetailsBySegment[];
}

export interface FareDetailsBySegment {
  segmentId: string;
  cabin: string;
  fareBasis: string;
  class: string;
  includedCheckedBags: IncludedCheckedBags;
}

export interface IncludedCheckedBags {
  weight?: number;
  weightUnit?: string;
}

export interface Airport {
  type: string;
  subType: string;
  name: string;
  detailedName: string;
  id: string;
  self: SelfLink;
  timeZoneOffset: string;
  iataCode: string;
  geoCode: GeoCode;
  address: Address;
  analytics: Analytics;
}

export interface SelfLink {
  href: string;
  methods: string[];
}

export interface GeoCode {
  latitude: number;
  longitude: number;
}

export interface Address {
  cityName: string;
  cityCode: string;
  countryName: string;
  countryCode: string;
  regionCode: string;
}

export interface Analytics {
  travelers: {
    score: number;
  };
}

export interface Airline {
  type: string;
  iataCode: string;
  icaoCode: string;
  businessName: string;
  commonName: string;
}

export interface HotelOffer {
  type: string;
  hotel: Hotel;
  available: boolean;
  offers: Offer[];
  self: string;
}

export interface Hotel {
  type: string;
  hotelId: string;
  chainCode: string;
  dupeId: string;
  name: string;
  cityCode: string;
  latitude: number;
  longitude: number;
}

export interface Offer {
  id: string;
  checkInDate: string;
  checkOutDate: string;
  rateCode: string;
  rateFamilyEstimated: RateFamilyEstimated;
  room: Room;
  guests: Guests;
  price: HotelPrice;
}

export interface RateFamilyEstimated {
  code: string;
  type: string;
}

export interface Room {
  type: string;
  typeEstimated: RoomTypeEstimated;
}

export interface RoomTypeEstimated {
  category: string;
  beds: number;
  bedType: string;
}

export interface Guests {
  adults: number;
}

export interface HotelPrice {
  currency: string;
  base: string;
  total: string;
  variations: PriceVariations;
}

export interface PriceVariations {
  average: {
    base: string;
  };
  changes: PriceChange[];
}

export interface PriceChange {
  startDate: string;
  endDate: string;
  base: string;
}

export interface PriceMetric {
  type: string;
  origin: {
    iataCode: string;
  };
  destination: {
    iataCode: string;
  };
  departureDate: string;
  transportType: string;
  currencyCode: string;
  oneWay: boolean;
  priceMetrics: PriceMetricValue[];
}

export interface PriceMetricValue {
  amount: string;
  quartileRanking: "MINIMUM" | "FIRST_QUARTILE" | "MEDIUM" | "THIRD_QUARTILE" | "MAXIMUM";
}

export interface ApiResponse<T> {
  data: T[];
  meta: {
    count: number;
    links?: {
      self: string;
      next?: string;
      previous?: string;
      last?: string;
      first?: string;
    };
  };
  dictionaries?: Record<string, unknown>;
}
