import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(new URL('../../travel-ai/package.json', import.meta.url));
const { StateGraph, MessagesAnnotation, MemorySaver, START, END } = await import(require.resolve('@langchain/langgraph'));
const graph = new StateGraph(MessagesAnnotation)
  .addNode('remember', () => ({})).addEdge(START, 'remember').addEdge('remember', END)
  .compile({ checkpointer: new MemorySaver() });
const alpha = { configurable: { thread_id: 'alpha' } };
const beta = { configurable: { thread_id: 'beta' } };
await graph.invoke({ messages: [{ role: 'user', content: 'Remember Paris' }] }, alpha);
await graph.invoke({ messages: [{ role: 'user', content: 'Remember Tokyo' }] }, beta);
await graph.invoke({ messages: [{ role: 'user', content: 'Follow up' }] }, alpha);
const stateA = await graph.getState(alpha);
const stateB = await graph.getState(beta);
assert.equal(stateA.values.messages.length, 2);
assert.equal(stateB.values.messages.length, 1);
assert.equal(stateA.values.messages[0].content, 'Remember Paris');
assert.equal(stateB.values.messages[0].content, 'Remember Tokyo');
console.log('PASS application memory: independent thread state persists across invocations; no MCP session is required');
