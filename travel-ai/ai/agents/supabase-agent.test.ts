import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import supabaseAgent, { SupabaseAgent } from './supabase-agent';

describe('SupabaseAgent', () => {
    beforeAll(async () => {
        // Initialiser l'agent avant tous les tests
        console.log('🔧 Initializing Supabase Agent...');
        await supabaseAgent.initialize();
        console.log('✅ Supabase Agent initialized');
    }, 60000); // Timeout de 60s pour l'initialisation

    afterAll(async () => {
        // Fermer la connexion MCP proprement
        console.log('🧹 Closing Supabase Agent...');
        await supabaseAgent.close();
        console.log('✅ Supabase Agent closed');
    });

    describe('Initialization', () => {
        it('should be a singleton instance', () => {
            const instance1 = SupabaseAgent.getInstance();
            const instance2 = SupabaseAgent.getInstance();
            expect(instance1).toBe(instance2);
        });

        it('should load tools from MCP server', () => {
            const tools = supabaseAgent.getTools();
            console.log(`📦 Loaded ${tools.length} tools:`, tools.map(t => t.name).join(', '));
            expect(tools.length).toBeGreaterThan(0);
        });

        it('should have valid tool descriptions', () => {
            const tools = supabaseAgent.getTools();
            tools.forEach(tool => {
                expect(tool.name).toBeTruthy();
                expect(tool.description).toBeTruthy();
                console.log(`  - ${tool.name}: ${tool.description}`);
            });
        });
    });

    describe('Database Queries', () => {
        it('should list all tables in the database', async () => {
            const response = await supabaseAgent.invoke(
                "List all tables in the database"
            );

            console.log('📊 Tables response:', response);
            expect(response).toBeTruthy();
            expect(typeof response).toBe('string');
        }, 30000);

        it('should describe a specific table schema', async () => {
            // D'abord obtenir la liste des tables
            const tablesResponse = await supabaseAgent.invoke(
                "What tables are in the database?"
            );
            console.log('📋 Available tables:', tablesResponse);

            // Puis demander le schéma (adapter selon vos tables)
            const schemaResponse = await supabaseAgent.invoke(
                "Describe the schema of the first table"
            );
            console.log('📝 Schema:', schemaResponse);
            expect(schemaResponse).toBeTruthy();
        }, 30000);

        it('should handle queries about database structure', async () => {
            const response = await supabaseAgent.invoke(
                "How many tables are in the database?"
            );

            console.log('🔢 Table count response:', response);
            expect(response).toBeTruthy();
        }, 30000);
    });

    describe('Conversation Memory', () => {
        it('should maintain context across multiple queries', async () => {
            const threadId = 'test-memory-' + Date.now();

            // Première question
            const response1 = await supabaseAgent.invoke(
                "What tables do we have?",
                threadId
            );
            console.log('Q1:', response1);

            // Question de suivi (doit se rappeler du contexte)
            const response2 = await supabaseAgent.invoke(
                "Tell me more about the first one",
                threadId
            );
            console.log('Q2:', response2);

            expect(response1).toBeTruthy();
            expect(response2).toBeTruthy();
        }, 60000);

        it('should have separate contexts for different threads', async () => {
            const thread1 = 'test-thread-1-' + Date.now();
            const thread2 = 'test-thread-2-' + Date.now();

            await supabaseAgent.invoke("Remember: favorite color is blue", thread1);
            await supabaseAgent.invoke("Remember: favorite color is red", thread2);

            const state1 = await supabaseAgent.getState(thread1);
            const state2 = await supabaseAgent.getState(thread2);

            expect(state1).toBeTruthy();
            expect(state2).toBeTruthy();
            expect(state1).not.toBe(state2);
        }, 60000);
    });

    describe('Error Handling', () => {
        it('should handle invalid queries gracefully', async () => {
            const response = await supabaseAgent.invoke(
                "This is a nonsensical database query that makes no sense"
            );

            console.log('❓ Invalid query response:', response);
            expect(response).toBeTruthy();
            // L'agent devrait répondre qu'il ne peut pas exécuter la requête
        }, 30000);

        it('should not crash on empty input', async () => {
            const response = await supabaseAgent.invoke("");
            expect(response).toBeTruthy();
        }, 30000);
    });

    describe('Read Operations', () => {
        it('should query data from existing tables', async () => {
            // Adapter selon vos tables réelles
            const response = await supabaseAgent.invoke(
                "Show me some data from the database"
            );

            console.log('📄 Data query response:', response);
            expect(response).toBeTruthy();
        }, 30000);

        it('should filter data based on conditions', async () => {
            const response = await supabaseAgent.invoke(
                "Can you query the database with a WHERE clause?"
            );

            console.log('🔍 Filtered query response:', response);
            expect(response).toBeTruthy();
        }, 30000);
    });

    describe('Tool Information', () => {
        it('should expose all available MCP tools', () => {
            const tools = supabaseAgent.getTools();

            console.log('\n📦 Available Supabase Tools:');
            tools.forEach((tool, index) => {
                console.log(`\n${index + 1}. ${tool.name}`);
                console.log(`   Description: ${tool.description}`);
            });

            expect(tools.length).toBeGreaterThan(0);
        });
    });

    describe('State Management', () => {
        it('should retrieve conversation state', async () => {
            const threadId = 'test-state-' + Date.now();

            await supabaseAgent.invoke("What tables exist?", threadId);

            const state = await supabaseAgent.getState(threadId);

            console.log('📊 State keys:', Object.keys(state));
            expect(state).toBeTruthy();
            expect(state.values).toBeTruthy();
        }, 30000);
    });

    describe('Performance', () => {
        it('should respond within reasonable time for simple queries', async () => {
            const startTime = Date.now();

            await supabaseAgent.invoke("List tables");

            const duration = Date.now() - startTime;
            console.log(`⏱️  Query duration: ${duration}ms`);

            // Devrait répondre en moins de 15 secondes
            expect(duration).toBeLessThan(15000);
        }, 30000);

        it('should handle multiple sequential queries', async () => {
            const threadId = 'test-perf-' + Date.now();

            const queries = [
                "What tables exist?",
                "How many tables are there?",
                "What is the database structure?"
            ];

            for (const query of queries) {
                const response = await supabaseAgent.invoke(query, threadId);
                expect(response).toBeTruthy();
                console.log(`✓ Query: "${query}" - Response length: ${response.length}`);
            }
        }, 90000);
    });
});
