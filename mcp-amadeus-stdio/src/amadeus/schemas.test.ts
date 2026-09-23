import assert from "node:assert/strict";
import { test } from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { registerFlightTools } from "../tools/flights.js";
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
