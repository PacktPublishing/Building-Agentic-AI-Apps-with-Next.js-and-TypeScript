# 💡 Exemples d'utilisation du Context Engineering

## Exemple 1 : Conversation simple

### Messages
```
User: "Je veux aller à Barcelone la semaine prochaine"
AI: "Super ! Combien de personnes ?"
User: "2 personnes, ma femme et moi"
AI: "Budget ?"
User: "Environ 500€ par personne pour les vols"
```

### Métadonnées extraites (après message 3)
```json
{
  "preferences": {
    "budget": "mid-range",
    "destinations": ["Barcelona"]
  },
  "currentContext": {
    "destination": "Barcelona",
    "dates": "next week",
    "travelers": 2
  }
}
```

### Résumé généré (après message 6)
```
"User planning trip to Barcelona next week for 2 people. 
Budget around 500€ per person for flights. Looking for 
mid-range options."
```

### Tokens économisés
- Sans optimisation : ~3000 tokens (historique complet)
- Avec optimisation : ~800 tokens (métadonnées + résumé)
- **Économie : 73%**

---

## Exemple 2 : Conversation longue avec changement de contexte

### Messages 1-5
```
User: "Je cherche un hôtel à Paris"
User: "Budget luxe"
User: "Pour 3 nuits"
User: "Quartier Marais"
User: "Avec spa"
```

### Métadonnées après message 3
```json
{
  "preferences": {
    "budget": "luxury",
    "destinations": ["Paris"]
  },
  "currentContext": {
    "destination": "Paris",
    "dates": "3 nights"
  }
}
```

### Messages 6-10 (changement de contexte)
```
User: "Finalement, je préfère Lyon"
User: "Budget moyen cette fois"
User: "Pour 2 nuits"
User: "Centre ville"
User: "Avec parking"
```

### Métadonnées mises à jour (message 9)
```json
{
  "preferences": {
    "budget": "mid-range",
    "destinations": ["Paris", "Lyon"]
  },
  "currentContext": {
    "destination": "Lyon",
    "dates": "2 nights"
  }
}
```

### Résumé après message 6
```
"User initially looking for luxury hotel in Paris Marais 
with spa for 3 nights. Changed to Lyon mid-range hotel 
in city center with parking for 2 nights."
```

### Tokens économisés
- Sans optimisation : ~6000 tokens
- Avec optimisation : ~1500 tokens
- **Économie : 75%**

---

## Exemple 3 : Utilisation programmatique

### Obtenir les statistiques
```typescript
import agent from './ai/agents/agent';

async function analyzeConversation(threadId: string) {
    const stats = await agent.getContextStats(threadId);
    
    console.log('📊 Statistiques de conversation');
    console.log('================================');
    console.log(`Messages: ${stats.messageCount}`);
    console.log(`Tokens estimés: ${stats.estimatedTokens}`);
    console.log(`Résumé disponible: ${stats.hasSummary ? 'Oui' : 'Non'}`);
    console.log(`Métadonnées disponibles: ${stats.hasMetadata ? 'Oui' : 'Non'}`);
    
    if (stats.summary) {
        console.log(`\n📝 Résumé:\n${stats.summary}`);
    }
    
    if (stats.metadata) {
        console.log('\n🏷️  Métadonnées:');
        console.log(JSON.stringify(stats.metadata, null, 2));
    }
}

// Utilisation
await analyzeConversation('user-123');
```

### Sortie
```
📊 Statistiques de conversation
================================
Messages: 8
Tokens estimés: 2400
Résumé disponible: Oui
Métadonnées disponibles: Oui

📝 Résumé:
User planning romantic getaway to Barcelona for 2 people 
next week. Mid-range budget, looking for flights from Paris, 
hotels in city center, and cultural activities.

🏷️  Métadonnées:
{
  "preferences": {
    "budget": "mid-range",
    "travelStyle": "romantic",
    "destinations": ["Barcelona"]
  },
  "currentContext": {
    "destination": "Barcelona",
    "dates": "next week",
    "travelers": 2,
    "purpose": "romantic getaway"
  }
}
```

