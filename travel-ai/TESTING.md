# 🧪 Testing Guide

## Quick Start - Comparative Test ⭐ RECOMMENDED

**Best way to see the optimization impact:**

```bash
pnpm test:compare
```

This runs TWO parallel conversations (with/without optimization) and shows:
- Real-time token comparison
- Final savings (tokens & cost)
- Extracted metadata & summaries
- Beautiful formatted results

---

## Alternative - Single Conversation Test

```bash
pnpm test:context
```

This runs ONE conversation with optimization enabled.

## Ce que le test fait

1. **Simule une conversation** de 8 messages typiques
2. **Affiche les stats** après chaque message :
   - Nombre de messages
   - Tokens estimés
   - Présence de résumé
   - Présence de métadonnées
3. **Extrait automatiquement** :
   - Métadonnées tous les 3 messages
   - Résumé après 6 messages
4. **Calcule les gains** en comparant avec/sans optimisation

## Sortie attendue

### Message 1-2
```
💬 Message 1/8: "Hello, I want to go to Barcelona..."
📊 Statistiques:
   📈 Messages totaux: 6
   🔢 Tokens estimés: ~400
   📝 Résumé actif: ❌ NON
   🏷️  Métadonnées actives: ❌ NON
```

### Message 3 (extraction de métadonnées)
```
[Agent] Current conversation: 10 messages, ~680 tokens
[Agent] Extracting user metadata...

💬 Message 3/8: "Around 500 euros per person..."
📊 Statistiques:
   📈 Messages totaux: 10
   🔢 Tokens estimés: ~680
   📝 Résumé actif: ❌ NON
   🏷️  Métadonnées actives: ✅ OUI

👤 Métadonnées extraites:
   Préférences:
      • budget: mid-range
      • destinations: Barcelona
   Contexte actuel:
      • destination: Barcelona
      • travelers: 2
```

### Message 6 (création du résumé)
```
[Agent] Current conversation: 20 messages, ~2500 tokens
[Agent] Creating conversation summary...

💬 Message 6/8: "What about activities?..."
📊 Statistiques:
   📈 Messages totaux: 20
   🔢 Tokens estimés: ~2500
   📝 Résumé actif: ✅ OUI
   🏷️  Métadonnées actives: ✅ OUI

📋 Résumé de conversation:
   "User planning romantic getaway to Barcelona for 2 people 
   next week. Mid-range budget, looking for flights from Paris, 
   hotels in city center, and activities."

👤 Métadonnées extraites:
   Préférences:
      • budget: mid-range
      • travelStyle: romantic
      • destinations: Barcelona
   Contexte actuel:
      • destination: Barcelona
      • travelers: 2
      • purpose: romantic getaway
```

### Résumé final
```
======================================================================
📊 RÉSUMÉ FINAL
======================================================================

📈 Total messages: 36
🔢 Tokens estimés: 5617
📝 Résumé actif: ✅ OUI
🏷️  Métadonnées actives: ✅ OUI

======================================================================
💰 GAINS ESTIMÉS
======================================================================
Sans optimisation: ~18000 tokens
Avec optimisation: ~5617 tokens
Économie: ~12383 tokens (68.8%)

======================================================================
📋 RÉSUMÉ DE CONVERSATION
======================================================================
User planning romantic getaway to Barcelona for 2 people next week. 
Mid-range budget around 500€ per person for flights from Paris. 
Looking for 4-star hotels in city center and cultural activities.

======================================================================
👤 MÉTADONNÉES EXTRAITES
======================================================================

Préférences:
  • budget: mid-range
  • travelStyle: romantic
  • destinations: Barcelona

Contexte actuel:
  • destination: Barcelona
  • dates: next week
  • travelers: 2
  • purpose: romantic getaway

======================================================================
✅ Test terminé!
======================================================================
```

## Vérifier que ça marche

### ✅ Signes de succès

1. **Logs d'extraction** apparaissent :
   ```
   [Agent] Extracting user metadata...
   [Agent] Creating conversation summary...
   ```

2. **Métadonnées extraites** après message 3 :
   ```
   🏷️  Métadonnées actives: ✅ OUI
   ```

3. **Résumé créé** après message 6 :
   ```
   📝 Résumé actif: ✅ OUI
   ```

4. **Économie significative** (>60%) :
   ```
   Économie: ~12383 tokens (68.8%)
   ```

### ❌ Problèmes possibles

Si les métadonnées/résumés ne sont pas extraits :

1. **Vérifier les logs** : Chercher `[Agent] Extracting...`
2. **Vérifier l'API key** : Le LLM doit être accessible
3. **Vérifier les erreurs** : Regarder les messages d'erreur

## Tester dans l'app

Une fois le test validé, teste dans l'interface web :

```bash
pnpm dev
```

Puis va sur `/dashboard/ai-chat` et :

1. Envoie plusieurs messages (>6)
2. Ouvre la console du navigateur
3. Cherche les logs `[Agent]`
4. Vérifie que les métadonnées et résumés sont créés

## Monitoring en production

Pour surveiller l'optimisation en production :

```typescript
// Dans ton code
const stats = await agent.getContextStats(threadId);
console.log(`Tokens: ${stats.estimatedTokens}`);
console.log(`Métadonnées:`, stats.metadata);
console.log(`Résumé:`, stats.summary);
```

## Ajuster les seuils

Si tu veux modifier quand les optimisations se déclenchent, édite `ai/agents/agent.ts` :

```typescript
this.contextManager = new ContextManager(this.model, {
    maxHistoryMessages: 10,           // Nombre de messages gardés
    enableSummarization: true,         
    summaryTriggerThreshold: 6,       // Résumer après N messages
    enableMetadataExtraction: true,    
});
```

Et dans `prepareContext()` :

```typescript
// Extraire métadonnées tous les 3 messages
if (this.contextManager.getMetadata(threadId) === undefined || messages.length % 3 === 0) {
    // Change le "3" pour ajuster la fréquence
}
```

## Désactiver temporairement

Pour désactiver l'optimisation temporairement :

```typescript
this.contextManager = new ContextManager(this.model, {
    enableSummarization: false,        // ❌ Pas de résumés
    enableMetadataExtraction: false,   // ❌ Pas de métadonnées
});
```

---

**Maintenant lance `pnpm test:context` et observe la magie opérer !** ✨
