import assert from "node:assert/strict";
import { test } from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { registerFlightTools } from "../tools/flights.js";
import { registerHotelTools } from "../tools/hotels.js";
import { registerLocationTools } from "../tools/locations.js";
import {
  FlightSearchSchema,
  HotelSearchSchema,
  HotelRatingsSchema,
  ToursActivitiesSchema,
} from "./schemas.js";

test("invalid travel values fail schema validation", () => {
  const flight = { origin: "CDG", destination: "LHR", departureDate: "2026-02-30" };
  assert.equal(FlightSearchSchema.safeParse(flight).success, false);
  assert.equal(FlightSearchSchema.safeParse({ ...flight, departureDate: "2026-10-10", adults: 1.5 }).success, false);
  assert.equal(FlightSearchSchema.safeParse({ ...flight, origin: "C1G", departureDate: "2026-10-10" }).success, false);
  assert.equal(FlightSearchSchema.safeParse({ ...flight, departureDate: "2026-10-10", returnDate: "2026-10-09" }).success, false);
  assert.equal(HotelSearchSchema.safeParse({ cityCode: "PAR", checkInDate: "2026-10-10", checkOutDate: "2026-10-09" }).success, false);
  assert.equal(ToursActivitiesSchema.safeParse({ latitude: 91, longitude: 2 }).success, false);
  assert.equal(HotelRatingsSchema.safeParse({ hotelIds: [] }).success, false);
  assert.equal(HotelRatingsSchema.safeParse({ hotelIds: ["bad"] }).success, false);
  assert.equal(HotelRatingsSchema.safeParse({ hotelIds: ["HOTEL001"], north: 10 }).success, false);
  assert.equal(FlightSearchSchema.safeParse({ origin: "CDG", destination: "LHR", departureDate: "2026-10-10" }).success, true);
});

test("a reversed flight date never reaches the adapter", async () => {
  let called = false;
  const server = new McpServer({ name: "travel-test", version: "1.0.0" });
  registerFlightTools(server, () => ({ searchFlights: async () => { called = true; return { success: true, data: [] }; } }) as never);
  const client = new Client({ name: "test-client", version: "1.0.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  try {
    await server.connect(serverTransport);
    await client.connect(clientTransport);
    const result = await client.callTool({ name: "search_flights", arguments: {
      origin: "CDG", destination: "LHR", departureDate: "2026-10-10", returnDate: "2026-10-09",
    } });
    assert.equal(result.isError, true);
    assert.equal(called, false);
  } finally {
    await client.close();
    await server.close();
  }
});

test("registered tools reject invalid travel values before resolving the adapter", async () => {
  let adapterCalls = 0;
  const server = new McpServer({ name: "travel-test", version: "1.0.0" });
  const getClient = () => { adapterCalls++; throw new Error("adapter must not be reached"); };
  registerFlightTools(server, getClient);
  registerHotelTools(server, getClient);
  registerLocationTools(server, getClient);
  const client = new Client({ name: "test-client", version: "1.0.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const flight = { origin: "CDG", destination: "LHR", departureDate: "2026-10-10" };
  const hotel = { cityCode: "PAR", checkInDate: "2026-10-10", checkOutDate: "2026-10-12" };
  const invalid = [
    ["search_flights", { ...flight, adults: 1.5 }],
    ["search_flights", { ...flight, departureDate: "2026-02-30" }],
    ["search_flights", { ...flight, origin: "C1G" }],
    ["search_flights", { ...flight, currency: "eur" }],
    ["search_flights", { ...flight, infants: 2, adults: 1 }],
    ["search_hotels", { ...hotel, roomQuantity: 1.5 }],
    ["search_hotels", { ...hotel, checkOutDate: "2026-10-09" }],
    ["search_hotels", { ...hotel, checkInDate: "2026-02-30" }],
    ["search_tours_activities", { latitude: 91, longitude: 2.35 }],
    ["search_tours_activities", { latitude: 48.85, longitude: -181 }],
    ["search_airports", { keyword: "Paris", countryCode: "F1" }],
  ] as const;
  try {
    await server.connect(serverTransport);
    await client.connect(clientTransport);
    for (const [name, args] of invalid) {
      try {
        const result = await client.callTool({ name, arguments: args });
        assert.equal(result.isError, true, `${name}: ${JSON.stringify(args)}`);
      } catch (error) {
        assert.match(String(error), /Invalid arguments/, `${name}: ${JSON.stringify(args)}`);
      }
    }
    assert.equal(adapterCalls, 0);
  } finally {
    await client.close();
    await server.close();
  }
});
