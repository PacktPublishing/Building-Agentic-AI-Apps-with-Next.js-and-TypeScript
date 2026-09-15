import type { IHybridSearchService } from '@/lib/domain/search/hybrid-search.interface';
import type { HybridSearchOptions, HybridSearchResult } from '@/lib/domain/search/types';
import { AdvancedRAGPipeline, type AdvancedRAGPipelineConfig, type PipelineResult } from '@/ai/retrieval/advanced-rag-pipeline';

/**
 * Evaluation adapter for the actual advanced pipeline. It deliberately keeps
 * the last execution metadata so reports can record enabled stages/config.
 */
export class AdvancedPipelineEvaluationAdapter implements IHybridSearchService {
  readonly pipeline: AdvancedRAGPipeline;
  lastResult?: PipelineResult;

  constructor(pipeline: AdvancedRAGPipeline, config?: AdvancedRAGPipelineConfig) {
    this.pipeline = pipeline;
    if (config) pipeline.updateConfig(config);
  }

  async search(query: string, options: HybridSearchOptions = {}): Promise<HybridSearchResult[]> {
    if (options.limit !== undefined) this.pipeline.updateConfig({ limit: options.limit });
    if (options.alpha !== undefined) this.pipeline.updateConfig({ hybridAlpha: options.alpha });
    this.lastResult = await this.pipeline.retrieve(query);
    return this.lastResult.results;
  }

  async rebuildIndex(): Promise<void> {
    // The pipeline's configured hybrid service owns index lifecycle.
  }

  addToIndex(): void {}
  removeFromIndex(): void {}
}
