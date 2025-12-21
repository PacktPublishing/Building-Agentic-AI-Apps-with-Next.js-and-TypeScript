/**
 * Retrieval Module - Barrel Export
 *
 * Advanced RAG retrieval techniques
 */

// Self-Query Parser
export {
  SelfQueryParser,
  getSelfQueryParser,
  type ExtractedFilters,
  type SelfQueryResult,
} from './self-query-parser';

// Query Rewriting
export { QueryRewriter, type QueryRewriteResult } from './query-rewriter';

// Query Expansion
export { QueryExpander, type QueryExpansionResult } from './query-expander';

// HyDE (Hypothetical Document Embeddings)
export { HyDEGenerator, type HyDEResult } from './hyde-generator';

// Multi-Query Retrieval
export { MultiQueryRetriever, type MultiQueryResult } from './multi-query-retriever';

// Advanced RAG Pipeline
export {
  AdvancedRAGPipeline,
  type AdvancedRAGPipelineConfig,
  type PipelineResult,
} from './advanced-rag-pipeline';

// Prompts
export {
  SELF_QUERY_SYSTEM_PROMPT,
  SELF_QUERY_USER_TEMPLATE,
  SELF_QUERY_EXAMPLES,
} from './prompts/self-query.prompt';
