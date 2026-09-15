/**
 * Application Layer - Save Trip Use Case
 *
 * Clean Architecture: Use Case orchestrates business logic
 * and coordinates between repositories
 */

import type { ITripRepository, SaveTripData, SavedTrip } from '@/lib/domain/trip/repository';
import type { IVectorRepository, TripVectorPayload } from '@/lib/domain/vector/repository';
import type { IEmbeddingsService } from '@/lib/domain/embeddings/service';
import { generateTripSummary } from '@/ai/utils/summary-generator';

/**
 * Save Trip Use Case
 *
 * Orchestrates dual-storage save:
 * 1. Save to PostgreSQL (Drizzle)
 * 2. Generate summary text
 * 3. Generate embedding
 * 4. Save to Qdrant (Vector DB)
 */
export class SaveTripUseCase {
  constructor(
    private tripRepository: ITripRepository,
    private vectorRepository: IVectorRepository,
    private embeddingsService: IEmbeddingsService
  ) {}

  async execute(data: SaveTripData): Promise<SavedTrip> {
    console.log('📝 SaveTripUseCase: Starting dual-storage save...');

    try {
      // Step 1: Save to PostgreSQL (source of truth)
      console.log('1️⃣ Saving to PostgreSQL...');
      const savedTrip = await this.tripRepository.save(data);
      // Keep a durable pending job even when embedding/Qdrant is unavailable.
      await this.tripRepository.enqueueIndexing?.(savedTrip.id, 'upsert');

      // Step 2: Generate summary text for embedding
      console.log('2️⃣ Generating summary text...');
      const summaryText = generateTripSummary(savedTrip);
      console.log(`   Summary: ${summaryText.substring(0, 100)}...`);

      // Step 3: Generate embedding vector
      console.log('3️⃣ Generating embedding...');
      const embedding = await this.withRetry(() => this.embeddingsService.generate(summaryText));

      // Step 4: Build Qdrant payload
      console.log('4️⃣ Building vector payload...');
      const vectorPayload: TripVectorPayload = {
        trip_id: savedTrip.id,
        user_id: savedTrip.userId,
        title: savedTrip.title,
        destination: savedTrip.destination,
        departure_city: savedTrip.departureCity,
        departure_date: savedTrip.departureDate,
        stay_duration: savedTrip.stayDuration,
        num_people: savedTrip.numPeople,
        budget_category: data.formInput.budgetCategory || 'standard',
        total_budget: Number(savedTrip.budget),
        summary_text: summaryText,
        num_flights: savedTrip.flights.length,
        num_hotels: savedTrip.hotels.length,
        num_activities: savedTrip.activities.length,
        status: savedTrip.status,
        created_at: savedTrip.createdAt.toISOString(),
        thread_id: savedTrip.threadId,
      };

      // Step 5: Upsert to Qdrant
      console.log('5️⃣ Upserting to Qdrant...');
      await this.withRetry(() => this.vectorRepository.upsert(savedTrip.id, embedding, vectorPayload));

      console.log('✅ SaveTripUseCase: Dual-storage save completed successfully!');

      return savedTrip;
    } catch (error) {
      console.error('❌ SaveTripUseCase: Failed to save trip', error);

      // If PostgreSQL save succeeded but Qdrant failed, trip is still saved
      // Log the error but don't fail the entire operation
      if (error instanceof Error && error.message.includes('Qdrant')) {
        console.warn('⚠️  Trip saved to database but Qdrant sync failed');
      }

      throw error;
    }
  }

  private async withRetry<T>(operation: () => Promise<T>, maxAttempts = 3): Promise<T> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try { return await operation(); } catch (error) {
        lastError = error;
        if (attempt === maxAttempts) break;
        await new Promise((resolve) => setTimeout(resolve, 100 * 2 ** (attempt - 1)));
      }
    }
    throw lastError;
  }
}
