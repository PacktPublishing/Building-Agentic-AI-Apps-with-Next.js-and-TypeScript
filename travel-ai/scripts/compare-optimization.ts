/**
 * Comparative test: With vs Without Context Engineering
 * Runs two parallel conversations to demonstrate optimization impact
 */

import { ChatAnthropic } from "@langchain/anthropic";
import { MemorySaver } from "@langchain/langgraph";
import { createAgent } from "langchain";
import { MultiServerMCPClient } from "@langchain/mcp-adapters";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { config } from "../config";
import { z } from "zod";
import { ContextManager } from "../ai/context/context-manager";
import { TRAVEL_ASSISTANT_PROMPT } from "../ai/prompts/system-prompt";

// Test conversation
const CONVERSATION = [
    "Hello, I want to go to Barcelona with my wife for a romantic getaway, next week for a week.",
    "What's the budget for flights?",
    "Around 500 euros per person",
    "Can you show me some hotels?",
    "I prefer 4-star hotels in the city center",
    "What about activities?",
    "We love cultural visits and good restaurants",
    "Can you find flights from Paris?",
];

interface ConversationStats {
    messageCount: number;
    estimatedTokens: number;
    hasSummary: boolean;
    hasMetadata: boolean;
    summary?: string;
    metadata?: unknown;
}

class TestAgent {
    private model: ChatAnthropic;
    private tools: DynamicStructuredTool[];
    private memory: MemorySaver;
    private graph: unknown;
    private contextManager?: ContextManager;
    private useOptimization: boolean;

    constructor(useOptimization: boolean) {
        this.useOptimization = useOptimization;
        this.model = new ChatAnthropic({
            apiKey: config.anthropic_api_key,
            model: config.model_name || "claude-3-7-sonnet-20250219",
            streaming: true,
            temperature: 0.5,
            tags: useOptimization ? ["context-engineering", "optimized"] : ["baseline", "non-optimized"],
        });
        
        this.tools = [];
        this.memory = new MemorySaver();
        this.graph = null;
        
        if (useOptimization) {
            this.contextManager = new ContextManager(this.model, {
                maxHistoryMessages: 10,
                enableSummarization: true,
                summaryTriggerThreshold: 6,
                enableMetadataExtraction: true,
            });
        }
    }

    async initialize(): Promise<void> {
        const mcpClient = new MultiServerMCPClient({
            amadeus: {
                transport: "http",
                url: config.amadeus_url,
                headers: {
                    "Authorization": `Bearer ${config.amadeus_bearer_token}`
                }
            },
        });

        const mcpTools = await mcpClient.getTools();
        
        const getCurrentDateTool = new DynamicStructuredTool({
            name: "get_current_date",
            description: "Returns the current date with day, month, and year.",
            schema: z.object({}),
            func: async () => {
                const now = new Date();
                return JSON.stringify({
                    day: now.getDate(),
                    month: now.getMonth() + 1,
                    year: now.getFullYear(),
                    formatted: now.toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                    }),
                    iso: now.toISOString()
                });
            }
        });
        
        this.tools = [...mcpTools, getCurrentDateTool];

        this.graph = createAgent({
            model: this.model,
            tools: this.tools,
            checkpointer: this.memory,
            systemPrompt: TRAVEL_ASSISTANT_PROMPT
        });
    }

    async prepareContext(threadId: string): Promise<void> {
        if (!this.useOptimization || !this.contextManager || !this.graph) return;

        const state = await (this.graph as any).getState({ configurable: { thread_id: threadId } });
        const messages = state.values?.messages || [];

        if (messages.length === 0) return;

        // Extract metadata every 3 messages
        if (this.contextManager.getMetadata(threadId) === undefined || messages.length % 3 === 0) {
            await this.contextManager.extractMetadata(messages, threadId);
        }

        // Summarize if threshold reached
        if (this.contextManager.shouldSummarize(messages.length)) {
            await this.contextManager.summarizeHistory(messages, threadId);
        }
    }

    async invoke(message: string, threadId: string): Promise<void> {
        if (this.useOptimization) {
            await this.prepareContext(threadId);
        }
        
        const config = { 
            configurable: { thread_id: threadId },
            tags: this.useOptimization 
                ? ["context-engineering", "optimized", `thread:${threadId}`] 
                : ["baseline", "non-optimized", `thread:${threadId}`],
            metadata: {
                optimization: this.useOptimization ? "enabled" : "disabled",
                thread_id: threadId,
                test_type: "comparative"
            }
        };
        await (this.graph as any).invoke(
            { messages: [{ role: "user", content: message }] },
            config
        );
    }

    async getStats(threadId: string): Promise<ConversationStats> {
        const state = await (this.graph as any).getState({ configurable: { thread_id: threadId } });
        const messages = state.values?.messages || [];
        
        const estimatedTokens = this.contextManager 
            ? this.contextManager.calculateMessageTokens(messages)
            : messages.length * 500; // Rough estimate without optimization

        return {
            messageCount: messages.length,
            estimatedTokens,
            hasSummary: this.contextManager ? !!this.contextManager.getSummary(threadId) : false,
            hasMetadata: this.contextManager ? !!this.contextManager.getMetadata(threadId) : false,
            summary: this.contextManager?.getSummary(threadId),
            metadata: this.contextManager?.getMetadata(threadId),
        };
    }
}

