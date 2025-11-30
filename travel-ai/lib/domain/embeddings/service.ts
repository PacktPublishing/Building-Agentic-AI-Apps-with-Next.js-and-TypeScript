/**
 * Domain Layer - Embeddings Service Interface
 *
 * Clean Architecture: Domain layer defines the contract
 * for embedding generation
 */

/**
 * Embeddings Service Interface (Port)
 * Implementation will be in Infrastructure layer
 */
export interface IEmbeddingsService {
  /**
   * Generate embedding vector from text
   * @param text - Text to embed
   * @returns Vector embedding (1536 dimensions for OpenAI)
   */
  generate(text: string): Promise<number[]>;

  /**
   * Generate embeddings for multiple texts
   * @param texts - Array of texts
   * @returns Array of vector embeddings
   */
  generateBatch(texts: string[]): Promise<number[][]>;
}
