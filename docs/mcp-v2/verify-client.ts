import assert from "node:assert/strict";
import {
  getMcpTools,
  closeMcpClient,
} from "../../travel-ai/ai/tools/mcp-client";
async function main() {
  try {
    const tools = await getMcpTools();
    assert.equal(tools.length, 8);
    assert.ok(tools.some((tool) => tool.name === "get_hotel_ratings"));
    const city = tools.find((tool) => tool.name === "search_cities");
    assert.ok(city);
    assert.ok(
      JSON.stringify(await city.invoke({ keyword: "Paris" })).includes(
        "fixture-city",
      ),
    );
    console.log(
      "PASS actual Travel AI MCP singleton: validation, unprefixed names, modern invocation",
    );
  } finally {
    await closeMcpClient();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
