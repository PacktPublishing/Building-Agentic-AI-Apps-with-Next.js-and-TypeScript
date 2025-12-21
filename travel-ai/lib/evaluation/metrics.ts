/**
 * RAG Evaluation Metrics
 *
 * Implementation of standard retrieval and generation metrics
 * for evaluating RAG pipeline quality.
 */

/**
 * Retrieval result for evaluation
 */
export interface EvalRetrievalResult {
  id: string;
  score: number;
  isRelevant?: boolean;
}

/**
 * Metrics calculation results
 */
export interface RetrievalMetrics {
  /** Precision at K - ratio of relevant docs in top K */
  precisionAtK: number;
  /** Recall at K - ratio of relevant docs retrieved */
  recallAtK: number;
  /** Mean Reciprocal Rank - inverse of first relevant doc position */
  mrr: number;
  /** Normalized Discounted Cumulative Gain */
  ndcg: number;
  /** Hit Rate - whether any relevant doc was found */
  hitRate: number;
  /** K value used */
  k: number;
}

/**
 * Calculate Precision@K
 *
 * Precision@K = (# relevant docs in top K) / K
 *
 * @param results - Retrieved results (assumed to be in ranked order)
 * @param relevantIds - Set of relevant document IDs
 * @param k - Number of top results to consider
 */
export function precisionAtK(
  results: EvalRetrievalResult[],
  relevantIds: Set<string>,
  k: number
): number {
  const topK = results.slice(0, k);
  const relevantInTopK = topK.filter((r) => relevantIds.has(r.id)).length;
  return relevantInTopK / k;
}

/**
 * Calculate Recall@K
 *
 * Recall@K = (# relevant docs in top K) / (total # relevant docs)
 *
 * @param results - Retrieved results
 * @param relevantIds - Set of relevant document IDs
 * @param k - Number of top results to consider
 */
export function recallAtK(
  results: EvalRetrievalResult[],
  relevantIds: Set<string>,
  k: number
): number {
  if (relevantIds.size === 0) return 0;

  const topK = results.slice(0, k);
  const relevantInTopK = topK.filter((r) => relevantIds.has(r.id)).length;
  return relevantInTopK / relevantIds.size;
}

/**
 * Calculate Mean Reciprocal Rank (MRR)
 *
 * MRR = 1 / (position of first relevant result)
 *
 * @param results - Retrieved results in ranked order
 * @param relevantIds - Set of relevant document IDs
 */
export function meanReciprocalRank(
  results: EvalRetrievalResult[],
  relevantIds: Set<string>
): number {
  for (let i = 0; i < results.length; i++) {
    if (relevantIds.has(results[i].id)) {
      return 1 / (i + 1);
    }
  }
  return 0;
}

/**
 * Calculate Normalized Discounted Cumulative Gain (NDCG)
 *
 * NDCG rewards relevant documents appearing higher in the ranking.
 *
 * @param results - Retrieved results in ranked order
 * @param relevantIds - Set of relevant document IDs
 * @param k - Number of top results to consider
 */
export function ndcg(
  results: EvalRetrievalResult[],
  relevantIds: Set<string>,
  k: number
): number {
  // Calculate DCG
  let dcg = 0;
  const topK = results.slice(0, k);

  for (let i = 0; i < topK.length; i++) {
    const relevance = relevantIds.has(topK[i].id) ? 1 : 0;
    // DCG formula: rel_i / log2(i + 2)
    dcg += relevance / Math.log2(i + 2);
  }

  // Calculate ideal DCG (all relevant docs at the top)
  const idealRelevance = Array(Math.min(relevantIds.size, k)).fill(1);
  let idcg = 0;
  for (let i = 0; i < idealRelevance.length; i++) {
    idcg += idealRelevance[i] / Math.log2(i + 2);
  }

  if (idcg === 0) return 0;
  return dcg / idcg;
}

/**
 * Calculate Hit Rate
 *
 * Whether at least one relevant document appears in results.
 *
 * @param results - Retrieved results
 * @param relevantIds - Set of relevant document IDs
 * @param k - Number of top results to consider
 */
export function hitRate(
  results: EvalRetrievalResult[],
  relevantIds: Set<string>,
  k: number
): number {
  const topK = results.slice(0, k);
  return topK.some((r) => relevantIds.has(r.id)) ? 1 : 0;
}

/**
 * Calculate all retrieval metrics at once
 */
export function calculateRetrievalMetrics(
  results: EvalRetrievalResult[],
  relevantIds: Set<string>,
  k: number
): RetrievalMetrics {
  return {
    precisionAtK: precisionAtK(results, relevantIds, k),
    recallAtK: recallAtK(results, relevantIds, k),
    mrr: meanReciprocalRank(results, relevantIds),
    ndcg: ndcg(results, relevantIds, k),
    hitRate: hitRate(results, relevantIds, k),
    k,
  };
}

/**
 * Calculate average metrics across multiple queries
 */
export function averageMetrics(metricsList: RetrievalMetrics[]): RetrievalMetrics {
  if (metricsList.length === 0) {
    return {
      precisionAtK: 0,
      recallAtK: 0,
      mrr: 0,
      ndcg: 0,
      hitRate: 0,
      k: 0,
    };
  }

  const sum = metricsList.reduce(
    (acc, m) => ({
      precisionAtK: acc.precisionAtK + m.precisionAtK,
      recallAtK: acc.recallAtK + m.recallAtK,
      mrr: acc.mrr + m.mrr,
      ndcg: acc.ndcg + m.ndcg,
      hitRate: acc.hitRate + m.hitRate,
      k: m.k,
    }),
    { precisionAtK: 0, recallAtK: 0, mrr: 0, ndcg: 0, hitRate: 0, k: 0 }
  );

  const n = metricsList.length;
  return {
    precisionAtK: sum.precisionAtK / n,
    recallAtK: sum.recallAtK / n,
    mrr: sum.mrr / n,
    ndcg: sum.ndcg / n,
    hitRate: sum.hitRate / n,
    k: sum.k,
  };
}

/**
 * Format metrics for display
 */
export function formatMetrics(metrics: RetrievalMetrics): string {
  return `
Retrieval Metrics (K=${metrics.k}):
  Precision@${metrics.k}: ${(metrics.precisionAtK * 100).toFixed(1)}%
  Recall@${metrics.k}:    ${(metrics.recallAtK * 100).toFixed(1)}%
  MRR:                    ${metrics.mrr.toFixed(3)}
  NDCG:                   ${metrics.ndcg.toFixed(3)}
  Hit Rate:               ${(metrics.hitRate * 100).toFixed(1)}%
  `.trim();
}
