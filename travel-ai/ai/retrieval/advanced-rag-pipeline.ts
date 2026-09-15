/**
 * Advanced RAG Pipeline
 *
 * Combines all advanced retrieval techniques into a unified pipeline:
 * 1. Self-Query → Extract filters
 * 2. Query Rewriting → Improve query
 * 3. Multi-Query → Generate variations
 * 4. Hybrid Search → BM25 + Vector
 * 5. Re-ranking → Cross-encoder
 *
 * Each stage is optional and configurable.
 */

import type { IHybridSearchService } from '@/lib/domain/search/hybrid-search.interface';
import type { HybridSearchResult } from '@/lib/domain/search/types';
import type { IRerankerService, RerankDocument } from '@/lib/domain/reranking/reranker.interface';
import type { IEmbeddingsService } from '@/lib/domain/embeddings/service';

import { SelfQueryParser, type SelfQueryResult } from './self-query-parser';
import { QueryRewriter } from './query-rewriter';
import { QueryExpander } from './query-expander';
import { MultiQueryRetriever } from './multi-query-retriever';
import { HyDEGenerator } from './hyde-generator';
import { normalizeDestination } from './destination-codes';

/**
 * Pipeline configuration
 */
export interface AdvancedRAGPipelineConfig {
  /** Enable self-query filter extraction */
  enableSelfQuery?: boolean;
  /** Enable query rewriting */
  enableQueryRewriting?: boolean;
  /** Enable query expansion with synonyms */
  enableQueryExpansion?: boolean;
  /** Enable multi-query retrieval */
  enableMultiQuery?: boolean;
  /** Enable HyDE (Hypothetical Document Embeddings) */
  enableHyDE?: boolean;
  /** Enable reranking */
  enableReranking?: boolean;
  /** Number of results to return */
  limit?: number;
  /** Alpha for hybrid search (semantic weight) */
  hybridAlpha?: number;
  /** Number of results to fetch before reranking */
  prerankLimit?: number;
}

/**
 * Pipeline result with detailed stage information
 */
export interface PipelineResult {
  /** Final search results */
  results: HybridSearchResult[];
  /** Original query */
  originalQuery: string;
  /** Self-query extraction result */
  selfQuery?: SelfQueryResult;
  /** Rewritten query (if enabled) */
  rewrittenQuery?: string;
  /** Expanded query (if enabled) */
  expandedQuery?: string;
  /** Query variations (if multi-query enabled) */
  queryVariations?: string[];
  /** HyDE document (if enabled) */
  hydeDocument?: string;
  /** Pipeline stages executed */
  stagesExecuted: string[];
  /** Total execution time (ms) */
  executionTimeMs: number;
}

const DEFAULT_CONFIG: Required<AdvancedRAGPipelineConfig> = {
  enableSelfQuery: true,
  enableQueryRewriting: true,
  enableQueryExpansion: true,
  enableMultiQuery: false, // Can be expensive, off by default
  enableHyDE: false, // Alternative to multi-query
  enableReranking: true,
  limit: 5,
  hybridAlpha: 0.7,
  prerankLimit: 20,
};

/**
 * Advanced RAG Pipeline
 *
 * A configurable pipeline that chains together multiple
 * advanced retrieval techniques for optimal results.
 */
export class AdvancedRAGPipeline {
  private config: Required<AdvancedRAGPipelineConfig>;
  private hybridSearch: IHybridSearchService;
  private reranker?: IRerankerService;
  private embeddingsService?: IEmbeddingsService;

  // Lazy-loaded components
  private selfQueryParser?: SelfQueryParser;
  private queryRewriter?: QueryRewriter;
  private queryExpander?: QueryExpander;
  private multiQueryRetriever?: MultiQueryRetriever;
  private hydeGenerator?: HyDEGenerator;

  constructor(
    hybridSearch: IHybridSearchService,
    pipelineConfig: AdvancedRAGPipelineConfig = {},
    reranker?: IRerankerService,
    embeddingsService?: IEmbeddingsService
  ) {
    this.config = { ...DEFAULT_CONFIG, ...pipelineConfig };
    this.hybridSearch = hybridSearch;
    this.reranker = reranker;
    this.embeddingsService = embeddingsService;
  }

