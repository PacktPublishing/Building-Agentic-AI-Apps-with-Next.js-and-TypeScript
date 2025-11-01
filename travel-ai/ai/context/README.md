# Context Engineering & Token Optimization

## 🎯 Objectif

Réduire la consommation de tokens de 60-70% tout en maintenant la qualité des réponses grâce à :
- Extraction intelligente de métadonnées par LLM
- Résumés de conversation générés par LLM
- Gestion optimisée de l'historique

## 🧠 Architecture

### 1. **ContextManager**
Gère le contexte de conversation avec le LLM pour :
- **Extraction de métadonnées** : Budget, style de voyage, destinations, dates, nombre de voyageurs
- **Résumés intelligents** : Synthèse de la conversation en 2-3 phrases
- **Gestion de l'historique** : Fenêtre glissante de 10 messages max

### 2. **System Prompt Optimisé**
- Prompt de base concis (~150 tokens vs ~300 avant)
- Enrichissement dynamique avec métadonnées et résumé
- Évite la répétition d'informations déjà extraites

## 📊 Gains Estimés

### Sans optimisation
```
Conversation de 10 tours :
- Historique complet : ~40k tokens
- Prompt répété : ~3k tokens
- Total : ~50-100k tokens
```

### Avec optimisation
```
Conversation de 10 tours :
- Historique trimé : ~12k tokens
- Métadonnées : ~500 tokens
- Résumé : ~200 tokens
- Prompt optimisé : ~150 tokens
- Total : ~15-30k tokens
```

**Réduction : 60-70%** 🎉

## 🔧 Utilisation

### Configuration
```typescript
const contextManager = new ContextManager(llm, {
    maxHistoryMessages: 10,           // Garder 10 derniers messages
    enableSummarization: true,         // Activer les résumés
    summaryTriggerThreshold: 6,       // Résumer après 6 messages
    enableMetadataExtraction: true,    // Extraire les métadonnées
});
```

### Extraction de métadonnées
```typescript
const metadata = await contextManager.extractMetadata(messages, threadId);
// {
//   preferences: { budget: "mid-range", travelStyle: "romantic" },
//   currentContext: { destination: "Barcelona", travelers: 2 }
// }
```

### Résumé de conversation
```typescript
const summary = await contextManager.summarizeHistory(messages, threadId);
// "User planning romantic week in Barcelona for 2, seeking flights from Paris, 
//  hotels, and activities. Mid-range budget preferred."
```

### Statistiques
```typescript
const stats = await agent.getContextStats(threadId);
console.log(stats);
// {
//   messageCount: 8,
//   estimatedTokens: 12500,
//   hasSummary: true,
//   hasMetadata: true,
//   summary: "...",
//   metadata: { ... }
// }
```

## 🎨 Prompt Dynamique

Le system prompt s'adapte automatiquement :

```
Base prompt (toujours présent)
+
📋 CONVERSATION CONTEXT: [résumé LLM]
+
👤 USER PREFERENCES:
- budget: mid-range
- travelStyle: romantic
+
🎯 CURRENT REQUEST:
- destination: Barcelona
- travelers: 2
```

## 🚀 Stratégies d'Optimisation

### 1. **Extraction périodique**
- Métadonnées extraites tous les 3 messages
- Évite les appels LLM inutiles
- Garde le contexte à jour

### 2. **Résumé conditionnel**
- Déclenché après 6 messages
- Remplace l'historique complet
- Conserve l'essentiel

### 3. **Fenêtre glissante**
- Max 10 messages en mémoire
- Premier message toujours gardé (contexte initial)
- Messages récents prioritaires

## 📈 Monitoring

Logs automatiques pour suivre la consommation :
```
[Agent] Current conversation: 8 messages, ~12500 tokens
[Agent] Extracting user metadata...
[Agent] Creating conversation summary...
```

## 🔄 Workflow

```
User Message
    ↓
prepareContext()
    ↓
Extract Metadata (si nécessaire)
    ↓
Summarize (si seuil atteint)
    ↓
Trim History
    ↓
Generate Dynamic Prompt
    ↓
Stream Response
```

## 💡 Best Practices

1. **Métadonnées** : Extraire tôt et mettre à jour régulièrement
2. **Résumés** : Privilégier la concision (2-3 phrases max)
3. **Historique** : Garder le premier message (contexte important)
4. **Monitoring** : Logger les tokens pour ajuster les seuils

## 🧪 Tests

Pour tester l'optimisation :
```typescript
// Avant
const statsBefore = await agent.getContextStats(threadId);

// Après plusieurs messages
const statsAfter = await agent.getContextStats(threadId);

console.log(`Réduction: ${
    ((statsBefore.estimatedTokens - statsAfter.estimatedTokens) / 
     statsBefore.estimatedTokens * 100).toFixed(1)
}%`);
```
