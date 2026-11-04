#!/usr/bin/env node

/**
 * MCP Amadeus STDIO Server – Entry Point
 *
 * Launches a Model Context Protocol server over STDIO transport,
 * exposing Amadeus Travel API capabilities as MCP tools, resources,
 * and prompt templates.
 *
 * Usage:
 *   npx tsx src/index.ts          # development
 *   node dist/index.js            # production (after tsc)
 */

import "dotenv/config";

import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";

import { AmadeusClient, getAmadeusConfig } from "./amadeus/client.js";
import { registerFlightTools } from "./tools/flights.js";
import { registerHotelTools } from "./tools/hotels.js";
import { registerLocationTools } from "./tools/locations.js";
import { registerTravelResources } from "./resources/travel-data.js";
import { registerTravelPrompts } from "./prompts/travel-prompts.js";

// ── Lazy Amadeus client ──────────────────────────────────────────────────────
// The client is created on first tool invocation, not at startup.
// This keeps the process alive even if Amadeus credentials are missing
// (useful for introspection / capability listing via MCP Inspector).

let amadeusClient: AmadeusClient | null = null;

function getClient(): AmadeusClient {
  if (!amadeusClient) {
    const config = getAmadeusConfig();
    amadeusClient = new AmadeusClient(config);
  }
  return amadeusClient;
}

// ── MCP server ───────────────────────────────────────────────────────────────

function createServer() {
  const server = new McpServer({
    name: "amadeus-travel-stdio",
    version: "2.0.0",
  });

  // Register all MCP primitives
  registerFlightTools(server, getClient);
  registerHotelTools(server, getClient);
  registerLocationTools(server, getClient);
  registerTravelResources(server);
  registerTravelPrompts(server);

  return server;
}

// ── Connect via STDIO transport ──────────────────────────────────────────────

async function main() {
  await serveStdio(createServer, { legacy: "reject" });

  // Log to stderr so it doesn't pollute the JSON-RPC channel on stdout
  console.error("Amadeus MCP STDIO server running – waiting for requests …");
}

main().catch((err) => {
  console.error("Fatal error starting MCP server:", err);
  process.exit(1);
});
