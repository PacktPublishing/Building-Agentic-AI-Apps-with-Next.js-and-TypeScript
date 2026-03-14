import { z } from "zod";

// ─── Travel Class & Gender Enums ───────────────────────────────────────

export const TravelClass = z.enum([
  "ECONOMY",
  "PREMIUM_ECONOMY",
  "BUSINESS",
  "FIRST",
]);

export const Gender = z.enum(["male", "female"]);

// ─── Input Schemas (Zod) ───────────────────────────────────────────────

export const FlightSearchSchema = z.object({
  origin: z
    .string()
    .min(3)
    .max(3)
    .describe("Origin airport IATA code (3 letters)"),
  destination: z
    .string()
    .min(3)
    .max(3)
    .describe("Destination airport IATA code (3 letters)"),
  departureDate: z
    .string()
    .describe("Departure date in YYYY-MM-DD format"),
  returnDate: z
    .string()
    .optional()
    .describe("Return date in YYYY-MM-DD format (for round trip)"),
  adults: z
    .number()
    .min(1)
    .max(9)
    .default(1)
    .describe("Number of adult passengers"),
  children: z
    .number()
    .min(0)
    .max(9)
    .default(0)
    .describe("Number of child passengers"),
  infants: z
    .number()
    .min(0)
    .max(9)
    .default(0)
    .describe("Number of infant passengers"),
  travelClass: TravelClass.default("ECONOMY").describe("Travel class"),
  nonStop: z
    .boolean()
    .default(false)
    .describe("Search for non-stop flights only"),
  maxPrice: z.number().optional().describe("Maximum price filter"),
  currency: z
    .string()
    .default("EUR")
    .describe("Currency code (3 letters)"),
});

export const FlightPriceAnalysisSchema = z.object({
  origin: z
    .string()
    .min(3)
    .max(3)
    .describe("Origin airport IATA code"),
  destination: z
    .string()
    .min(3)
    .max(3)
    .describe("Destination airport IATA code"),
  departureDate: z.string().describe("Departure date in YYYY-MM-DD format"),
  currency: z.string().default("EUR").describe("Currency code"),
});

export const AirportSearchSchema = z.object({
  keyword: z
    .string()
    .describe("Airport name, city name, or IATA code to search for"),
  countryCode: z
    .string()
    .optional()
    .describe("Country code to filter results"),
});

export const AirlineSearchSchema = z.object({
  airlineCodes: z
    .string()
    .describe("Comma-separated airline IATA codes (e.g., 'AF,KL,LH')"),
});

export const HotelSearchSchema = z.object({
  cityCode: z
    .string()
    .describe("City IATA code where to search for hotels"),
  checkInDate: z.string().describe("Check-in date in YYYY-MM-DD format"),
  checkOutDate: z.string().describe("Check-out date in YYYY-MM-DD format"),
  adults: z
    .number()
    .min(1)
    .max(9)
    .default(1)
    .describe("Number of adult guests"),
  roomQuantity: z
    .number()
    .min(1)
    .max(8)
    .default(1)
    .describe("Number of rooms"),
  currency: z.string().default("EUR").describe("Currency code"),
  bestRateOnly: z
    .boolean()
    .default(true)
    .describe("Return only best rate per hotel"),
});

export const CitySearchSchema = z.object({
  keyword: z.string().describe("City name or IATA code to search for"),
  countryCode: z
    .string()
    .optional()
    .describe("Country code to filter results"),
});

export const DestinationExperiencesSchema = z.object({
  north: z.number().describe("North latitude boundary"),
  west: z.number().describe("West longitude boundary"),
  south: z.number().describe("South latitude boundary"),
  east: z.number().describe("East longitude boundary"),
});

export const ToursActivitiesSchema = z.object({
  latitude: z.number().describe("Latitude of the location"),
  longitude: z.number().describe("Longitude of the location"),
  radius: z
    .number()
    .min(1)
    .max(20)
    .default(1)
    .describe("Search radius in kilometers"),
});

// ─── TypeScript Interfaces (inferred from Zod) ────────────────────────

export type FlightSearchParams = z.infer<typeof FlightSearchSchema>;
export type FlightPriceAnalysisParams = z.infer<typeof FlightPriceAnalysisSchema>;
export type AirportSearchParams = z.infer<typeof AirportSearchSchema>;
export type AirlineSearchParams = z.infer<typeof AirlineSearchSchema>;
export type HotelSearchParams = z.infer<typeof HotelSearchSchema>;
export type CitySearchParams = z.infer<typeof CitySearchSchema>;
export type DestinationExperiencesParams = z.infer<typeof DestinationExperiencesSchema>;
export type ToursActivitiesParams = z.infer<typeof ToursActivitiesSchema>;
