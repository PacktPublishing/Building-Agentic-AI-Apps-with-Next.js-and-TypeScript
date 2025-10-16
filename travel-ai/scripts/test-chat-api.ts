#!/usr/bin/env tsx

/**
 * Manual test script for Chat API routes
 * Usage: pnpm tsx scripts/test-chat-api.ts
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

interface SSEEvent {
    type: string;
    data?: any;
}

async function testStartChat() {
    console.log('\n🧪 Testing POST /api/chat/start');
    console.log('─'.repeat(70));

    const response = await fetch(`${BASE_URL}/api/chat/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            message: 'Hello! I want to plan a trip to Paris.'
        }),
    });

    if (!response.ok) {
        console.error('❌ Failed:', response.status, response.statusText);
        return null;
    }

    const data = await response.json();
    console.log('✅ Response:', JSON.stringify(data, null, 2));
    return data.threadId;
}

async function testStartChatWithTools() {
    console.log('\n🧪 Testing POST /api/chat/start (with tool calls)');
    console.log('─'.repeat(70));

    const response = await fetch(`${BASE_URL}/api/chat/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            message: 'Search for good activities in Paris'
        }),
    });

    if (!response.ok) {
        console.error('❌ Failed:', response.status, response.statusText);
        return null;
    }

    const data = await response.json();
    console.log('✅ Response:');
    console.log('  Thread ID:', data.threadId);
    console.log('  Requires Approval:', data.requiresApproval);
    
    if (data.toolCalls) {
        console.log('  Tool Calls:');
        data.toolCalls.forEach((call: any, idx: number) => {
            console.log(`    ${idx + 1}. ${call.name}`);
            console.log(`       Args:`, JSON.stringify(call.args, null, 2));
        });
    }
    
    if (data.response) {
        console.log('  Response:', data.response);
    }

    return data;
}

async function testContinueChat(threadId: string, approved: boolean) {
    console.log(`\n🧪 Testing POST /api/chat/continue (approved: ${approved})`);
    console.log('─'.repeat(70));

    const response = await fetch(`${BASE_URL}/api/chat/continue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            threadId,
            approved,
        }),
    });

    if (!response.ok) {
        console.error('❌ Failed:', response.status, response.statusText);
        return;
    }

    console.log('📡 Reading SSE stream...\n');

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    const events: SSEEvent[] = [];
    let fullResponse = '';

    if (reader) {
        while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    try {
                        const event: SSEEvent = JSON.parse(line.substring(6));
                        events.push(event);

                        switch (event.type) {
                            case 'start':
                                console.log('🚀 Stream started');
                                break;
                            case 'token':
                                process.stdout.write(event.data.content);
                                fullResponse += event.data.content;
                                break;
                            case 'toolCall':
                                console.log(`\n🔧 Tool Call: ${event.data.name}`);
                                console.log('   Args:', JSON.stringify(event.data.args, null, 2));
                                break;
                            case 'complete':
                                console.log('\n\n✅ Stream completed');
                                if (event.data.requiresApproval) {
                                    console.log('⚠️  Requires approval for next step');
                                }
                                break;
                            case 'error':
                                console.log('\n❌ Error:', event.data.error);
                                break;
                        }
                    } catch (e) {
                        // Ignore parse errors
                    }
                }
            }
        }
    }

    console.log('\n📊 Summary:');
    console.log(`  Total events: ${events.length}`);
    console.log(`  Response length: ${fullResponse.length} chars`);
}

async function testContinueChatWithMessage(threadId: string, message: string) {
    console.log(`\n🧪 Testing POST /api/chat/continue (with new message)`);
    console.log('─'.repeat(70));
    console.log('💬 Message:', message);

    const response = await fetch(`${BASE_URL}/api/chat/continue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            threadId,
            approved: false,
            message,
        }),
    });

    if (!response.ok) {
        console.error('❌ Failed:', response.status, response.statusText);
        return;
    }

    console.log('📡 Reading SSE stream...\n');

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (reader) {
        while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    try {
                        const event: SSEEvent = JSON.parse(line.substring(6));
                        if (event.type === 'token') {
                            process.stdout.write(event.data.content);
                        } else if (event.type === 'complete') {
                            console.log('\n✅ Complete');
                        }
                    } catch (e) {
                        // Ignore
                    }
                }
            }
        }
    }
}

async function main() {
    console.log('🚀 Chat API Test Suite');
    console.log('═'.repeat(70));
    console.log('Base URL:', BASE_URL);
    console.log('Make sure the dev server is running: pnpm dev');
    console.log('═'.repeat(70));

    try {
        // Test 1: Simple start
        const threadId1 = await testStartChat();
        
        if (threadId1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            await testContinueChatWithMessage(threadId1, 'Tell me more about the Eiffel Tower');
        }

        // Test 2: Start with tools
        await new Promise(resolve => setTimeout(resolve, 2000));
        const chatData = await testStartChatWithTools();
        
        if (chatData && chatData.requiresApproval) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            await testContinueChat(chatData.threadId, true);
        }

        console.log('\n\n🎉 All tests completed!');
        console.log('═'.repeat(70));

    } catch (error) {
        console.error('\n❌ Test failed:', error);
        process.exit(1);
    }
}

main();
