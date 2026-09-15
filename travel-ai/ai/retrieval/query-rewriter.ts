/**
 * Query Rewriter
 *
 * Uses LLM to rewrite ambiguous or short queries into
 * more descriptive search queries for better retrieval.
 */

import { ChatAnthropic } from '@langchain/anthropic';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { config } from '@/config';

/**
 * Result of query rewriting
 */
export interface QueryRewriteResult {
  /** Original query */
  originalQuery: string;
  /** Rewritten, expanded query */
  rewrittenQuery: string;
  /** Whether the query was actually modified */
  wasModified: boolean;
}

const REWRITE_SYSTEM_PROMPT = `You are a search query optimizer for a travel search system.
Your job is to rewrite short, ambiguous, or incomplete queries into more descriptive search queries
that will retrieve better results from a travel database.

Guidelines:
1. Expand abbreviations and short forms (e.g., "NYC" → "New York City")
2. Add relevant context for vague queries (e.g., "cheap rome" → "budget-friendly trip to Rome, Italy with affordable hotels and activities")
3. Clarify travel-related terms (e.g., "honeymoon" → "romantic honeymoon getaway for couples")
4. Keep the original intent - don't add criteria not implied by the query
5. Make the query more descriptive but not overly long (aim for 1-2 sentences)
6. If the query is already clear and descriptive, return it unchanged

Respond with ONLY the rewritten query, nothing else.`;

/**
 * Query Rewriter Configuration
 */
interface QueryRewriterConfig {
  /** Model to use */
  model?: string;
  /** Minimum query length to trigger rewriting */
  minLengthToRewrite?: number;
}

/**
 * Query Rewriter
 *
 * Improves retrieval by expanding short or ambiguous queries
 * into more descriptive search terms.
 */
export class QueryRewriter {
  private llm: ChatAnthropic;
  private minLengthToRewrite: number;

  constructor(rewriterConfig: QueryRewriterConfig = {}) {
    this.llm = new ChatAnthropic({
      modelName: rewriterConfig.model || config.model_name,
      temperature: 0.3, // Slight creativity for expansion
      anthropicApiKey: config.anthropic_api_key,
    });
    this.minLengthToRewrite = rewriterConfig.minLengthToRewrite ?? 20;
  }

  /**
   * Rewrite a query for better retrieval
   */
  async rewrite(query: string): Promise<QueryRewriteResult> {
    const trimmedQuery = query.trim();

    // Skip rewriting for already descriptive queries
    if (trimmedQuery.length >= this.minLengthToRewrite && this.isDescriptive(trimmedQuery)) {
      return {
        originalQuery: query,
        rewrittenQuery: query,
        wasModified: false,
      };
    }

    console.log(`✏️ QueryRewriter: Rewriting "${query}"`);

    try {
      const response = await this.llm.invoke([
        new SystemMessage(REWRITE_SYSTEM_PROMPT),
        new HumanMessage(`Rewrite this travel search query:\n\n"${query}"`),
      ]);

      const rewritten =
        typeof response.content === 'string'
          ? response.content.trim()
          : query;

      const wasModified = rewritten.toLowerCase() !== query.toLowerCase();

      console.log(`✅ QueryRewriter: "${query}" → "${rewritten}"`);

      return {
        originalQuery: query,
        rewrittenQuery: rewritten,
        wasModified,
      };
    } catch (error) {
      console.error('❌ QueryRewriter: Rewrite failed', error);
      return {
        originalQuery: query,
        rewrittenQuery: query,
        wasModified: false,
      };
    }
  }

  /**
   * Check if a query is already descriptive enough
   */
  private isDescriptive(query: string): boolean {
    // Count words
    const words = query.split(/\s+/).filter((w) => w.length > 2);

    // Consider descriptive if has multiple meaningful words
    return words.length >= 5;
  }
}
