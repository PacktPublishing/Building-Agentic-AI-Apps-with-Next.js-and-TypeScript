/**
 * Infrastructure Layer - BM25 Lexical Search Index
 *
 * In-memory BM25 index for keyword-based search.
 * Complements vector search for hybrid retrieval.
 */

import type { TripVectorPayload } from '@/lib/domain/vector/repository';
import type { LexicalSearchResult } from '@/lib/domain/search/types';

/**
 * BM25 Parameters
 */
interface BM25Config {
  /** Term frequency saturation parameter (default: 1.2) */
  k1: number;
  /** Document length normalization (default: 0.75) */
  b: number;
}

/**
 * Document in the index
 */
interface IndexedDocument {
  id: string;
  text: string;
  payload: TripVectorPayload;
  /** Term frequencies for this document */
  termFrequencies: Map<string, number>;
  /** Total number of terms in document */
  length: number;
}

/**
 * BM25 Index for lexical search
 *
 * Implements the Okapi BM25 ranking function for keyword matching.
 */
export class BM25Index {
  private documents: Map<string, IndexedDocument> = new Map();
  private documentFrequency: Map<string, number> = new Map();
  private averageDocLength: number = 0;
  private config: BM25Config;

  constructor(config: Partial<BM25Config> = {}) {
    this.config = {
      k1: config.k1 ?? 1.2,
      b: config.b ?? 0.75,
    };
  }

  /**
   * Tokenize text into terms
   */
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ') // Remove punctuation
      .split(/\s+/) // Split on whitespace
      .filter((term) => term.length > 1); // Remove single chars
  }

  /**
   * Calculate term frequencies for a document
   */
  private calculateTermFrequencies(terms: string[]): Map<string, number> {
    const frequencies = new Map<string, number>();
    for (const term of terms) {
      frequencies.set(term, (frequencies.get(term) || 0) + 1);
    }
    return frequencies;
  }

  /**
   * Update average document length
   */
  private updateAverageDocLength(): void {
    if (this.documents.size === 0) {
      this.averageDocLength = 0;
      return;
    }

    const totalLength = Array.from(this.documents.values()).reduce(
      (sum, doc) => sum + doc.length,
      0
    );
    this.averageDocLength = totalLength / this.documents.size;
  }

  /**
   * Add a document to the index
   */
  add(id: string, text: string, payload: TripVectorPayload): void {
    // Remove existing document if present
    if (this.documents.has(id)) {
      this.remove(id);
    }

    const terms = this.tokenize(text);
    const termFrequencies = this.calculateTermFrequencies(terms);

    // Update document frequency for each unique term
    for (const term of termFrequencies.keys()) {
      this.documentFrequency.set(
        term,
        (this.documentFrequency.get(term) || 0) + 1
      );
    }

    // Store document
    this.documents.set(id, {
      id,
      text,
      payload,
      termFrequencies,
      length: terms.length,
    });

    // Update average document length
    this.updateAverageDocLength();
  }

  /**
   * Remove a document from the index
   */
  remove(id: string): void {
    const doc = this.documents.get(id);
    if (!doc) return;

    // Update document frequency
    for (const term of doc.termFrequencies.keys()) {
      const df = this.documentFrequency.get(term) || 0;
      if (df <= 1) {
        this.documentFrequency.delete(term);
      } else {
        this.documentFrequency.set(term, df - 1);
      }
    }

    // Remove document
    this.documents.delete(id);

    // Update average document length
    this.updateAverageDocLength();
  }

  /**
   * Clear the entire index
   */
  clear(): void {
    this.documents.clear();
    this.documentFrequency.clear();
    this.averageDocLength = 0;
  }

  /**
   * Get the number of documents in the index
   */
  size(): number {
    return this.documents.size;
  }

  /**
   * Calculate BM25 score for a query against a document
   */
  private calculateBM25Score(queryTerms: string[], doc: IndexedDocument): number {
    const N = this.documents.size;
    const { k1, b } = this.config;

    let score = 0;

    for (const term of queryTerms) {
      const tf = doc.termFrequencies.get(term) || 0;
      if (tf === 0) continue;

      const df = this.documentFrequency.get(term) || 0;

      // IDF component: log((N - df + 0.5) / (df + 0.5) + 1)
      const idf = Math.log((N - df + 0.5) / (df + 0.5) + 1);

      // TF component with length normalization
      const tfNormalized =
        (tf * (k1 + 1)) /
        (tf + k1 * (1 - b + b * (doc.length / this.averageDocLength)));

      score += idf * tfNormalized;
    }

    return score;
  }

  /**
   * Search the index with a query
   *
   * @param query - Search query
   * @param limit - Maximum results to return
   * @param filter - Optional filter function
   * @returns Ranked search results
   */
  search(
    query: string,
    limit: number = 10,
    filter?: (payload: TripVectorPayload) => boolean
  ): LexicalSearchResult[] {
    const queryTerms = this.tokenize(query);

    if (queryTerms.length === 0) {
      return [];
    }

    const results: LexicalSearchResult[] = [];

    for (const doc of this.documents.values()) {
      // Apply filter if provided
      if (filter && !filter(doc.payload)) {
        continue;
      }

      const score = this.calculateBM25Score(queryTerms, doc);

      if (score > 0) {
        results.push({
          id: doc.id,
          score,
          payload: doc.payload,
        });
      }
    }

    // Sort by score (descending) and limit
    return results.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  /**
   * Bulk add documents to the index
   */
  addBatch(
    documents: Array<{ id: string; text: string; payload: TripVectorPayload }>
  ): void {
    for (const doc of documents) {
      this.add(doc.id, doc.text, doc.payload);
    }
  }

  /**
   * Get index statistics
   */
  getStats(): {
    documentCount: number;
    uniqueTerms: number;
    averageDocLength: number;
  } {
    return {
      documentCount: this.documents.size,
      uniqueTerms: this.documentFrequency.size,
      averageDocLength: this.averageDocLength,
    };
  }
}
