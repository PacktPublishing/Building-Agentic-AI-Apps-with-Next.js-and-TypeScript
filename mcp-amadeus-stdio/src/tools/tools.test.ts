import assert from "node:assert/strict";
import { test } from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { fileURLToPath } from "node:url";
import { registerFlightTools } from "./flights.js";
import { registerHotelTools } from "./hotels.js";
import { registerLocationTools } from "./locations.js";

test("an API failure is an MCP tool error while capability listing remains available", async () => {
  const server = new McpServer({ name: "travel-test", version: "1.0.0" });
  registerFlightTools(server, () => { throw new Error("synthetic provider failure"); });
  const client = new Client({ name: "test-client", version: "1.0.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  try {
    await server.connect(serverTransport);
    await client.connect(clientTransport);
    assert.ok((await client.listTools()).tools.some((tool) => tool.name === "search_flights"));
    const result = await client.callTool({ name: "search_flights", arguments: {
      origin: "CDG", destination: "LHR", departureDate: "2026-10-10",
    } });
    assert.equal(result.isError, true);
  } finally {
    await client.close();
    await server.close();
  }
});

test("the actual STDIO server lists tools without credentials and stays usable after an API error", async () => {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: ["--import", "tsx", "src/index.ts"],
    cwd: fileURLToPath(new URL("../../", import.meta.url)),
    env: { PATH: process.env.PATH ?? "" },
    stderr: "pipe",
  });
  const client = new Client({ name: "stdio-test", version: "1.0.0" });
  try {
    await client.connect(transport);
    assert.ok((await client.listTools()).tools.some((tool) => tool.name === "search_flights"));
    const result = await client.callTool({ name: "search_flights", arguments: {
      origin: "CDG", destination: "LHR", departureDate: "2026-10-10",
    } });
    assert.equal(result.isError, true);
    assert.match(JSON.stringify(result), /credentials are not configured/);
    assert.ok((await client.listTools()).tools.some((tool) => tool.name === "search_hotels"));
  } finally {
    await client.close();
  }
});

test("all eight API tools report sanitized execution failures", async () => {
  const server = new McpServer({ name: "travel-test", version: "1.0.0" });
  const getClient = () => { throw new Error("synthetic-secret-123456 provider rejection"); };
  registerFlightTools(server, getClient);
  registerHotelTools(server, getClient);
  registerLocationTools(server, getClient);
  const client = new Client({ name: "test-client", version: "1.0.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const cases = [
    ["search_flights", { origin: "CDG", destination: "LHR", departureDate: "2026-10-10" }],
    ["analyze_flight_prices", { origin: "CDG", destination: "LHR", departureDate: "2026-10-10" }],
    ["search_hotels", { cityCode: "PAR", checkInDate: "2026-10-10", checkOutDate: "2026-10-12" }],
    ["get_hotel_ratings", { hotelIds: ["XKPARC12"] }],
    ["search_airports", { keyword: "Paris" }],
    ["get_airline_info", { airlineCodes: "AF" }],
    ["search_cities", { keyword: "Paris" }],
    ["search_tours_activities", { latitude: 48.85, longitude: 2.35 }],
  ] as const;
  try {
    await server.connect(serverTransport);
    await client.connect(clientTransport);
    for (const [name, args] of cases) {
      const result = await client.callTool({ name, arguments: args });
      assert.equal(result.isError, true, name);
      assert.doesNotMatch(JSON.stringify(result), /synthetic-secret-123456/, name);
    }
  } finally {
    await client.close();
    await server.close();
  }
});
