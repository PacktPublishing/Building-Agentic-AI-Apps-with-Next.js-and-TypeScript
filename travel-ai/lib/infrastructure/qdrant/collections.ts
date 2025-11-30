/**
 * Infrastructure Layer - Qdrant Collections Management
 *
 * Create and manage Qdrant collections
 */

import { getQdrantClient, QDRANT_COLLECTIONS, VECTOR_DIMENSIONS } from './client';

/**
 * Initialize Qdrant collections
 * Call this on app startup or first use
 */
export async function initializeCollections(): Promise<void> {
  const client = getQdrantClient();

  try {
    // Check if user_trips collection exists
    const collections = await client.getCollections();
    const exists = collections.collections.some(
      (c) => c.name === QDRANT_COLLECTIONS.USER_TRIPS
    );

    if (!exists) {
      console.log(`🔧 Creating collection: ${QDRANT_COLLECTIONS.USER_TRIPS}`);

      await client.createCollection(QDRANT_COLLECTIONS.USER_TRIPS, {
        vectors: {
          size: VECTOR_DIMENSIONS.OPENAI_SMALL,
          distance: 'Cosine',
        },
      });

      console.log(`✅ Collection created: ${QDRANT_COLLECTIONS.USER_TRIPS}`);
    } else {
      console.log(`✓ Collection already exists: ${QDRANT_COLLECTIONS.USER_TRIPS}`);
    }
  } catch (error) {
    console.error('❌ Failed to initialize Qdrant collections:', error);
    throw error;
  }
}
