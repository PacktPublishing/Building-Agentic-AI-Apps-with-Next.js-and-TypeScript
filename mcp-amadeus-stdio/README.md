# Amadeus MCP over STDIO (Chapter 8)

From a clean repository checkout, use Node.js 22 and pnpm 10.14.0:

```sh
pnpm install --frozen-lockfile
pnpm --filter mcp-amadeus-stdio build
pnpm --filter mcp-amadeus-stdio test
```

The server starts and lists capabilities without credentials. API-backed tool calls require `AMADEUS_CLIENT_ID` and `AMADEUS_CLIENT_SECRET` in the server process environment. Set `AMADEUS_HOSTNAME=test` (default) or `production`. Missing credentials produce an MCP tool result with `isError: true`; upstream failures are also marked as tool errors, with private provider details removed.

Inputs use uppercase IATA airport/city codes, uppercase ISO country and currency codes, and real `YYYY-MM-DD` calendar dates. Lowercase codes are rejected rather than silently rewritten. Passenger/room counts and search radius are integers. Return date cannot precede departure date, and hotel check-out must follow check-in.

Use `search_hotels` to obtain Amadeus hotel IDs. `get_hotel_ratings` accepts one to three eight-character IDs, for example `{ "hotelIds": ["XKPARC12"] }`. It calls Hotel Ratings with `hotelIds`; it does not accept geographic bounds or provide general destination experiences. Empty ratings return `status: "unavailable"` and an empty data array. A provider error returns `isError: true` instead. The destination prompt reflects this sequence.

The included tests use synthetic inputs and a local MCP client/server handshake. They do not verify live Amadeus account entitlements or real ratings.
