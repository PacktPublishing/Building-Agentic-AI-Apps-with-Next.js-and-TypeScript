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
```

3. Get your credentials from [Amadeus for Developers](https://developers.amadeus.com/)

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
- **Zod**: Schema validation
- **mcp-handler**: MCP protocol handling
- **Amadeus SDK**: Amadeus API integration
- **pnpm**: Package manager

## Deployment

The project can be deployed on Vercel, Netlify, or any platform supporting Next.js.

```bash
pnpm build
pnpm start
```