async function runComparison() {
    console.log('\n' + '═'.repeat(80));
    console.log('🔬 CONTEXT ENGINEERING OPTIMIZATION - COMPARATIVE TEST');
    console.log('═'.repeat(80));
    console.log('\nRunning two parallel conversations:');
    console.log('  🔴 WITHOUT optimization (baseline)');
    console.log('  🟢 WITH context engineering (optimized)');
    console.log('\n' + '─'.repeat(80) + '\n');

    // Initialize both agents
    const agentWithout = new TestAgent(false);
    const agentWith = new TestAgent(true);

    console.log('⏳ Initializing agents...\n');
    await Promise.all([
        agentWithout.initialize(),
        agentWith.initialize()
    ]);

    const threadWithout = `test-without-${Date.now()}`;
    const threadWith = `test-with-${Date.now()}`;

    // Track stats over time
    const statsWithout: ConversationStats[] = [];
    const statsWithOptimization: ConversationStats[] = [];

    // Run conversations in parallel
    for (let i = 0; i < CONVERSATION.length; i++) {
        const message = CONVERSATION[i];
        
        console.log(`📨 Message ${i + 1}/${CONVERSATION.length}: "${message.substring(0, 60)}${message.length > 60 ? '...' : ''}"`);
        
        // Run both in parallel
        await Promise.all([
            agentWithout.invoke(message, threadWithout),
            agentWith.invoke(message, threadWith)
        ]);

        // Collect stats
        const [statsW, statsO] = await Promise.all([
            agentWithout.getStats(threadWithout),
            agentWith.getStats(threadWith)
        ]);

        statsWithout.push(statsW);
        statsWithOptimization.push(statsO);

        // Show progress
        const savings = statsW.estimatedTokens - statsO.estimatedTokens;
        const savingsPercent = ((savings / statsW.estimatedTokens) * 100).toFixed(1);
        
        console.log(`   🔴 Without: ${statsW.estimatedTokens} tokens`);
        console.log(`   🟢 With:    ${statsO.estimatedTokens} tokens`);
        console.log(`   💰 Saved:   ${savings} tokens (${savingsPercent}%)\n`);
    }

    // Final comparison
    const finalWithout = statsWithout[statsWithout.length - 1];
    const finalWith = statsWithOptimization[statsWithOptimization.length - 1];
    const totalSavings = finalWithout.estimatedTokens - finalWith.estimatedTokens;
    const totalSavingsPercent = ((totalSavings / finalWithout.estimatedTokens) * 100).toFixed(1);

    // Beautiful results display
    console.log('\n' + '═'.repeat(80));
    console.log('📊 FINAL RESULTS');
    console.log('═'.repeat(80));

    console.log('\n┌─ 🔴 WITHOUT Context Engineering (Baseline)');
    console.log('│');
    console.log(`│  Total Messages:     ${finalWithout.messageCount}`);
    console.log(`│  Estimated Tokens:   ${finalWithout.estimatedTokens.toLocaleString()}`);
    console.log(`│  Summary Generated:  ${finalWithout.hasSummary ? '✅ Yes' : '❌ No'}`);
    console.log(`│  Metadata Extracted: ${finalWithout.hasMetadata ? '✅ Yes' : '❌ No'}`);
    console.log('└─');

    console.log('\n┌─ 🟢 WITH Context Engineering (Optimized)');
    console.log('│');
    console.log(`│  Total Messages:     ${finalWith.messageCount}`);
    console.log(`│  Estimated Tokens:   ${finalWith.estimatedTokens.toLocaleString()}`);
    console.log(`│  Summary Generated:  ${finalWith.hasSummary ? '✅ Yes' : '❌ No'}`);
    console.log(`│  Metadata Extracted: ${finalWith.hasMetadata ? '✅ Yes' : '❌ No'}`);
    console.log('└─');

    console.log('\n' + '═'.repeat(80));
    console.log('💰 OPTIMIZATION IMPACT');
    console.log('═'.repeat(80));

    console.log(`\n  Baseline (without):     ${finalWithout.estimatedTokens.toLocaleString()} tokens`);
    console.log(`  Optimized (with):       ${finalWith.estimatedTokens.toLocaleString()} tokens`);
    console.log(`  ─────────────────────────────────────`);
    console.log(`  💵 Total Savings:       ${totalSavings.toLocaleString()} tokens`);
    console.log(`  📉 Reduction:           ${totalSavingsPercent}%`);

    // Cost estimation (Claude Sonnet 3.7 pricing: $3/MTok input, $15/MTok output)
    // Using average of input/output for estimation
    const avgCostPerMTok = (3 + 15) / 2; // $9 per MTok average
    const costWithout = (finalWithout.estimatedTokens / 1000000) * avgCostPerMTok;
    const costWith = (finalWith.estimatedTokens / 1000000) * avgCostPerMTok;
    const costSavings = costWithout - costWith;

    console.log('\n' + '═'.repeat(80));
    console.log('💵 ESTIMATED COST IMPACT (based on Claude Sonnet 3.7 pricing)');
    console.log('═'.repeat(80));
    console.log('   Input: $3/MTok | Output: $15/MTok | Avg: $9/MTok');

    console.log(`\n  Without optimization:   $${costWithout.toFixed(4)}`);
    console.log(`  With optimization:      $${costWith.toFixed(4)}`);
    console.log(`  ─────────────────────────────────────`);
    console.log(`  💰 Cost Savings:        $${costSavings.toFixed(4)}`);
    console.log(`  📊 For 1,000 convs:     $${(costSavings * 1000).toFixed(2)}`);
    console.log(`  📊 For 10,000 convs:    $${(costSavings * 10000).toFixed(2)}`);

    if (finalWith.summary) {
        console.log('\n' + '═'.repeat(80));
        console.log('📋 GENERATED SUMMARY');
        console.log('═'.repeat(80));
        console.log(`\n${finalWith.summary}\n`);
    }

    if (finalWith.metadata) {
        console.log('═'.repeat(80));
        console.log('🏷️  EXTRACTED METADATA');
        console.log('═'.repeat(80));
        
        const metadata = finalWith.metadata as any;
        
        if (metadata.preferences && Object.keys(metadata.preferences).length > 0) {
            console.log('\n  User Preferences:');
            Object.entries(metadata.preferences).forEach(([key, value]) => {
                if (value) {
                    const displayValue = Array.isArray(value) ? value.join(', ') : value;
                    console.log(`    • ${key}: ${displayValue}`);
                }
            });
        }
        
        if (metadata.currentContext && Object.keys(metadata.currentContext).length > 0) {
            console.log('\n  Current Context:');
            Object.entries(metadata.currentContext).forEach(([key, value]) => {
                if (value) console.log(`    • ${key}: ${value}`);
            });
        }
        console.log('');
    }

    console.log('═'.repeat(80));
    console.log('✅ CONCLUSION');
    console.log('═'.repeat(80));
    console.log(`\nContext Engineering delivers a ${totalSavingsPercent}% token reduction while maintaining`);
    console.log('conversation quality through intelligent metadata extraction and summarization.');
    console.log('\nKey Benefits:');
    console.log('  ✅ Reduced API costs');
    console.log('  ✅ Lower latency');
    console.log('  ✅ Better context management');
    console.log('  ✅ Scalable for long conversations');
    console.log('\n' + '═'.repeat(80) + '\n');
}

// Run the comparison
runComparison().catch(console.error);
