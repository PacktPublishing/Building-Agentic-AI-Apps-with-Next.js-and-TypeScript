import assert from "node:assert/strict";
import { test } from "node:test";
import { Client } from "@modelcontextprotocol/client";
import { McpServer } from "@modelcontextprotocol/server";
import { createTestTransport } from "../testing/test-transport.js";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { fileURLToPath } from "node:url";
import { registerFlightTools } from "./flights.js";
import { registerHotelTools } from "./hotels.js";
import { registerLocationTools } from "./locations.js";

test("an API failure is an MCP tool error while capability listing remains available", async () => {
  const createServer = () => {
    const server = new McpServer({ name: "travel-test", version: "1.0.0" });
    registerFlightTools(server, () => {
      throw new Error("synthetic provider failure");
    });
    return server;
  };
  const client = new Client(
    { name: "test-client", version: "1.0.0" },
    { versionNegotiation: { mode: { pin: "2026-07-28" } } },
  );
  const clientTransport = createTestTransport(createServer);
  try {
    await client.connect(clientTransport);
    assert.ok(
      (await client.listTools()).tools.some(
        (tool) => tool.name === "search_flights",
      ),
    );
    const result = await client.callTool({
      name: "search_flights",
      arguments: {
        origin: "CDG",
        destination: "LHR",
        departureDate: "2026-10-10",
      },
    });
    assert.equal(result.isError, true);
  } finally {
    await client.close();
  }
});

test("the actual STDIO server lists tools without credentials and stays usable after an API error", async () => {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: ["--import", "tsx", "src/index.ts"],
    cwd: fileURLToPath(new URL("../../", import.meta.url)),
    env: {
      PATH: process.env.PATH ?? "",
      AMADEUS_CLIENT_ID: "",
      AMADEUS_CLIENT_SECRET: "",
    },
    stderr: "pipe",
  });
  const client = new Client(
    { name: "stdio-test", version: "1.0.0" },
    { versionNegotiation: { mode: { pin: "2026-07-28" } } },
  );
  try {
    await client.connect(transport);
    assert.ok(
      (await client.listTools()).tools.some(
        (tool) => tool.name === "search_flights",
      ),
    );
    const result = await client.callTool({
      name: "search_flights",
      arguments: {
        origin: "CDG",
        destination: "LHR",
        departureDate: "2026-10-10",
      },
    });
    assert.equal(result.isError, true);
    assert.match(JSON.stringify(result), /credentials are not configured/);
    assert.ok(
      (await client.listTools()).tools.some(
        (tool) => tool.name === "search_hotels",
      ),
    );
  } finally {
    await client.close();
  }
});

test("all eight API tools report sanitized execution failures", async () => {
  const getClient = () => {
    throw new Error("synthetic-secret-123456 provider rejection");
  };
  const createServer = () => {
    const server = new McpServer({ name: "travel-test", version: "1.0.0" });
    registerFlightTools(server, getClient);
    registerHotelTools(server, getClient);
    registerLocationTools(server, getClient);
    return server;
  };
  const client = new Client(
    { name: "test-client", version: "1.0.0" },
    { versionNegotiation: { mode: { pin: "2026-07-28" } } },
  );
  const clientTransport = createTestTransport(createServer);
  const cases = [
    [
      "search_flights",
      { origin: "CDG", destination: "LHR", departureDate: "2026-10-10" },
    ],
    [
      "analyze_flight_prices",
      { origin: "CDG", destination: "LHR", departureDate: "2026-10-10" },
    ],
    [
      "search_hotels",
      {
        cityCode: "PAR",
        checkInDate: "2026-10-10",
        checkOutDate: "2026-10-12",
      },
    ],
    ["get_hotel_ratings", { hotelIds: ["XKPARC12"] }],
    ["search_airports", { keyword: "Paris" }],
    ["get_airline_info", { airlineCodes: "AF" }],
    ["search_cities", { keyword: "Paris" }],
    ["search_tours_activities", { latitude: 48.85, longitude: 2.35 }],
  ] as const;
  try {
    await client.connect(clientTransport);
    for (const [name, args] of cases) {
      const result = await client.callTool({ name, arguments: args });
      assert.equal(result.isError, true, name);
      assert.doesNotMatch(
        JSON.stringify(result),
        /synthetic-secret-123456/,
        name,
      );
    }
  } finally {
    await client.close();
  }
});

test("all eight API tools keep successful adapter results successful", async () => {
  const calls: string[] = [];
  const adapter = Object.fromEntries(
    [
      "searchFlights",
      "analyzeFlightPrices",
      "searchHotels",
      "getHotelRatings",
      "searchAirports",
      "getAirlineInfo",
      "searchCities",
      "searchToursActivities",
    ].map((name) => [
      name,
      async () => {
        calls.push(name);
        return { success: true, data: [] };
      },
    ]),
  );
  const getClient = () => adapter as never;
  const createServer = () => {
    const server = new McpServer({ name: "travel-test", version: "1.0.0" });
    registerFlightTools(server, getClient);
    registerHotelTools(server, getClient);
    registerLocationTools(server, getClient);
    return server;
  };
  const client = new Client(
    { name: "test-client", version: "1.0.0" },
    { versionNegotiation: { mode: { pin: "2026-07-28" } } },
  );
  const clientTransport = createTestTransport(createServer);
  const cases = [
    [
      "search_flights",
      { origin: "CDG", destination: "LHR", departureDate: "2026-10-10" },
    ],
    [
      "analyze_flight_prices",
      { origin: "CDG", destination: "LHR", departureDate: "2026-10-10" },
    ],
    [
      "search_hotels",
      {
        cityCode: "PAR",
        checkInDate: "2026-10-10",
        checkOutDate: "2026-10-12",
      },
    ],
    ["get_hotel_ratings", { hotelIds: ["XKPARC12"] }],
    ["search_airports", { keyword: "Paris" }],
    ["get_airline_info", { airlineCodes: "AF" }],
    ["search_cities", { keyword: "Paris" }],
    ["search_tours_activities", { latitude: 48.85, longitude: 2.35 }],
  ] as const;
  try {
    await client.connect(clientTransport);
    for (const [name, args] of cases) {
      const result = await client.callTool({ name, arguments: args });
      assert.notEqual(result.isError, true, name);
      assert.ok(Array.isArray(result.content), name);
      assert.deepEqual(
        JSON.parse((result.content[0] as { text: string }).text),
        { success: true, data: [] },
        name,
      );
    }
    assert.equal(calls.length, cases.length);
  } finally {
    await client.close();
  }
});

test("an upstream rejection remains a sanitized MCP tool error", async () => {
  const createServer = () => {
    const server = new McpServer({ name: "travel-test", version: "1.0.0" });
    registerFlightTools(
      server,
      () =>
        ({
          searchFlights: async () => {
            throw new Error("upstream-secret-123456 rejected request");
          },
        }) as never,
    );
    return server;
  };
  const client = new Client(
    { name: "test-client", version: "1.0.0" },
    { versionNegotiation: { mode: { pin: "2026-07-28" } } },
  );
  const clientTransport = createTestTransport(createServer);
  try {
    await client.connect(clientTransport);
    const result = await client.callTool({
      name: "search_flights",
      arguments: {
        origin: "CDG",
        destination: "LHR",
        departureDate: "2026-10-10",
      },
    });
    assert.equal(result.isError, true);
    assert.doesNotMatch(JSON.stringify(result), /upstream-secret-123456/);
  } finally {
    await client.close();
  }
});
