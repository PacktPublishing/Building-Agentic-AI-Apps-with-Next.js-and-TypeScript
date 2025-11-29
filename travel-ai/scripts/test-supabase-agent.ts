import supabaseAgent from '../ai/agents/supabase-agent';

/**
 * Script de test manuel pour le Supabase Agent
 *
 * Usage:
 *   npx tsx scripts/test-supabase-agent.ts
 */

async function main() {
    console.log('🚀 Starting Supabase Agent Test\n');

    try {
        // 1. Initialiser l'agent
        console.log('📦 Step 1: Initializing agent...');
        await supabaseAgent.initialize();
        console.log('✅ Agent initialized successfully\n');

        // 2. Afficher les outils disponibles
        console.log('🔧 Step 2: Available tools:');
        const tools = supabaseAgent.getTools();
        console.log(`Found ${tools.length} tools:\n`);
        tools.forEach((tool, index) => {
            console.log(`  ${index + 1}. ${tool.name}`);
            console.log(`     ${tool.description}\n`);
        });

        // 3. Test basique - Lister les tables
        console.log('📊 Step 3: Querying database tables...');
        const tablesResponse = await supabaseAgent.invoke(
            "List all tables in the database"
        );
        console.log('Response:', tablesResponse);
        console.log('');

        // 4. Test avec contexte - Conversation multi-tours
        console.log('💬 Step 4: Testing conversation memory...');
        const threadId = 'test-' + Date.now();

        const q1 = await supabaseAgent.invoke(
            "What tables are available in the database?",
            threadId
        );
        console.log('Q1: What tables are available in the database?');
        console.log('A1:', q1);
        console.log('');

        const q2 = await supabaseAgent.invoke(
            "Can you tell me more about the first table you mentioned?",
            threadId
        );
        console.log('Q2: Can you tell me more about the first table you mentioned?');
        console.log('A2:', q2);
        console.log('');

        // 5. Récupérer l'état de la conversation
        console.log('📊 Step 5: Getting conversation state...');
        const state = await supabaseAgent.getState(threadId);
        console.log(`Messages in conversation: ${state.values?.messages?.length || 0}`);
        console.log('');

        // 6. Test de requête structurée
        console.log('🔍 Step 6: Testing structured query...');
        const schemaQuery = await supabaseAgent.invoke(
            "What is the schema structure of the database? Include table names and their columns."
        );
        console.log('Schema query response:', schemaQuery);
        console.log('');

        // 7. Test de comptage
        console.log('🔢 Step 7: Testing count query...');
        const countQuery = await supabaseAgent.invoke(
            "How many tables are in the database?"
        );
        console.log('Count response:', countQuery);
        console.log('');

        console.log('✅ All tests completed successfully!\n');

    } catch (error) {
        console.error('❌ Error during test:', error);
        if (error instanceof Error) {
            console.error('Error message:', error.message);
            console.error('Stack trace:', error.stack);
        }
        process.exit(1);
    } finally {
        // Toujours fermer proprement la connexion
        console.log('🧹 Cleaning up...');
        await supabaseAgent.close();
        console.log('✅ Agent connection closed');
    }
}

// Exécuter le test
main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
