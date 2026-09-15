import type { IHybridSearchService } from '@/lib/domain/search/hybrid-search.interface';
import type { HybridSearchOptions } from '@/lib/domain/search/types';

export interface RetrievalBenchmarkRow {
  name: string;
  queries: number;
  totalMs: number;
  averageMs: number;
  resultCount: number;
  configuration: HybridSearchOptions;
}

/** Compare fixed-query retrieval configurations without making quality claims. */
export async function benchmarkRetrieval(
  service: IHybridSearchService,
  queries: string[],
  variants: Array<{ name: string; options?: HybridSearchOptions }>,
): Promise<RetrievalBenchmarkRow[]> {
  const rows: RetrievalBenchmarkRow[] = [];
  for (const variant of variants) {
    const started = Date.now();
    let resultCount = 0;
    for (const query of queries) resultCount += (await service.search(query, variant.options)).length;
    const totalMs = Date.now() - started;
    rows.push({ name: variant.name, queries: queries.length, totalMs, averageMs: queries.length ? totalMs / queries.length : 0, resultCount, configuration: variant.options || {} });
  }
  return rows;
}