  /**
   * Execute the full retrieval pipeline
   */
  async retrieve(query: string): Promise<PipelineResult> {
    const startTime = Date.now();
    const stagesExecuted: string[] = [];
    const result: Partial<PipelineResult> = {
      originalQuery: query,
    };

    let processedQuery = query;

    // Stage 1: Self-Query (extract filters)
    let extractedFilters = {};
    if (this.config.enableSelfQuery) {
      console.log('🔍 Stage 1: Self-Query');
      const selfQuery = await this.getSelfQueryParser().parse(query);
      if (selfQuery.valid === false) {
        throw new Error(selfQuery.error || 'Search constraints could not be validated');
      }
      result.selfQuery = selfQuery;
      extractedFilters = selfQuery.filters;
      processedQuery = selfQuery.semanticQuery;
      stagesExecuted.push('self-query');
    }

    // Stage 2: Query Rewriting
    if (this.config.enableQueryRewriting) {
      console.log('✏️ Stage 2: Query Rewriting');
      const rewritten = await this.getQueryRewriter().rewrite(processedQuery);
      if (rewritten.wasModified) {
        result.rewrittenQuery = rewritten.rewrittenQuery;
        processedQuery = rewritten.rewrittenQuery;
      }
      stagesExecuted.push('query-rewriting');
    }

    // Stage 3: Query Expansion
    if (this.config.enableQueryExpansion) {
      console.log('📝 Stage 3: Query Expansion');
      const expanded = this.getQueryExpander().expand(processedQuery);
      if (expanded.expandedTerms.length > 0) {
        result.expandedQuery = expanded.expandedQuery;
        processedQuery = expanded.expandedQuery;
      }
      stagesExecuted.push('query-expansion');
    }

    // Stage 4: Search (Multi-Query OR HyDE OR Standard)
    let searchResults: HybridSearchResult[];

    if (this.config.enableMultiQuery) {
      console.log('🔄 Stage 4: Multi-Query Retrieval');
      const multiResult = await this.getMultiQueryRetriever().retrieve(
        processedQuery,
        {
          limit: this.config.prerankLimit,
          alpha: this.config.hybridAlpha,
          filters: this.toSearchFilters(extractedFilters),
        }
      );
      searchResults = multiResult.results;
      result.queryVariations = multiResult.queryVariations;
      stagesExecuted.push('multi-query');
    } else if (this.config.enableHyDE && this.embeddingsService) {
      console.log('🔮 Stage 4: HyDE Search');
      const hydeResult = await this.getHyDEGenerator().generate(processedQuery);
      result.hydeDocument = hydeResult.hypotheticalDocument;
      const hydeOptions = {
        limit: this.config.prerankLimit,
        alpha: this.config.hybridAlpha,
        filters: this.toSearchFilters(extractedFilters),
      };
      searchResults = this.hybridSearch.searchWithVector
        ? await this.hybridSearch.searchWithVector(processedQuery, hydeResult.embedding, hydeOptions)
        : await this.hybridSearch.search(processedQuery, hydeOptions);
      stagesExecuted.push('hyde');
    } else {
      console.log('🔎 Stage 4: Hybrid Search');
      searchResults = await this.hybridSearch.search(processedQuery, {
        limit: this.config.prerankLimit,
        alpha: this.config.hybridAlpha,
        filters: this.toSearchFilters(extractedFilters),
      });
      stagesExecuted.push('hybrid-search');
    }

    // Stage 5: Reranking
    if (this.config.enableReranking && this.reranker && searchResults.length > 0) {
      console.log('🔄 Stage 5: Reranking');
      const docsToRerank: RerankDocument[] = searchResults.map((r) => ({
        id: r.id,
        text: r.payload.summary_text,
        metadata: r.payload,
      }));

      const reranked = await this.reranker.rerank(
        result.selfQuery?.semanticQuery || query,
        docsToRerank,
        { topN: this.config.limit }
      );

      // Map reranked results back to HybridSearchResult format
      searchResults = reranked.map((r) => {
        const original = searchResults.find((s) => s.id === r.id)!;
        return {
          ...original,
          score: r.relevanceScore,
        };
      });
      stagesExecuted.push('reranking');
    } else {
      // Just limit results
      searchResults = searchResults.slice(0, this.config.limit);
    }

    return {
      results: searchResults,
      originalQuery: query,
      selfQuery: result.selfQuery,
      rewrittenQuery: result.rewrittenQuery,
      expandedQuery: result.expandedQuery,
      queryVariations: result.queryVariations,
      hydeDocument: result.hydeDocument,
      stagesExecuted,
      executionTimeMs: Date.now() - startTime,
    };
  }

  /**
   * Convert extracted filters to search filter format
   */
  private toSearchFilters(filters: Record<string, unknown>): {
    destination?: string | string[];
    budget_category?: 'economy' | 'standard' | 'premium';
    budget_min?: number; budget_max?: number; min_duration?: number; max_duration?: number;
    departure_city?: string; num_people?: number;
  } {
    return {
      destination: filters.destination ? normalizeDestination(filters.destination as string) : undefined,
      budget_category: filters.budget_category as
        | 'economy'
        | 'standard'
        | 'premium'
        | undefined,
      budget_min: filters.budget_min as number | undefined,
      budget_max: filters.budget_max as number | undefined,
      min_duration: filters.min_duration as number | undefined,
      max_duration: filters.max_duration as number | undefined,
      departure_city: filters.departure_city as string | undefined,
      num_people: filters.num_people as number | undefined,
    };
  }

  // Lazy getters for components
  private getSelfQueryParser(): SelfQueryParser {
    if (!this.selfQueryParser) {
      this.selfQueryParser = new SelfQueryParser();
    }
    return this.selfQueryParser;
  }

  private getQueryRewriter(): QueryRewriter {
    if (!this.queryRewriter) {
      this.queryRewriter = new QueryRewriter();
    }
    return this.queryRewriter;
  }

  private getQueryExpander(): QueryExpander {
    if (!this.queryExpander) {
      this.queryExpander = new QueryExpander();
    }
    return this.queryExpander;
  }

  private getMultiQueryRetriever(): MultiQueryRetriever {
    if (!this.multiQueryRetriever) {
      this.multiQueryRetriever = new MultiQueryRetriever(this.hybridSearch);
    }
    return this.multiQueryRetriever;
  }

  private getHyDEGenerator(): HyDEGenerator {
    if (!this.hydeGenerator) {
      if (!this.embeddingsService) {
        throw new Error('HyDE requires embeddings service');
      }
      this.hydeGenerator = new HyDEGenerator(this.embeddingsService);
    }
    return this.hydeGenerator;
  }

  /**
   * Update pipeline configuration
   */
  updateConfig(newConfig: Partial<AdvancedRAGPipelineConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  getConfig(): Required<AdvancedRAGPipelineConfig> {
    return { ...this.config };
  }
}
