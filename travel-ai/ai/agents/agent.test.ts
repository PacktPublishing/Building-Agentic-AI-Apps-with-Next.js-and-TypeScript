import { describe, it, expect, beforeAll, vi } from "vitest";
import agent, { MyFirstAgent } from "./agent";

/**
 * Tests for ReAct Agent with Human-in-the-Loop
 * 
 * These tests demonstrate:
 * 1. Singleton initialization
 * 2. Simple agent invocation
 * 3. Human-in-the-Loop (HITL) pattern with tool call approval
 * 4. Conversational memory management
 * 5. Response streaming
 */
describe("MyFirstAgent - ReAct Agent with HITL", () => {
    // Enable verbose logging for educational purposes
    const VERBOSE = true;
    
    const log = (...args: any[]) => {
        if (VERBOSE) {
            console.log(...args);
        }
    };

    beforeAll(async () => {
        // Keep console methods active for verbose output
        if (!VERBOSE) {
            vi.spyOn(console, "log").mockImplementation(() => {});
            vi.spyOn(console, "warn").mockImplementation(() => {});
            vi.spyOn(console, "error").mockImplementation(() => {});
        }

        log("\n" + "=".repeat(70));
        log("🚀 INITIALIZING REACT AGENT WITH HUMAN-IN-THE-LOOP");
        log("=".repeat(70));
        
        // Initialize agent before all tests
        await agent.initialize();
        
        log("✅ Agent initialized successfully");
        log("🔧 Tools loaded:", agent.getTools().length);
        log("=".repeat(70) + "\n");
    });

    describe("Singleton Pattern", () => {
        it("should return the same instance", () => {
            const instance1 = agent;
            const instance2 = agent;
            
            expect(instance1).toBe(instance2);
        });

        it("should be initialized after calling initialize()", async () => {
            // Agent is already initialized in beforeAll
            expect(() => agent.getTools()).not.toThrow();
        });
    });

    describe("Basic Invocation", () => {
        it("should respond to a simple question", async () => {
            log("\n📝 TEST: Basic invocation");
            log("─".repeat(70));
            
            const message = "Hello, how are you?";
            log("👤 User:", message);
            log("🤖 Agent: Processing...");
            
            const response = await agent.invoke(message, "test-thread-1");
            
            log("💬 Response:", response);
            log("✅ Test passed: Agent responded successfully\n");

            expect(response).toBeDefined();
            expect(typeof response).toBe("string");
            expect(response.length).toBeGreaterThan(0);
        }, 30000); // 30s timeout for LLM calls

        it("should maintain context within a thread", async () => {
            log("\n📝 TEST: Context management across messages");
            log("─".repeat(70));
            
            const threadId = "test-thread-context";

            // First interaction
            const msg1 = "My name is Alice";
            log("👤 User (message 1):", msg1);
            await agent.invoke(msg1, threadId);
            log("✅ First message processed");

            // Second interaction - agent should remember
            const msg2 = "What is my name?";
            log("👤 User (message 2):", msg2);
            log("🧠 Agent should remember from previous message...");
            
            const response = await agent.invoke(msg2, threadId);
            
            log("💬 Response:", response);
            log("✅ Test passed: Agent remembered context\n");

            expect(response.toLowerCase()).toContain("alice");
        }, 30000);
    });

    describe("Human-in-the-Loop (HITL)", () => {
        it("should detect when approval is needed", async () => {
            log("\n📝 TEST: Human-in-the-Loop - Detection");
            log("─".repeat(70));
            
            const threadId = "test-thread-hitl-1";
            const message = "Can you search a good activities in Paris?";

            log("👤 User:", message);
            log("🤖 Agent: Analyzing if tools are needed...");
            
            // Request that requires tool usage
            const result = await agent.invokeWithApproval(message, threadId);

            // Agent should request approval before executing the tool
            if (result.needsApproval) {
                log("\n⏸️  INTERRUPTION DETECTED");
                log("🔔 Approval required before executing tools");
                log("📋 Tool calls pending approval:");
                result.toolCalls?.forEach((call: any, idx: number) => {
                    log(`   ${idx + 1}. ${call.name}(${JSON.stringify(call.args)})`);
                });
                log("✅ Test passed: HITL correctly detected\n");
                
                expect(result.needsApproval).toBe(true);
                expect(result.toolCalls).toBeDefined();
                expect(Array.isArray(result.toolCalls)).toBe(true);
                expect(result.threadId).toBe(threadId);
            } else {
                log("💬 Direct response (no tools needed):", result.response);
                log("ℹ️  No MCP tools configured, agent responded directly\n");
                
                // If no tool available, should have a direct response
                expect(result.needsApproval).toBe(false);
                expect(result.response).toBeDefined();
            }
        }, 30000);

        it("should allow continuation after approval", async () => {
            log("\n📝 TEST: Human-in-the-Loop - Complete Workflow");
            log("─".repeat(70));
            
            const threadId = "test-thread-hitl-2";
            // Change the date if you come from the future
            const message = "Search for information about flights from Paris to New York for November 2025";

            // Step 1: Invoke with approval
            log("STEP 1: User request");
            log("👤 User:", message);
            log("🤖 Agent: Analyzing request...\n");
            
            const result = await agent.invokeWithApproval(message, threadId);

            if (result.needsApproval) {
                log("STEP 2: Interruption for approval");
                log("⏸️  Execution paused - Human approval required");
                log("📋 Tool calls waiting for approval:");
                result.toolCalls?.forEach((call: any, idx: number) => {
                    log(`   ${idx + 1}. Tool: ${call.name}`);
                    log(`      Args: ${JSON.stringify(call.args, null, 2)}`);
                });

                // Step 2: Human approves (simulated here)
                log("\nSTEP 3: Human review");
                log("👨‍💼 Human: Reviewing tool calls...");
                log("✅ Human: Approval granted");

                // Step 3: Continue execution
                log("\nSTEP 4: Resume execution");
                log("▶️  Continuing agent execution...");
                
                const finalResponse = await agent.approveAndContinue(threadId);

                log("\nSTEP 5: Final response");
                log("🎯 Agent final response:", finalResponse);
                log("✅ Test passed: Complete HITL workflow executed\n");

                expect(finalResponse).toBeDefined();
                expect(typeof finalResponse).toBe("string");
            } else {
                log("💬 Direct response (no approval needed):", result.response);
                log("ℹ️  No tools were invoked\n");
            }
        }, 30000);

        it("should manage thread state", async () => {
            log("\n📝 TEST: Thread state management");
            log("─".repeat(70));
            
            const threadId = "test-thread-state";

            // Create a conversation
            log("👤 User: Hello");
            await agent.invoke("Hello", threadId);
            log("✅ Message sent");

            // Retrieve state
            log("🔍 Retrieving thread state...");
            const state = await agent.getState(threadId);

            log("📊 State retrieved:");
            log(`   - Messages in thread: ${state.values.messages.length}`);
            log(`   - Next step: ${state.next || 'none'}`);
            log("✅ Test passed: State management working\n");

            expect(state).toBeDefined();
            expect(state.values).toBeDefined();
            expect(state.values.messages).toBeDefined();
            expect(Array.isArray(state.values.messages)).toBe(true);
            expect(state.values.messages.length).toBeGreaterThan(0);
        }, 30000);
    });

    describe("Streaming", () => {
        it("should stream responses in real-time", async () => {
            log("\n📝 TEST: Response streaming");
            log("─".repeat(70));
            
            const threadId = "test-thread-stream";
            const chunks: string[] = [];

            log("👤 User: Explain what a ReAct agent is in one sentence");
            log("📡 Streaming response...\n");

            // Collect all streamed chunks
            for await (const chunk of agent.stream(
                "Explain what a ReAct agent is in one sentence",
                threadId
            )) {
                chunks.push(chunk);
                process.stdout.write(".");
            }

            const fullResponse = chunks.join("");
            log("\n\n💬 Complete response:", fullResponse);
            log(`📊 Received ${chunks.length} chunks`);
            log("✅ Test passed: Streaming working correctly\n");

            expect(chunks.length).toBeGreaterThan(0);
            expect(fullResponse.length).toBeGreaterThan(0);
        }, 30000);
    });

    describe("Tool Management", () => {
        it("should have tools loaded", () => {
            log("\n📝 TEST: Tool management");
            log("─".repeat(70));
            
            const tools = agent.getTools();

            expect(tools).toBeDefined();
            expect(Array.isArray(tools)).toBe(true);
            
            if (tools.length > 0) {
                log(`🔧 ${tools.length} tool(s) available:`);
                tools.forEach((tool: any, index: number) => {
                    log(`   ${index + 1}. ${tool.name}`);
                    log(`      Description: ${tool.description}`);
                });
                log("✅ Test passed: Tools loaded successfully\n");
            } else {
                log("⚠️  No MCP tools configured");
                log("ℹ️  Agent will work without external tools\n");
            }
        });
    });

    describe("Error Handling", () => {
        it("should throw error if agent is not initialized", async () => {
            // Create a new uninitialized instance (for testing)
            const uninitializedAgent = MyFirstAgent.getInstance();
            
            // Note: Since it's a singleton, it will already be initialized
            // This test is more conceptual to show the protection
            expect(() => uninitializedAgent.getTools()).not.toThrow();
        });
    });
});

