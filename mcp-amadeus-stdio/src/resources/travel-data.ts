import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

/**
 * Static reference data exposed as MCP resources.
 *
 * Resources let an MCP client (or an LLM agent) discover reference
 * information without making a tool call.  They are read-only and
 * declared at registration time.
 */

// ── Reference datasets ──────────────────────────────────────────────────────

const MAJOR_AIRPORTS = [
  { iata: "JFK", name: "John F. Kennedy International", city: "New York", country: "US" },
  { iata: "LAX", name: "Los Angeles International", city: "Los Angeles", country: "US" },
  { iata: "LHR", name: "Heathrow", city: "London", country: "GB" },
  { iata: "CDG", name: "Charles de Gaulle", city: "Paris", country: "FR" },
  { iata: "NRT", name: "Narita International", city: "Tokyo", country: "JP" },
  { iata: "DXB", name: "Dubai International", city: "Dubai", country: "AE" },
  { iata: "SIN", name: "Changi", city: "Singapore", country: "SG" },
  { iata: "FRA", name: "Frankfurt am Main", city: "Frankfurt", country: "DE" },
  { iata: "HKG", name: "Hong Kong International", city: "Hong Kong", country: "HK" },
  { iata: "SYD", name: "Kingsford Smith", city: "Sydney", country: "AU" },
  { iata: "ORD", name: "O'Hare International", city: "Chicago", country: "US" },
  { iata: "ATL", name: "Hartsfield-Jackson", city: "Atlanta", country: "US" },
  { iata: "AMS", name: "Schiphol", city: "Amsterdam", country: "NL" },
  { iata: "ICN", name: "Incheon International", city: "Seoul", country: "KR" },
  { iata: "BCN", name: "El Prat", city: "Barcelona", country: "ES" },
];

const TRAVEL_CLASSES = [
  { code: "ECONOMY", label: "Economy", description: "Standard seating with basic amenities" },
  { code: "PREMIUM_ECONOMY", label: "Premium Economy", description: "Extra legroom and enhanced service" },
  { code: "BUSINESS", label: "Business", description: "Lie-flat seats, lounge access, premium dining" },
  { code: "FIRST", label: "First Class", description: "Top-tier service with private suites on select carriers" },
];

const SUPPORTED_CURRENCIES = [
  { code: "USD", name: "US Dollar" },
  { code: "EUR", name: "Euro" },
  { code: "GBP", name: "British Pound" },
  { code: "JPY", name: "Japanese Yen" },
  { code: "AED", name: "UAE Dirham" },
  { code: "SGD", name: "Singapore Dollar" },
  { code: "AUD", name: "Australian Dollar" },
  { code: "CAD", name: "Canadian Dollar" },
  { code: "CHF", name: "Swiss Franc" },
  { code: "CNY", name: "Chinese Yuan" },
];

// ── Registration ────────────────────────────────────────────────────────────

export function registerTravelResources(server: McpServer) {
  server.resource(
    "major-airports",
    "travel://reference/major-airports",
    {
      description:
        "A curated list of major international airports with IATA codes. " +
        "Useful as a quick reference when the user mentions a city but not an airport code.",
      mimeType: "application/json",
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.toString(),
          mimeType: "application/json",
          text: JSON.stringify(MAJOR_AIRPORTS, null, 2),
        },
      ],
    }),
  );

  server.resource(
    "travel-classes",
    "travel://reference/travel-classes",
    {
      description:
        "Amadeus travel class codes (ECONOMY, PREMIUM_ECONOMY, BUSINESS, FIRST) " +
        "with human-readable labels and descriptions.",
      mimeType: "application/json",
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.toString(),
          mimeType: "application/json",
          text: JSON.stringify(TRAVEL_CLASSES, null, 2),
        },
      ],
    }),
  );

  server.resource(
    "supported-currencies",
    "travel://reference/supported-currencies",
    {
      description:
        "Currency codes accepted by the Amadeus API for pricing and filtering.",
      mimeType: "application/json",
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.toString(),
          mimeType: "application/json",
          text: JSON.stringify(SUPPORTED_CURRENCIES, null, 2),
        },
      ],
    }),
  );
}
