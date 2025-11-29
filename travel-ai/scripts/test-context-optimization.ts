/**
 * Script de test pour mesurer l'efficacité de l'optimisation de contexte
 */

import agent from '../ai/agents/agent';

async function testContextOptimization() {
    console.log('🧪 Test d\'optimisation de contexte\n');
    
    await agent.initialize();
    
    const threadId = `test-${Date.now()}`;
    
    // Simuler une conversation typique
    const conversation = [
        "Hello, I want to go to Barcelona with my wife for a romantic getaway, next week for a week.",
        "What's the budget for flights?",
        "Around 500 euros per person",
        "Can you show me some hotels?",
        "I prefer 4-star hotels in the city center",
        "What about activities?",
        "We love cultural visits and good restaurants",
        "Can you find flights from Paris?",
    ];
    
    console.log('📊 Statistiques par message:\n');
    
    for (let i = 0; i < conversation.length; i++) {
        const message = conversation[i];
        console.log(`\n${'='.repeat(60)}`);
        console.log(`💬 Message ${i + 1}/${conversation.length}: "${message.substring(0, 50)}..."`);
        console.log('='.repeat(60));
        
        // Envoyer le message (sans streamer pour le test)
        try {
            await agent.invoke(message, threadId);
        } catch (error) {
            console.log(`   ⚠️  Erreur lors de l'invocation: ${error}`);
        }
        
        // Obtenir les stats
        const stats = await agent.getContextStats(threadId);
        
        console.log(`\n📊 Statistiques:`);
        console.log(`   📈 Messages totaux: ${stats.messageCount}`);
        console.log(`   🔢 Tokens estimés: ${stats.estimatedTokens}`);
        console.log(`   📝 Résumé actif: ${stats.hasSummary ? '✅ OUI' : '❌ NON'}`);
        console.log(`   🏷️  Métadonnées actives: ${stats.hasMetadata ? '✅ OUI' : '❌ NON'}`);
        
        if (stats.summary) {
            console.log(`\n📋 Résumé de conversation:`);
            console.log(`   "${stats.summary}"`);
        }
        
        if (stats.metadata) {
            console.log(`\n👤 Métadonnées extraites:`);
            if (stats.metadata.preferences && Object.keys(stats.metadata.preferences).length > 0) {
                console.log(`   Préférences:`);
                Object.entries(stats.metadata.preferences).forEach(([key, value]) => {
                    if (value) console.log(`      • ${key}: ${Array.isArray(value) ? value.join(', ') : value}`);
                });
            }
            if (stats.metadata.currentContext && Object.keys(stats.metadata.currentContext).length > 0) {
                console.log(`   Contexte actuel:`);
                Object.entries(stats.metadata.currentContext).forEach(([key, value]) => {
                    if (value) console.log(`      • ${key}: ${value}`);
                });
            }
        }
    }
    
    // Résumé final
    const finalStats = await agent.getContextStats(threadId);
    
    console.log('\n\n' + '='.repeat(70));
    console.log('📊 RÉSUMÉ FINAL');
    console.log('='.repeat(70));
    console.log(`\n📈 Total messages: ${finalStats.messageCount}`);
    console.log(`🔢 Tokens estimés: ${finalStats.estimatedTokens}`);
    console.log(`📝 Résumé actif: ${finalStats.hasSummary ? '✅ OUI' : '❌ NON'}`);
    console.log(`🏷️  Métadonnées actives: ${finalStats.hasMetadata ? '✅ OUI' : '❌ NON'}`);
    
    // Estimation sans optimisation
    const withoutOptimization = finalStats.messageCount * 500; // Estimation grossière
    const savings = withoutOptimization - finalStats.estimatedTokens;
    const savingsPercent = (savings / withoutOptimization * 100).toFixed(1);
    
    console.log('\n' + '='.repeat(70));
    console.log('💰 GAINS ESTIMÉS');
    console.log('='.repeat(70));
    console.log(`Sans optimisation: ~${withoutOptimization} tokens`);
    console.log(`Avec optimisation: ~${finalStats.estimatedTokens} tokens`);
    console.log(`Économie: ~${savings} tokens (${savingsPercent}%)`);
    
    if (finalStats.summary) {
        console.log('\n' + '='.repeat(70));
        console.log('📋 RÉSUMÉ DE CONVERSATION');
        console.log('='.repeat(70));
        console.log(finalStats.summary);
    }
    
    if (finalStats.metadata) {
        console.log('\n' + '='.repeat(70));
        console.log('👤 MÉTADONNÉES EXTRAITES');
        console.log('='.repeat(70));
        
        if (finalStats.metadata.preferences && Object.keys(finalStats.metadata.preferences).length > 0) {
            console.log('\nPréférences:');
            Object.entries(finalStats.metadata.preferences).forEach(([key, value]) => {
                if (value) console.log(`  • ${key}: ${Array.isArray(value) ? value.join(', ') : value}`);
            });
        }
        
        if (finalStats.metadata.currentContext && Object.keys(finalStats.metadata.currentContext).length > 0) {
            console.log('\nContexte actuel:');
            Object.entries(finalStats.metadata.currentContext).forEach(([key, value]) => {
                if (value) console.log(`  • ${key}: ${value}`);
            });
        }
    }
    
    console.log('\n' + '='.repeat(70));
    console.log('✅ Test terminé!');
    console.log('='.repeat(70) + '\n');
}

// Exécuter le test
testContextOptimization().catch(console.error);