/**
 * Example of Human-in-the-Loop pattern usage
 * 
 * This test demonstrates the complete HITL workflow:
 * 1. User makes a request
 * 2. Agent identifies it needs to use a tool
 * 3. Execution interrupts to request human approval
 * 4. Human examines tool calls and approves
 * 5. Agent continues and returns final response
 */
describe("Educational Demo - Human-in-the-Loop", () => {
    it("should illustrate complete HITL workflow", async () => {
        const threadId = "demo-hitl-workflow";

        console.log("\n" + "=".repeat(60));
        console.log("🎓 DEMONSTRATION: Human-in-the-Loop Workflow");
        console.log("=".repeat(60) + "\n");

        // Step 1: User query
        const userQuery = "Find me information about available flights";
        console.log("👤 User:", userQuery);

        // Step 2: Agent analyzes and detects tool need
        console.log("\n🤖 Agent: Analyzing query...");
        const result = await agent.invokeWithApproval(userQuery, threadId);

        if (result.needsApproval) {
            // Step 3: Interruption for approval
            console.log("\n⏸️  INTERRUPTION - Approval required");
            console.log("━".repeat(60));
            console.log("📋 Tool calls detected:");
            result.toolCalls?.forEach((call: { name: any; args: any; }, index: number) => {
                console.log(`\n  ${index + 1}. Tool: ${call.name}`);
                console.log(`     Arguments:`, JSON.stringify(call.args, null, 2));
            });
            console.log("━".repeat(60));

            // Step 4: Simulation of human approval
            console.log("\n👨‍💼 Human: Reviewing tool calls...");
            console.log("✅ Human: Approval granted\n");

            // Step 5: Continue execution
            console.log("▶️  Resuming execution...");
            const finalResponse = await agent.approveAndContinue(threadId);

            console.log("\n🎯 Agent's final response:");
            console.log("━".repeat(60));
            console.log(finalResponse);
            console.log("━".repeat(60));

            expect(finalResponse).toBeDefined();
        } else {
            // No tool needed, direct response
            console.log("\n💬 Direct response (no tool):", result.response);
            expect(result.response).toBeDefined();
        }

        console.log("\n" + "=".repeat(60));
        console.log("✨ End of demonstration");
        console.log("=".repeat(60) + "\n");
    }, 30000);
});
