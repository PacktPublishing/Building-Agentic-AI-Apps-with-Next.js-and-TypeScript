/**
 * Reranking Infrastructure - Barrel Export
 */

export { CohereReranker } from './cohere-reranker';
export { LLMReranker } from './llm-reranker';

// Re-export domain types
export type {
  IRerankerService,
  RerankDocument,
  RerankResult,
  RerankOptions,
} from '@/lib/domain/reranking/reranker.interface';

/**
 * Factory function to create the best available reranker
 */
export function createReranker(): import('@/lib/domain/reranking/reranker.interface').IRerankerService {
  // Prefer Cohere if API key is available
  if (process.env.COHERE_API_KEY) {
    console.log('🔧 Using Cohere Reranker');
    return new (require('./cohere-reranker').CohereReranker)();
  }

  // Fall back to LLM reranker
  console.log('🔧 Using LLM Reranker (Cohere API key not found)');
  return new (require('./llm-reranker').LLMReranker)();
}
