/**
 * Infrastructure Layer - Qdrant Client
 *
 * Singleton Qdrant client instance
 */

import { QdrantClient } from '@qdrant/js-client-rest';
import { validateFeature } from '@/lib/config/feature-env';

let qdrantClient: QdrantClient | null = null;

/**
 * Get Qdrant client instance (singleton)
 */
export function getQdrantClient(): QdrantClient {
  validateFeature('retrieval');
  if (!qdrantClient) {
    const url = process.env.QDRANT_URL!.trim();
    const apiKey = process.env.QDRANT_API_KEY;

    qdrantClient = new QdrantClient({
      url,
      apiKey,
    });

  }

  return qdrantClient;
}

/**
 * Collection names
 */
export const QDRANT_COLLECTIONS = {
  USER_TRIPS: 'user_trips',
} as const;

/**
 * Vector dimensions
 */
export const VECTOR_DIMENSIONS = {
  OPENAI_SMALL: 1536, // text-embedding-3-small
  OPENAI_LARGE: 3072, // text-embedding-3-large
} as const;