---

## Exemple 4 : Monitoring en temps réel

### Code
```typescript
import agent from './ai/agents/agent';

async function monitorTokenUsage(threadId: string) {
    const contextManager = agent.getContextManager();
    
    // Avant le message
    const statsBefore = await agent.getContextStats(threadId);
    console.log(`Avant: ${statsBefore.estimatedTokens} tokens`);
    
    // Envoyer un message
    await agent.invoke("Cherche des vols pour Barcelone", threadId);
    
    // Après le message
    const statsAfter = await agent.getContextStats(threadId);
    console.log(`Après: ${statsAfter.estimatedTokens} tokens`);
    
    // Calculer l'augmentation
    const increase = statsAfter.estimatedTokens - statsBefore.estimatedTokens;
    console.log(`Augmentation: +${increase} tokens`);
    
    // Vérifier si résumé a été créé
    if (statsAfter.hasSummary && !statsBefore.hasSummary) {
        console.log('✅ Résumé créé automatiquement');
    }
    
    // Vérifier si métadonnées ont été extraites
    if (statsAfter.hasMetadata && !statsBefore.hasMetadata) {
        console.log('✅ Métadonnées extraites automatiquement');
    }
}
```

### Sortie
```
Avant: 1800 tokens
[Agent] Current conversation: 6 messages, ~1800 tokens
[Agent] Creating conversation summary...
Après: 2200 tokens
Augmentation: +400 tokens
✅ Résumé créé automatiquement
```

---

## Exemple 5 : Test de performance

### Code complet
```typescript
import agent from './ai/agents/agent';

async function performanceTest() {
    await agent.initialize();
    
    const threadId = `perf-test-${Date.now()}`;
    const messages = [
        "Je veux partir en vacances",
        "Destination : Barcelone",
        "Pour 2 personnes",
        "Budget moyen",
        "La semaine prochaine",
        "Pour une semaine",
        "Cherche des vols depuis Paris",
        "Et des hôtels 4 étoiles",
        "Avec des activités culturelles",
        "Et de bons restaurants"
    ];
    
    console.log('🚀 Test de performance\n');
    
    let totalTokens = 0;
    let totalTokensWithoutOptimization = 0;
    
    for (let i = 0; i < messages.length; i++) {
        await agent.invoke(messages[i], threadId);
        
        const stats = await agent.getContextStats(threadId);
        totalTokens = stats.estimatedTokens;
        
        // Estimation sans optimisation (historique complet)
        totalTokensWithoutOptimization = (i + 1) * 500;
        
        console.log(`Message ${i + 1}/${messages.length}`);
        console.log(`  Avec optimisation: ${totalTokens} tokens`);
        console.log(`  Sans optimisation: ${totalTokensWithoutOptimization} tokens`);
        console.log(`  Économie: ${totalTokensWithoutOptimization - totalTokens} tokens\n`);
    }
    
    const finalSavings = totalTokensWithoutOptimization - totalTokens;
    const savingsPercent = (finalSavings / totalTokensWithoutOptimization * 100).toFixed(1);
    
    console.log('📊 RÉSULTAT FINAL');
    console.log('=================');
    console.log(`Total avec optimisation: ${totalTokens} tokens`);
    console.log(`Total sans optimisation: ${totalTokensWithoutOptimization} tokens`);
    console.log(`Économie totale: ${finalSavings} tokens (${savingsPercent}%)`);
}

performanceTest().catch(console.error);
```

### Sortie attendue
```
🚀 Test de performance

Message 1/10
  Avec optimisation: 120 tokens
  Sans optimisation: 500 tokens
  Économie: 380 tokens

Message 2/10
  Avec optimisation: 240 tokens
  Sans optimisation: 1000 tokens
  Économie: 760 tokens

[...]

Message 10/10
  Avec optimisation: 1800 tokens
  Sans optimisation: 5000 tokens
  Économie: 3200 tokens

📊 RÉSULTAT FINAL
=================
Total avec optimisation: 1800 tokens
Total sans optimisation: 5000 tokens
Économie totale: 3200 tokens (64.0%)
```

