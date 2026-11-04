import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const req = createRequire(path.join(root, 'mcp-amadeus-stdio/package.json'));
const { Client, StreamableHTTPClientTransport } = await import(req.resolve('@modelcontextprotocol/client'));
const { StdioClientTransport } = await import(req.resolve('@modelcontextprotocol/client/stdio'));
const clientOptions = { versionNegotiation: { mode: { pin: '2026-07-28' } } };
const stdio = new Client({ name: 'book-verification', version: '1.0.0' }, clientOptions);
const transport = new StdioClientTransport({
  command: process.execPath,
  args: ['--require', path.join(root, 'docs/mcp-v2/fake-amadeus.cjs'), path.join(root, 'mcp-amadeus-stdio/dist/index.js')],
  env: { PATH: process.env.PATH, AMADEUS_CLIENT_ID: 'fixture', AMADEUS_CLIENT_SECRET: 'fixture' },
  stderr: 'pipe',
});
await stdio.connect(transport);
try {
  assert.equal(stdio.getProtocolEra(), 'modern');
  const stdioTools = (await stdio.listTools()).tools;
  assert.equal(stdioTools.length, 8);
  assert.ok(stdioTools.some(tool => tool.name === 'get_hotel_ratings'));
  assert.equal((await stdio.listResources()).resources.length, 3);
  assert.equal((await stdio.listPrompts()).prompts.length, 3);
  const resource = await stdio.readResource({ uri: 'travel://reference/major-airports' });
  assert.ok(resource.contents[0].text.includes('CDG'));
  const prompt = await stdio.getPrompt({ name: 'explore_destination', arguments: { city: 'Paris' } });
  assert.ok(prompt.messages[0].content.text.includes('Paris'));
  const result = await stdio.callTool({ name: 'search_cities', arguments: { keyword: 'Paris' } });
  assert.notEqual(result.isError, true);
  assert.ok(result.content[0].text.includes('fixture-city'));
  const failure = await stdio.callTool({ name: 'search_cities', arguments: { keyword: 'ERROR' } });
  assert.equal(failure.isError, true);
  console.log('PASS STDIO: modern discovery; 8 tools; 3 resources; 3 prompts; resource/prompt read; success/error tool calls');
} finally { await stdio.close(); }

if (process.argv.includes('--stdio-only')) process.exit(0);

const url = process.env.MCP_VERIFY_URL || 'http://127.0.0.1:3199/api/mcp';
const token = process.env.MCP_VERIFY_TOKEN || 'book-verification-only';
const requests = [];
const observedFetch = async (input, init) => {
  const headers = new Headers(init?.headers);
  const body = init?.body ? JSON.parse(init.body) : null;
  requests.push({ method: body?.method, headers, body });
  const response = await fetch(input, init);
  assert.equal(response.headers.get('Mcp-Session-Id'), null);
  return response;
};
const http = new Client({ name: 'book-http-verification', version: '1.0.0' }, clientOptions);
await http.connect(new StreamableHTTPClientTransport(new URL(url), {
  requestInit: { headers: { Authorization: `Bearer ${token}` } }, fetch: observedFetch,
}));
try {
  assert.equal(http.getProtocolEra(), 'modern');
  assert.equal((await http.listTools()).tools.length, 8);
  const result = await http.callTool({ name: 'search_cities', arguments: { keyword: 'Paris' } });
  assert.ok(result.content[0].text.includes('fixture-city'));
  const failure = await http.callTool({ name: 'search_cities', arguments: { keyword: 'ERROR' } });
  assert.equal(failure.isError, true);
  assert.ok(requests.some(r => r.method === 'server/discover'));
  assert.ok(!requests.some(r => r.method === 'initialize'));
  const toolRequest = requests.find(r => r.method === 'tools/call');
  assert.equal(toolRequest.headers.get('MCP-Protocol-Version'), '2026-07-28');
  assert.equal(toolRequest.headers.get('Mcp-Method'), 'tools/call');
  assert.equal(toolRequest.headers.get('Mcp-Name'), 'search_cities');
  assert.equal(toolRequest.body.params._meta['io.modelcontextprotocol/protocolVersion'], '2026-07-28');
  assert.ok(toolRequest.body.params._meta['io.modelcontextprotocol/clientInfo']);
  assert.ok(toolRequest.body.params._meta['io.modelcontextprotocol/clientCapabilities']);
  // Replay a self-contained request through a new HTTP connection.
  const replay = await fetch(url, { method: 'POST', headers: toolRequest.headers, body: JSON.stringify(toolRequest.body) });
  assert.equal(replay.status, 200);
  assert.equal(replay.headers.get('Mcp-Session-Id'), null);
  assert.ok((await replay.text()).includes('fixture-city'));
  for (const [origin, status] of [['https://evil.example', 403], ['null', 403], ['https://trusted.example', 200]]) {
    const headers = new Headers(toolRequest.headers);
    headers.set('Origin', origin);
    assert.equal((await fetch(url, { method: 'POST', headers, body: JSON.stringify(toolRequest.body) })).status, status);
  }
  for (const authorization of [undefined, 'Bearer wrong-token']) {
    const headers = { 'Content-Type': 'application/json' };
    if (authorization) headers.Authorization = authorization;
    assert.equal((await fetch(url, { method: 'POST', headers, body: '{}' })).status, 401);
  }
  assert.equal((await fetch(url, { method: 'GET', headers: { Authorization: `Bearer ${token}` } })).status, 405);
  const legacy = await fetch(url, { method: 'POST', headers: {
    Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream',
  }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {
    protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'legacy-test', version: '1' },
  } }) });
  assert.equal(legacy.status, 400);
  console.log('PASS HTTP: modern discovery; self-contained request replay; method/name/version headers; no initialize/session header; Bearer auth; Origin allowlist; legacy rejection; tool success/error');
  console.log(JSON.stringify(requests.map(r => ({ method: r.method, protocol: r.headers.get('MCP-Protocol-Version'), route: r.headers.get('Mcp-Method'), name: r.headers.get('Mcp-Name'), metadata: Object.keys(r.body?.params?._meta || {}) })), null, 2));
} finally { await http.close(); }
const appRequire = createRequire(path.join(root, 'travel-ai/package.json'));
const { MCPAdapter } = await import(appRequire.resolve('@langchain/mcp-adapters'));
const adapter = new MCPAdapter({
          prefixToolNameWithServerName: false, servers: { amadeus: {
  transport: 'http', mode: 'modern', url, headers: { Authorization: `Bearer ${token}` },
} } });
try {
  const tools = await adapter.listTools();
  assert.equal(tools.length, 8);
  const city = tools.find(t => t.name === 'search_cities');
  assert.ok(String(await city.invoke({ keyword: 'Paris' })).includes('fixture-city'));
  console.log('PASS LangChain adapter: modern tool discovery and invocation over real HTTP');
} finally { await adapter.close(); }
