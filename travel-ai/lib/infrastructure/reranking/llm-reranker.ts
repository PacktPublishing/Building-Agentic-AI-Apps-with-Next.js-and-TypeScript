/**
 * Infrastructure Layer - LLM Reranker
 *
 * Uses Claude to score document relevance for reranking.
 * This is a fallback when Cohere is not available.
 */

import { ChatAnthropic } from '@langchain/anthropic';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { config } from '@/config';
import type {
  IRerankerService,
  RerankDocument,
  RerankResult,
  RerankOptions,
} from '@/lib/domain/reranking/reranker.interface';

/**
 * LLM Reranker configuration
 */
interface LLMRerankerConfig {
  /** Model to use (default: claude-3-haiku for speed/cost) */
  model?: string;
  /** Maximum documents to process in one batch */
  batchSize?: number;
  /** Whether to process in parallel */
  parallel?: boolean;
}

const RERANK_SYSTEM_PROMPT = `You are a relevance scorer for a travel search system.
Given a search query and a trip description, score how relevant the trip is to the query.

Score from 0.0 to 1.0 where:
- 1.0 = Perfect match, exactly what the user is looking for
- 0.7-0.9 = Very relevant, matches most criteria
- 0.4-0.6 = Somewhat relevant, partial match
- 0.1-0.3 = Weakly relevant, tangential connection
- 0.0 = Not relevant at all

Consider:
- Destination match
- Trip type/theme (beach, cultural, adventure, etc.)
- Budget alignment
- Duration fit
- Special requirements mentioned

Respond with ONLY a number between 0.0 and 1.0, nothing else.`;

/**
 * LLM-based Reranker Implementation
 *
 * Uses Claude to score document relevance. Slower than Cohere
 * but doesn't require additional API keys if already using Claude.
 */
export class LLMReranker implements IRerankerService {
  private llm: ChatAnthropic;
  private batchSize: number;
  private parallel: boolean;

  constructor(llmConfig: LLMRerankerConfig = {}) {
    this.llm = new ChatAnthropic({
      modelName: llmConfig.model || config.model_name,
      temperature: 0,
      anthropicApiKey: config.anthropic_api_key,
    });
    this.batchSize = llmConfig.batchSize || 10;
    this.parallel = llmConfig.parallel ?? true;
  }

  /**
   * Rerank documents using LLM scoring
   */
  async rerank(
    query: string,
    documents: RerankDocument[],
    options: RerankOptions = {}
  ): Promise<RerankResult[]> {
    const { topN = 5, minScore = 0, includeAll = false } = options;

    if (documents.length === 0) {
      return [];
    }

    console.log(`🔄 LLMReranker: Scoring ${documents.length} documents`);

    try {
      // Score all documents
      const scoredDocs = await this.scoreDocuments(query, documents);

      // Sort by score descending
      scoredDocs.sort((a, b) => b.score - a.score);

      // Filter and limit results
      const results: RerankResult[] = scoredDocs
        .map((doc, newIndex) => ({
          id: doc.document.id,
          text: doc.document.text,
          relevanceScore: doc.score,
          originalRank: doc.originalRank,
          newRank: newIndex + 1,
          metadata: doc.document.metadata,
        }))
        .filter((r) => includeAll || r.relevanceScore >= minScore)
        .slice(0, topN);

      console.log(`✅ LLMReranker: Returned ${results.length} results`);
      return results;
    } catch (error) {
      console.error('❌ LLMReranker: Rerank failed', error);
      throw error;
    }
  }

  /**
   * Score documents in batches
   */
  private async scoreDocuments(
    query: string,
    documents: RerankDocument[]
  ): Promise<Array<{ document: RerankDocument; score: number; originalRank: number }>> {
    if (this.parallel) {
      // Process all in parallel (faster but more API calls)
      const promises = documents.map((doc, index) =>
        this.scoreDocument(query, doc).then((score) => ({
          document: doc,
          score,
          originalRank: index + 1,
        }))
      );
      return Promise.all(promises);
    } else {
      // Process sequentially (slower but rate-limit friendly)
      const results: Array<{ document: RerankDocument; score: number; originalRank: number }> = [];
      for (let i = 0; i < documents.length; i++) {
        const score = await this.scoreDocument(query, documents[i]);
        results.push({
          document: documents[i],
          score,
          originalRank: i + 1,
        });
      }
      return results;
    }
  }

  /**
   * Score a single document
   */
  private async scoreDocument(query: string, document: RerankDocument): Promise<number> {
    try {
      const userPrompt = `Query: "${query}"

Trip description:
${document.text}

Relevance score (0.0-1.0):`;

      const response = await this.llm.invoke([
        new SystemMessage(RERANK_SYSTEM_PROMPT),
        new HumanMessage(userPrompt),
      ]);

      const content =
        typeof response.content === 'string'
          ? response.content
          : JSON.stringify(response.content);

      // Parse score from response
      const score = parseFloat(content.trim());

      if (isNaN(score)) {
        console.warn(`⚠️ LLMReranker: Could not parse score from "${content}"`);
        return 0.5; // Default to middle score
      }

      // Clamp to 0-1 range
      return Math.max(0, Math.min(1, score));
    } catch (error) {
      console.error(`❌ LLMReranker: Failed to score document ${document.id}`, error);
      return 0; // Return 0 on error
    }
  }

  getProviderName(): string {
    return 'Claude LLM';
  }
}
