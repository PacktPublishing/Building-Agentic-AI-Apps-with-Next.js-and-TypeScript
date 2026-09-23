import { z } from "zod";

// ─── Travel Class & Gender Enums ───────────────────────────────────────

export const TravelClass = z.enum([
  "ECONOMY",
  "PREMIUM_ECONOMY",
  "BUSINESS",
  "FIRST",
]);

export const Gender = z.enum(["male", "female"]);

/** Codes are passed to Amadeus as uppercase ASCII; no implicit correction. */
export const IataCode = z.string().regex(/^[A-Z]{3}$/, "Expected a three-letter uppercase IATA code");
export const CurrencyCode = z.string().regex(/^[A-Z]{3}$/, "Expected a three-letter uppercase currency code");
export const CountryCode = z.string().regex(/^[A-Z]{2}$/, "Expected a two-letter uppercase country code");
export const CalendarDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD")
  .refine((value) => {
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, "Invalid calendar date");
export const Latitude = z.number().finite().min(-90).max(90);
export const Longitude = z.number().finite().min(-180).max(180);

// ─── Input Schemas (Zod) ───────────────────────────────────────────────

export const FlightSearchFields = z.object({
  origin: IataCode.describe("Origin airport IATA code (3 uppercase letters)"),
  destination: IataCode.describe("Destination airport IATA code (3 uppercase letters)"),
  departureDate: CalendarDate.describe("Departure date in YYYY-MM-DD format"),
  returnDate: CalendarDate.optional().describe("Return date in YYYY-MM-DD format (for round trip)"),
  adults: z
    .number().int()
    .min(1)
    .max(9)
    .default(1)
    .describe("Number of adult passengers"),
  children: z
    .number().int()
    .min(0)
    .max(9)
    .default(0)
    .describe("Number of child passengers"),
  infants: z
    .number().int()
    .min(0)
    .max(9)
    .default(0)
    .describe("Number of infant passengers"),
  travelClass: TravelClass.default("ECONOMY").describe("Travel class"),
  nonStop: z
    .boolean()
    .default(false)
    .describe("Search for non-stop flights only"),
  maxPrice: z.number().finite().positive().optional().describe("Maximum price filter"),
  currency: CurrencyCode.default("EUR").describe("Currency code (3 uppercase letters)"),
});
export const FlightSearchSchema = FlightSearchFields
  .refine(({ departureDate, returnDate }) => !returnDate || returnDate >= departureDate, {
    message: "Return date must not precede departure date", path: ["returnDate"],
  })
  .refine(({ adults, infants }) => infants <= adults, {
    message: "Infant count must not exceed adult count", path: ["infants"],
  });

export const FlightPriceAnalysisSchema = z.object({
  origin: IataCode.describe("Origin airport IATA code"),
  destination: IataCode.describe("Destination airport IATA code"),
  departureDate: CalendarDate.describe("Departure date in YYYY-MM-DD format"),
  currency: CurrencyCode.default("EUR").describe("Currency code"),
});

export const AirportSearchSchema = z.object({
  keyword: z
    .string().trim().min(1)
    .describe("Airport name, city name, or IATA code to search for"),
  countryCode: CountryCode.optional()
    .describe("Country code to filter results"),
});

export const AirlineSearchSchema = z.object({
  airlineCodes: z.string().regex(/^[A-Z0-9]{2}(,[A-Z0-9]{2})*$/, "Expected comma-separated uppercase airline codes")
    .describe("Comma-separated airline IATA codes (e.g., 'AF,KL,LH')"),
});

export const HotelSearchFields = z.object({
  cityCode: IataCode.describe("City IATA code where to search for hotels"),
  checkInDate: CalendarDate.describe("Check-in date in YYYY-MM-DD format"),
  checkOutDate: CalendarDate.describe("Check-out date in YYYY-MM-DD format"),
  adults: z
    .number().int()
    .min(1)
    .max(9)
    .default(1)
    .describe("Number of adult guests"),
  roomQuantity: z
    .number().int()
    .min(1)
    .max(8)
    .default(1)
    .describe("Number of rooms"),
  currency: CurrencyCode.default("EUR").describe("Currency code"),
  bestRateOnly: z
    .boolean()
    .default(true)
    .describe("Return only best rate per hotel"),
});
export const HotelSearchSchema = HotelSearchFields.refine(
  ({ checkInDate, checkOutDate }) => checkOutDate > checkInDate,
  { message: "Check-out must follow check-in", path: ["checkOutDate"] },
);

export const CitySearchSchema = z.object({
  keyword: z.string().trim().min(1).describe("City name or IATA code to search for"),
  countryCode: CountryCode.optional()
    .describe("Country code to filter results"),
});

export const HotelRatingsSchema = z.object({
  hotelIds: z.array(z.string().regex(/^[A-Z0-9]{8}$/, "Expected an eight-character Amadeus hotel ID"))
    .min(1).max(3).describe("One to three Amadeus hotel IDs from a hotel search"),
});

export const ToursActivitiesSchema = z.object({
  latitude: Latitude.describe("Latitude of the location"),
  longitude: Longitude.describe("Longitude of the location"),
  radius: z
    .number().int()
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
export type HotelRatingsParams = z.infer<typeof HotelRatingsSchema>;
export type ToursActivitiesParams = z.infer<typeof ToursActivitiesSchema>;
