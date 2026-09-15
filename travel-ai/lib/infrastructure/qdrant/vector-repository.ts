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
          match: Array.isArray(filter.destination) ? { any: filter.destination } : { value: filter.destination },
        });
      }

      if (filter.budget_category) {
        mustConditions.push({
          key: 'budget_category',
          match: { value: filter.budget_category },
        });
      }
      if (filter.budget_min !== undefined) mustConditions.push({ key: 'total_budget', range: { gte: filter.budget_min } });
      if (filter.budget_max !== undefined) mustConditions.push({ key: 'total_budget', range: { lte: filter.budget_max } });
      if (filter.min_duration !== undefined) mustConditions.push({ key: 'stay_duration', range: { gte: filter.min_duration } });
      if (filter.max_duration !== undefined) mustConditions.push({ key: 'stay_duration', range: { lte: filter.max_duration } });
      if (filter.departure_city) mustConditions.push({ key: 'departure_city', match: { value: filter.departure_city } });
      if (filter.num_people !== undefined) mustConditions.push({ key: 'num_people', match: { value: filter.num_people } });

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

  async listAll(): Promise<VectorSearchResult[]> {
    await this.ensureCollection();
    const all: VectorSearchResult[] = [];
    let offset: string | number | undefined;
    do {
      const page = await this.client.scroll(QDRANT_COLLECTIONS.USER_TRIPS, {
        limit: 100,
        offset,
        with_payload: true,
        with_vector: false,
      });
      all.push(...page.points.map((point) => ({
        id: point.id as string,
        score: 0,
        payload: point.payload as TripVectorPayload,
      })));
      offset = page.next_page_offset as string | number | undefined;
    } while (offset !== undefined);
    return all;
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
