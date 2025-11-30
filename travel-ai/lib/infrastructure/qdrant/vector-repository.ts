/**
 * Infrastructure Layer - Vector Repository Implementation
 *
 * Implements IVectorRepository using Qdrant
 */

import type {
  IVectorRepository,
  TripVectorPayload,
  VectorSearchFilter,
  VectorSearchResult,
} from '@/lib/domain/vector/repository';
import { getQdrantClient, QDRANT_COLLECTIONS } from './client';

export class QdrantVectorRepository implements IVectorRepository {
  private client = getQdrantClient();
  private collectionInitialized = false;

  /**
   * Ensure the collection exists, create if not
   */
  private async ensureCollection(): Promise<void> {
    if (this.collectionInitialized) return;

    try {
      const collections = await this.client.getCollections();
      const exists = collections.collections.some(
        (c) => c.name === QDRANT_COLLECTIONS.USER_TRIPS
      );

      if (!exists) {
        console.log(`📦 Creating Qdrant collection: ${QDRANT_COLLECTIONS.USER_TRIPS}`);
        await this.client.createCollection(QDRANT_COLLECTIONS.USER_TRIPS, {
          vectors: {
            size: 1536, // OpenAI text-embedding-3-small dimension
            distance: 'Cosine',
          },
        });
        console.log(`✅ Qdrant collection created: ${QDRANT_COLLECTIONS.USER_TRIPS}`);
      }

      this.collectionInitialized = true;
    } catch (error) {
      console.error('❌ Failed to ensure Qdrant collection:', error);
      // Don't throw - allow operation to continue and fail naturally if needed
    }
  }

  async upsert(
    tripId: string,
    vector: number[],
    payload: TripVectorPayload
  ): Promise<void> {
    try {
      // Ensure collection exists before upserting
      await this.ensureCollection();

      await this.client.upsert(QDRANT_COLLECTIONS.USER_TRIPS, {
        points: [
          {
            id: tripId,
            vector,
            payload,
          },
        ],
      });

      console.log(`✅ Upserted trip vector to Qdrant: ${tripId}`);
    } catch (error) {
      console.error('❌ Failed to upsert to Qdrant:', error);
      throw new Error(`Failed to upsert trip vector: ${error}`);
    }
  }

  async getById(tripId: string): Promise<{ id: string; vector: number[]; payload: TripVectorPayload } | null> {
    try {
      await this.ensureCollection();

      const result = await this.client.retrieve(QDRANT_COLLECTIONS.USER_TRIPS, {
        ids: [tripId],
        with_vector: true,
        with_payload: true,
      });

      if (result.length === 0) {
        return null;
      }

      const point = result[0];
      return {
        id: point.id as string,
        vector: point.vector as number[],
        payload: point.payload as TripVectorPayload,
      };
    } catch (error) {
      console.error('❌ Failed to get point from Qdrant:', error);
      return null;
    }
  }

  async search(
    queryVector: number[],
    filter: VectorSearchFilter,
    limit: number = 5
  ): Promise<VectorSearchResult[]> {
    try {
      // Ensure collection exists before searching
      await this.ensureCollection();

      // Build filter only if there are conditions
      const mustConditions: any[] = [];

      // Only filter by user_id if provided
      if (filter.user_id) {
        mustConditions.push({
          key: 'user_id',
          match: { value: filter.user_id },
        });
      }

      if (filter.destination) {
        mustConditions.push({
          key: 'destination',
          match: { value: filter.destination },
        });
      }

      if (filter.budget_category) {
        mustConditions.push({
          key: 'budget_category',
          match: { value: filter.budget_category },
        });
      }

      // Only include filter if there are conditions
      const searchParams: any = {
        vector: queryVector,
        limit,
      };

      if (mustConditions.length > 0) {
        searchParams.filter = { must: mustConditions };
      }

      const searchResult = await this.client.search(QDRANT_COLLECTIONS.USER_TRIPS, searchParams);

      return searchResult.map((result) => ({
        id: result.id as string,
        score: result.score,
        payload: result.payload as TripVectorPayload,
      }));
    } catch (error) {
      console.error('❌ Failed to search Qdrant:', error);
      throw new Error(`Failed to search trip vectors: ${error}`);
    }
  }

  async delete(tripId: string): Promise<void> {
    try {
      await this.client.delete(QDRANT_COLLECTIONS.USER_TRIPS, {
        points: [tripId],
      });

      console.log(`✅ Deleted trip vector from Qdrant: ${tripId}`);
    } catch (error) {
      console.error('❌ Failed to delete from Qdrant:', error);
      throw new Error(`Failed to delete trip vector: ${error}`);
    }
  }
}
