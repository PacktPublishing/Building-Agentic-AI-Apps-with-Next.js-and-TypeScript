/**
 * Infrastructure Layer - Trip Repository Implementation
 *
 * Implements ITripRepository using Drizzle ORM
 */

import { db, trips, users, tripIndexJobs } from '@/lib/db';
import { eq, and } from 'drizzle-orm';
import type { ITripRepository, SaveTripData, SavedTrip } from '@/lib/domain/trip/repository';
import { calculateReturnDate } from '@/ai/workflow/trip-planner-state';

export class DrizzleTripRepository implements ITripRepository {
  async enqueueIndexing(tripId: string, operation: 'upsert' | 'delete' = 'upsert'): Promise<void> {
    await db.insert(tripIndexJobs).values({ tripId, operation, status: 'pending' })
      .onConflictDoUpdate({ target: tripIndexJobs.tripId, set: { operation, status: 'pending', updatedAt: new Date() } });
  }
  /**
   * Ensure user exists in local DB (sync from Supabase Auth)
   */
  private async ensureUserExists(userId: string): Promise<void> {
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (existingUser.length === 0) {
      // Create user record for Supabase Auth user
      await db.insert(users).values({
        id: userId,
        email: `user-${userId.substring(0, 8)}@placeholder.com`, // Placeholder email
        name: null,
      });
      console.log(`✅ Created local user record for: ${userId}`);
    }
  }

  async save(data: SaveTripData): Promise<SavedTrip> {
    const {
      userId,
      title,
      formInput,
      orchestratorDecisions,
      flightResults,
      hotelResults,
      activityResults,
      threadId,
    } = data;

    const returnDate = calculateReturnDate(formInput.departureDate, formInput.stayDuration);

    try {
      // Ensure user exists before inserting trip (FK constraint)
      await this.ensureUserExists(userId);
      const [newTrip] = await db
        .insert(trips)
        .values({
          userId,
          title: title || `Trip to ${formInput.arrivalCity}`,
          destination: formInput.arrivalCity,
          startDate: formInput.departureDate,
          endDate: returnDate,
          budget: orchestratorDecisions.budget.totalEstimated.toString(),
          // Trip planner fields
          numPeople: formInput.numPeople,
          departureCity: formInput.departureCity,
          arrivalCity: formInput.arrivalCity,
          departureDate: formInput.departureDate,
          stayDuration: formInput.stayDuration,
          // JSONB search results
          flights: flightResults.data || [],
          hotels: hotelResults.data || [],
          activities: activityResults.data || [],
          // Metadata
          status: 'confirmed', // User clicked save → confirmed
          threadId,
        })
        .returning();

      console.log(`✅ Trip saved to database: ${newTrip.id}`);

      return this.mapToSavedTrip(newTrip);
    } catch (error) {
      console.error('❌ Failed to save trip to database:', error);
      throw new Error(`Failed to save trip: ${error}`);
    }
  }

  async findById(tripId: string, userId: string): Promise<SavedTrip | null> {
    try {
      const [trip] = await db
        .select()
        .from(trips)
        .where(and(eq(trips.id, tripId), eq(trips.userId, userId)));

      if (!trip) {
        return null;
      }

      return this.mapToSavedTrip(trip);
    } catch (error) {
      console.error('❌ Failed to find trip:', error);
      throw new Error(`Failed to find trip: ${error}`);
    }
  }

  async findByUserId(userId: string): Promise<SavedTrip[]> {
    try {
      const userTrips = await db.select().from(trips).where(eq(trips.userId, userId));

      return userTrips.map((trip) => this.mapToSavedTrip(trip));
    } catch (error) {
      console.error('❌ Failed to find user trips:', error);
      throw new Error(`Failed to find user trips: ${error}`);
    }
  }

  /**
   * Map database row to SavedTrip domain object
   */
  private mapToSavedTrip(row: any): SavedTrip {
    return {
      id: row.id,
      userId: row.userId,
      title: row.title,
      destination: row.destination,
      startDate: row.startDate,
      endDate: row.endDate,
      budget: row.budget,
      numPeople: row.numPeople || 0,
      departureCity: row.departureCity || '',
      arrivalCity: row.arrivalCity || '',
      departureDate: row.departureDate || '',
      stayDuration: row.stayDuration || 0,
      flights: Array.isArray(row.flights) ? row.flights : [],
      hotels: Array.isArray(row.hotels) ? row.hotels : [],
      activities: Array.isArray(row.activities) ? row.activities : [],
      status: row.status || 'draft',
      threadId: row.threadId || '',
      createdAt: row.createdAt,
      updatedAt: row.updatedAt || row.createdAt,
    };
  }
}
