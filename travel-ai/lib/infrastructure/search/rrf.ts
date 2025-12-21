/**
 * Infrastructure Layer - Reciprocal Rank Fusion (RRF)
 *
 * Combines rankings from multiple search sources into a unified ranking.
 * RRF is robust to score scale differences between search methods.
 *
 * Formula: RRF(d) = Σ 1 / (k + rank_i(d))
 * where k is a constant (typically 60) and rank_i is the rank from source i
 */

import type { RRFConfig, RankedItem, HybridSearchResult } from '@/lib/domain/search/types';
import type { TripVectorPayload } from '@/lib/domain/vector/repository';

const DEFAULT_K = 60;

/**
 * Calculate RRF score for a document appearing in multiple rankings
 *
 * @param ranks - Array of ranks from different sources (1-indexed)
 * @param k - RRF constant (default: 60)
 * @returns RRF score
 */
export function calculateRRFScore(ranks: number[], k: number = DEFAULT_K): number {
  return ranks.reduce((sum, rank) => sum + 1 / (k + rank), 0);
}

/**
 * Fuse multiple ranked lists using Reciprocal Rank Fusion
 *
 * @param rankedLists - Array of ranked results from different sources
 * @param config - RRF configuration
 * @returns Fused and sorted results
 */
export function fuseWithRRF(
  rankedLists: RankedItem[][],
  config: Partial<RRFConfig> = {}
): HybridSearchResult[] {
  const k = config.k ?? DEFAULT_K;

  // Map to accumulate scores and track appearances
  const scoreMap = new Map<
    string,
    {
      rrfScore: number;
      semanticScore: number;
      lexicalScore: number;
      payload: TripVectorPayload;
      appearances: number;
    }
  >();

  // Process each ranked list
  for (const rankedList of rankedLists) {
    for (const item of rankedList) {
      const existing = scoreMap.get(item.id);

      if (existing) {
        // Add to existing RRF score
        existing.rrfScore += 1 / (k + item.rank);
        existing.appearances += 1;

        // Update source-specific scores
        if (item.source === 'semantic') {
          existing.semanticScore = Math.max(existing.semanticScore, item.score);
        } else {
          existing.lexicalScore = Math.max(existing.lexicalScore, item.score);
        }
      } else {
        // First appearance
        scoreMap.set(item.id, {
          rrfScore: 1 / (k + item.rank),
          semanticScore: item.source === 'semantic' ? item.score : 0,
          lexicalScore: item.source === 'lexical' ? item.score : 0,
          payload: item.payload,
          appearances: 1,
        });
      }
    }
  }

  // Convert to array and sort by RRF score (descending)
  const results: HybridSearchResult[] = Array.from(scoreMap.entries())
    .map(([id, data]) => ({
      id,
      payload: data.payload,
      score: data.rrfScore,
      scores: {
        semantic: data.semanticScore,
        lexical: data.lexicalScore,
        rrf: data.rrfScore,
      },
    }))
    .sort((a, b) => b.score - a.score);

  return results;
}

/**
 * Apply weighted combination of semantic and lexical scores
 * Alternative to RRF when scores are normalized
 *
 * @param semanticScore - Score from vector search (0-1)
 * @param lexicalScore - Score from BM25 (normalized 0-1)
 * @param alpha - Weight for semantic (0-1). Default: 0.7
 * @returns Combined score
 */
export function weightedCombination(
  semanticScore: number,
  lexicalScore: number,
  alpha: number = 0.7
): number {
  return alpha * semanticScore + (1 - alpha) * lexicalScore;
}

/**
 * Normalize BM25 scores to 0-1 range using min-max normalization
 *
 * @param scores - Array of raw BM25 scores
 * @returns Normalized scores
 */
export function normalizeBM25Scores(scores: number[]): number[] {
  if (scores.length === 0) return [];

  const min = Math.min(...scores);
  const max = Math.max(...scores);

  // Avoid division by zero
  if (max === min) {
    return scores.map(() => 1);
  }

  return scores.map((score) => (score - min) / (max - min));
}
