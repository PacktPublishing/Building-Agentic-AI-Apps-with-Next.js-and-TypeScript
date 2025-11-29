import type { UserMetadata } from "../context/context-manager";

/**
 * Base system prompt - concise and focused
 */
export const TRAVEL_ASSISTANT_PROMPT = `You are a travel planning assistant with real-time Amadeus API access.

CORE RULES:
1. Use tools for ALL data - never guess prices/availability
2. Max 3-4 options per category (quality > quantity)
3. Use get_current_date for date calculations
4. Be concise and actionable

RESPONSE STYLE:
- Brief acknowledgment
- Clear results presentation
- Next steps suggestion`;

/**
 * Generate contextual prompt with metadata and summary
 */
export function generateContextualPrompt(options: {
    summary?: string;
    metadata?: UserMetadata;
}): string {
    let prompt = TRAVEL_ASSISTANT_PROMPT;

    // Add conversation summary if available
    if (options.summary) {
        prompt += `\n\n📋 CONVERSATION CONTEXT:\n${options.summary}`;
    }

    // Add user metadata if available
    if (options.metadata) {
        const { preferences, currentContext } = options.metadata;
        
        if (preferences && Object.keys(preferences).length > 0) {
            const prefList = Object.entries(preferences)
                .filter(([_, v]) => v !== undefined && v !== null)
                .map(([k, v]) => `- ${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
                .join('\n');
            
            if (prefList) {
                prompt += `\n\n👤 USER PREFERENCES:\n${prefList}`;
            }
        }

        if (currentContext && Object.keys(currentContext).length > 0) {
            const contextList = Object.entries(currentContext)
                .filter(([_, v]) => v !== undefined && v !== null)
                .map(([k, v]) => `- ${k}: ${v}`)
                .join('\n');
            
            if (contextList) {
                prompt += `\n\n🎯 CURRENT REQUEST:\n${contextList}`;
            }
        }
    }

    return prompt;
}
