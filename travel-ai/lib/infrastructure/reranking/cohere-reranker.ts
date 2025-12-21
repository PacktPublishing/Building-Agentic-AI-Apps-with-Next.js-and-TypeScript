/**
 * Infrastructure Layer - Cohere Reranker
 *
 * Uses Cohere's rerank API for high-quality document reranking.
 * Cohere's cross-encoder models are specifically trained for reranking.
 */

import type {
  IRerankerService,
  RerankDocument,
  RerankResult,
  RerankOptions,
} from '@/lib/domain/reranking/reranker.interface';

/**
 * Cohere API response types
 */
interface CohereRerankResponse {
  results: Array<{
    index: number;
    relevance_score: number;
  }>;
}

/**
 * Cohere Reranker configuration
 */
interface CohereRerankerConfig {
  /** Cohere API key */
  apiKey?: string;
  /** Model to use (default: rerank-v3.5) */
  model?: string;
  /** API endpoint (default: https://api.cohere.ai/v1/rerank) */
  endpoint?: string;
}

const DEFAULT_MODEL = 'rerank-v3.5';
const DEFAULT_ENDPOINT = 'https://api.cohere.ai/v1/rerank';

/**
 * Cohere Reranker Implementation
 *
 * Uses Cohere's state-of-the-art reranking models to reorder
 * documents by relevance. The rerank-v3.5 model is optimized
 * for search and retrieval tasks.
 */
export class CohereReranker implements IRerankerService {
  private apiKey: string;
  private model: string;
  private endpoint: string;

  constructor(config: CohereRerankerConfig = {}) {
    this.apiKey = config.apiKey || process.env.COHERE_API_KEY || '';
    this.model = config.model || DEFAULT_MODEL;
    this.endpoint = config.endpoint || DEFAULT_ENDPOINT;

    if (!this.apiKey) {
      console.warn('⚠️ CohereReranker: No API key provided. Reranking will fail.');
    }
  }

  /**
   * Rerank documents using Cohere API
   */
  async rerank(
    query: string,
    documents: RerankDocument[],
    options: RerankOptions = {}
  ): Promise<RerankResult[]> {
    const { topN = 5, minScore = 0, includeAll = false } = options;

    if (!this.apiKey) {
      throw new Error('Cohere API key not configured');
    }

    if (documents.length === 0) {
      return [];
    }

    console.log(`🔄 CohereReranker: Reranking ${documents.length} documents`);

    try {
      // Prepare documents for Cohere API
      const docTexts = documents.map((doc) => doc.text);

      // Call Cohere rerank API
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          query,
          documents: docTexts,
          top_n: includeAll ? documents.length : topN,
          return_documents: false,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Cohere API error: ${response.status} - ${error}`);
      }

      const data: CohereRerankResponse = await response.json();

      // Map results back to documents
      const results: RerankResult[] = data.results
        .filter((r) => includeAll || r.relevance_score >= minScore)
        .slice(0, topN)
        .map((result, newIndex) => {
          const originalDoc = documents[result.index];
          return {
            id: originalDoc.id,
            text: originalDoc.text,
            relevanceScore: result.relevance_score,
            originalRank: result.index + 1,
            newRank: newIndex + 1,
            metadata: originalDoc.metadata,
          };
        });

      console.log(`✅ CohereReranker: Returned ${results.length} results`);
      return results;
    } catch (error) {
      console.error('❌ CohereReranker: Rerank failed', error);
      throw error;
    }
  }

  getProviderName(): string {
    return `Cohere (${this.model})`;
  }

  /**
   * Check if the reranker is configured
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }
}
