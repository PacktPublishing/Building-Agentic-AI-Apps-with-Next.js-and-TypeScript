/**
 * Evaluation Module - Barrel Export
 */

export {
  calculateRetrievalMetrics,
  averageMetrics,
  formatMetrics,
  precisionAtK,
  recallAtK,
  meanReciprocalRank,
  ndcg,
  hitRate,
  type RetrievalMetrics,
  type EvalRetrievalResult,
} from './metrics';

export {
  TEST_QUERIES,
  getQueriesByCategory,
  getQueriesByDifficulty,
  setRelevantTripIds,
  type TestQuery,
} from './test-dataset';

export {
  RAGEvaluator,
  type QueryEvalResult,
  type EvaluationResults,
  type GenerationEvalResult,
} from './evaluator';
