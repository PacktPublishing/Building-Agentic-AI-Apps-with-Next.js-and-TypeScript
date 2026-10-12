import assert from "node:assert/strict";
import { test } from "node:test";
import { NextRequest } from "next/server";
import { GET, POST } from "../app/api/[transport]/route";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

function request(method: "GET" | "POST", headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost:3000/api/mcp", {
    method,
    headers: {
      accept: "application/json, text/event-stream",
      "content-type": "application/json",
      ...headers,
    },
    ...(method === "POST" ? { body: JSON.stringify({
      jsonrpc: "2.0", id: 1, method: "initialize",
      params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "test", version: "1" } },
    }) } : {}),
  });
}

test("the real MCP route fails closed when its server token is missing", async () => {
  const previous = process.env.MCP_BEARER_TOKEN;
  delete process.env.MCP_BEARER_TOKEN;
  try {
    const response = await POST(request("POST", { authorization: "Bearer arbitrary" }));
    assert.equal(response.status, 401);
    assert.match(response.headers.get("www-authenticate") ?? "", /^Bearer/);
  } finally {
    if (previous === undefined) delete process.env.MCP_BEARER_TOKEN;
    else process.env.MCP_BEARER_TOKEN = previous;
  }
});

test("two authenticated SDK clients can initialize and list tools concurrently", async () => {
  const previous = process.env.MCP_BEARER_TOKEN;
  const previousId = process.env.AMADEUS_CLIENT_ID;
  const previousSecret = process.env.AMADEUS_CLIENT_SECRET;
  process.env.MCP_BEARER_TOKEN = "synthetic-valid-token";
  delete process.env.AMADEUS_CLIENT_ID;
  delete process.env.AMADEUS_CLIENT_SECRET;
  const clients = [1, 2].map(() => new Client({ name: "test-client", version: "1.0.0" }));
  const transport = () => new StreamableHTTPClientTransport(new URL("http://localhost:3000/api/mcp"), {
    requestInit: { headers: { Authorization: "Bearer synthetic-valid-token" } },
    fetch: async (input, init) => {
      const incoming = new NextRequest(new Request(input, init));
      return incoming.method === "POST" ? POST(incoming) : GET(incoming);
    },
  });
  try {
    await Promise.all(clients.map((client) => client.connect(transport())));
    const listings = await Promise.all(clients.map((client) => client.listTools()));
    for (const listing of listings) assert.ok(listing.tools.some((tool) => tool.name === "search_flights"));
    const result = await clients[0].callTool({ name: "search_flights", arguments: {
      origin: "CDG", destination: "LHR", departureDate: "2026-10-10",
    } });
    assert.equal(result.isError, true);
    assert.match(JSON.stringify(result), /configuration is missing or invalid/);
  } finally {
    await Promise.allSettled(clients.map((client) => client.close()));
    if (previous === undefined) delete process.env.MCP_BEARER_TOKEN;
    else process.env.MCP_BEARER_TOKEN = previous;
    if (previousId === undefined) delete process.env.AMADEUS_CLIENT_ID;
    else process.env.AMADEUS_CLIENT_ID = previousId;
    if (previousSecret === undefined) delete process.env.AMADEUS_CLIENT_SECRET;
    else process.env.AMADEUS_CLIENT_SECRET = previousSecret;
  }
});

test("the real MCP route rejects wrong bearer and disallowed Origin", async () => {
  const previousToken = process.env.MCP_BEARER_TOKEN;
  const previousOrigins = process.env.MCP_ALLOWED_ORIGINS;
  process.env.MCP_BEARER_TOKEN = "synthetic-valid-token";
  process.env.MCP_ALLOWED_ORIGINS = "https://trusted.example";
  try {
    for (const authorization of [undefined, "Bearer ", "Basic synthetic-valid-token", "Bearer wrong", "Bearer synthetic-valid-token extra"]) {
      assert.equal((await GET(request("GET", authorization ? { authorization } : {}))).status, 401);
    }
    assert.equal((await POST(request("POST", {
      authorization: "Bearer synthetic-valid-token", origin: "https://evil.example",
    }))).status, 403);
    assert.equal((await POST(request("POST", {
      authorization: "Bearer synthetic-valid-token", origin: "null",
    }))).status, 403);
    const legacy = new NextRequest("http://localhost:3000/api/sse", {
      method: "GET", headers: { authorization: "Bearer synthetic-valid-token" },
    });
    assert.equal((await GET(legacy)).status, 404);
  } finally {
    if (previousToken === undefined) delete process.env.MCP_BEARER_TOKEN;
    else process.env.MCP_BEARER_TOKEN = previousToken;
    if (previousOrigins === undefined) delete process.env.MCP_ALLOWED_ORIGINS;
    else process.env.MCP_ALLOWED_ORIGINS = previousOrigins;
  }
});
