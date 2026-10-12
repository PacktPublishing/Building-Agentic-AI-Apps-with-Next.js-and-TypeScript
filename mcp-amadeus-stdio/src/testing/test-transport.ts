import { McpServer, createMcpHandler } from "@modelcontextprotocol/server";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/client";

// Exercise modern serving with isolated in-process HTTP; real STDIO is tested separately.
export function createTestTransport(createServer: () => McpServer) {
  const handler = createMcpHandler(createServer, { legacy: "reject" });
  return new StreamableHTTPClientTransport(
    new URL("http://localhost/api/mcp"),
    {
      fetch: async (input, init) => handler.fetch(new Request(input, init)),
    },
  );
}
