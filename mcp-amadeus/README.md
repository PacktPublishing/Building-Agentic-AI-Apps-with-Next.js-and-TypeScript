# Amadeus MCP Server

A Model Context Protocol (MCP) server for the Amadeus API, enabling flight search, hotel search, airport search, and airline information retrieval.

## Features

- **Flight Search**: Advanced flight search with filters (class, price, stops, etc.)
- **Price Analysis**: Price analysis and predictions for specific routes
- **Airport Search**: Search airports by name, city, or IATA code
- **Airline Information**: Retrieve airline information by IATA codes
- **Hotel Search**: Search hotels by city with dates and guest information

## Setup

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Configure your Amadeus credentials in `.env`:
```env
AMADEUS_CLIENT_ID=your_amadeus_client_id_here
AMADEUS_CLIENT_SECRET=your_amadeus_client_secret_here
AMADEUS_HOSTNAME=test
MCP_BEARER_TOKEN=replace_with_a_generated_token
MCP_ALLOWED_ORIGINS=http://localhost:3000
```

3. Get your credentials from [Amadeus for Developers](https://developers.amadeus.com/)

Run `node scripts/generate-token.js` to create the shared MCP bearer token. Keep the printed token out of source control and logs. Blank credentials or an unknown `AMADEUS_HOSTNAME` are rejected when an API-backed tool first runs. Supported host values are `test`, `test.api.amadeus.com`, `production`, and `api.amadeus.com`; the default is `test`. Tool listing does not initialize the Amadeus client.

The MCP endpoint is `/api/mcp` using stateless MCP HTTP (protocol `2026-07-28`). Every request requires the bearer token; authenticated GET returns 405 because this example accepts self-contained POST requests only. Browser requests carrying `Origin` must match `MCP_ALLOWED_ORIGINS`; native clients without `Origin` still authenticate. This shared-token example authorizes a client application, not an individual end user, and is not a full MCP OAuth implementation. The legacy `/api/sse` and `/api/message` paths are disabled.

For deployment, select `mcp-amadeus` as the project root directory and set the server-only values independently for Preview and Production. Do not place these secrets in `NEXT_PUBLIC_` variables. Redeploy after changing environment values. Validate the Preview URL with a real MCP SDK client or Inspector before promoting it; an offline build cannot prove Amadeus access.

## Installation

```bash
pnpm install
```

## Development

```bash
pnpm dev
```

The server will be available at [http://localhost:3000](http://localhost:3000).

## Available MCP Tools

### 1. search_flights
Search for flights between two airports with filters.

**Parameters:**
- `origin`: Origin airport IATA code (3 letters)
- `destination`: Destination airport IATA code (3 letters)
- `departureDate`: Departure date (YYYY-MM-DD)
- `returnDate`: Optional return date (YYYY-MM-DD)
- `adults`: Number of adults (1-9, default: 1)
- `children`: Number of children (0-9, default: 0)
- `infants`: Number of infants (0-9, default: 0)
- `travelClass`: Travel class (ECONOMY, PREMIUM_ECONOMY, BUSINESS, FIRST)
- `nonStop`: Non-stop flights only (boolean, default: false)
- `maxPrice`: Maximum price filter (optional)
- `currency`: Currency code (default: EUR)

### 2. analyze_flight_prices
Get flight price analysis and predictions for a route.

**Parameters:**
- `origin`: Origin airport IATA code
- `destination`: Destination airport IATA code
- `departureDate`: Departure date (YYYY-MM-DD)
- `currency`: Currency code (default: EUR)

### 3. search_airports
Search for airports by name, city, or IATA code.

**Parameters:**
- `keyword`: Airport name, city name, or IATA code
- `countryCode`: Country code to filter results (optional)

### 4. get_airline_info
Get information about airlines by their IATA codes.

**Parameters:**
- `airlineCodes`: Comma-separated airline IATA codes (e.g., "AF,KL,LH")

### 5. search_hotels
Search for hotels in a specific city.

**Parameters:**
- `cityCode`: City IATA code
- `checkInDate`: Check-in date (YYYY-MM-DD)
- `checkOutDate`: Check-out date (YYYY-MM-DD)
- `adults`: Number of adults (1-9, default: 1)
- `roomQuantity`: Number of rooms (1-8, default: 1)
- `currency`: Currency code (default: EUR)
- `bestRateOnly`: Return only best rate per hotel (default: true)

## Architecture

```
├── app/
│   ├── api/
│   │   └── [transport]/
│   │       └── route.ts          # Main MCP handler
│   └── page.tsx                  # Dashboard page
├── lib/
│   ├── tools/
│   │   └── amadeus.ts           # Amadeus client
│   ├── types/
│   │   └── amadeus.ts           # Zod schemas and types
│   └── usage/
│       └── logger.ts            # Usage logger
├── types/
│   └── amadeus.d.ts             # TypeScript declarations for Amadeus
└── .env.example                 # Environment variables example
```

## Tech Stack

- **Next.js 15**: React framework
- **TypeScript**: Static typing
- **Zod 4**: Schema validation
- **@modelcontextprotocol/server 2.3.1**: native request-scoped MCP v2 handler
- **Amadeus SDK**: Amadeus API integration
- **pnpm**: Package manager

## Deployment

The project can be deployed on Vercel, Netlify, or any platform supporting Next.js.

```bash
pnpm build
pnpm start
```

## Modern protocol clients

The native `createMcpHandler` factory returns a fresh server per request and rejects legacy `initialize`. Each request includes protocol/client metadata; SDK clients attach the HTTP method/name/version headers. There is no MCP session ID or shared request queue. Use `versionNegotiation: { mode: { pin: "2026-07-28" } }` with SDK v2 clients, or `mode: "modern"` with LangChain MCPAdapter 2.0.1. See [migration and runtime proof](../docs/mcp-v2/README.md).

The server also exposes `search_cities`, `get_hotel_ratings` and `search_tours_activities`. Hotel ratings use the IDs returned by hotel search and return an empty result when unavailable.
