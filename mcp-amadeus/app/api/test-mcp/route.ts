import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ message: "MCP test endpoint working" });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log("Received MCP request:", body);
    
    if (body.method === "tools/list") {
      return NextResponse.json({
        jsonrpc: "2.0",
        id: body.id,
        result: {
          tools: [
            {
              name: "search_flights",
              description: "Search for flights between two airports",
              inputSchema: {
                type: "object",
                properties: {
                  origin: { type: "string" },
                  destination: { type: "string" },
                  departureDate: { type: "string" }
                }
              }
            }
          ]
        }
      });
    }
    
    return NextResponse.json({
      jsonrpc: "2.0",
      id: body.id,
      error: { code: -32601, message: "Method not found" }
    });
    
  } catch (error) {
    console.error("Error processing MCP request:", error);
    return NextResponse.json({
      jsonrpc: "2.0",
      id: 1,
      error: { code: -32700, message: "Parse error" }
    }, { status: 400 });
  }
}