---

## Exemple 6 : Personnalisation du prompt

### Utiliser les métadonnées dans votre logique

```typescript
import agent from './ai/agents/agent';
import { generateContextualPrompt } from './ai/prompts/system-prompt';

async function customPromptExample(threadId: string) {
    const contextManager = agent.getContextManager();
    
    // Récupérer les métadonnées
    const metadata = contextManager.getMetadata(threadId);
    const summary = contextManager.getSummary(threadId);
    
    // Générer un prompt personnalisé
    const customPrompt = generateContextualPrompt({
        summary,
        metadata
    });
    
    console.log('📝 Prompt généré:');
    console.log(customPrompt);
    
    // Le prompt inclut automatiquement :
    // - Le prompt de base
    // - Le résumé de conversation
    // - Les préférences utilisateur
    // - Le contexte actuel
}
```

### Sortie
```
📝 Prompt généré:
You are a travel planning assistant with real-time Amadeus API access.

CORE RULES:
1. Use tools for ALL data - never guess prices/availability
2. Max 3-4 options per category (quality > quantity)
3. Use get_current_date for date calculations
4. Be concise and actionable

RESPONSE STYLE:
- Brief acknowledgment
- Clear results presentation
- Next steps suggestion

📋 CONVERSATION CONTEXT:
User planning romantic getaway to Barcelona for 2 people next week. 
Mid-range budget, looking for flights from Paris and hotels.

👤 USER PREFERENCES:
- budget: mid-range
- travelStyle: romantic
- destinations: Barcelona

🎯 CURRENT REQUEST:
- destination: Barcelona
- travelers: 2
- purpose: romantic getaway
```

---

## Exemple 7 : Gestion d'erreurs

### Code robuste
```typescript
import agent from './ai/agents/agent';

async function robustContextHandling(threadId: string) {
    try {
        const stats = await agent.getContextStats(threadId);
        
        // Vérifier si les métadonnées sont disponibles
        if (!stats.hasMetadata) {
            console.log('⚠️  Métadonnées non disponibles, extraction en cours...');
            const state = await agent.getState(threadId);
            const messages = state.values?.messages || [];
            
            if (messages.length > 0) {
                const contextManager = agent.getContextManager();
                await contextManager.extractMetadata(messages, threadId);
                console.log('✅ Métadonnées extraites');
            }
        }
        
        // Vérifier si le résumé est disponible
        if (!stats.hasSummary && stats.messageCount >= 6) {
            console.log('⚠️  Résumé non disponible, création en cours...');
            const state = await agent.getState(threadId);
            const messages = state.values?.messages || [];
            
            const contextManager = agent.getContextManager();
            await contextManager.summarizeHistory(messages, threadId);
            console.log('✅ Résumé créé');
        }
        
        return stats;
    } catch (error) {
        console.error('❌ Erreur lors de la gestion du contexte:', error);
        return null;
    }
}
```

---

## 🎯 Conseils d'utilisation

### ✅ Bonnes pratiques

1. **Surveiller régulièrement** les statistiques
```typescript
setInterval(async () => {
    const stats = await agent.getContextStats(threadId);
    console.log(`Tokens: ${stats.estimatedTokens}`);
}, 30000); // Toutes les 30 secondes
```

2. **Ajuster les seuils** selon vos besoins
```typescript
// Pour conversations courtes
summaryTriggerThreshold: 4

// Pour conversations longues
summaryTriggerThreshold: 8
```

3. **Logger les économies** pour analyse
```typescript
const savings = withoutOptimization - withOptimization;
console.log(`Économie: ${savings} tokens (${(savings/withoutOptimization*100).toFixed(1)}%)`);
```

### ❌ À éviter

1. Ne pas désactiver les optimisations sans raison
2. Ne pas augmenter `maxHistoryMessages` au-delà de 15
3. Ne pas ignorer les logs de monitoring

---

**Ces exemples montrent comment le Context Engineering optimise automatiquement vos conversations tout en vous donnant un contrôle total sur le contexte !** 🚀
