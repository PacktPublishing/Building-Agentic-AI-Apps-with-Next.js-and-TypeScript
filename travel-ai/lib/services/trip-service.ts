/**
 * Trip Service
 * Business logic for trip management
 */

import { db } from '../db';
import { trips } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import type { CreateTripInput, UpdateTripInput, Trip } from '../validations/trip';
import { createTripSchema, updateTripSchema } from '../validations/trip';

export class TripService {
  /**
   * Get all trips for a user
   */
  static async getUserTrips(userId: string): Promise<Trip[]> {
    const userTrips = await db
      .select()
      .from(trips)
      .where(eq(trips.userId, userId));
    
    return userTrips as Trip[];
  }

  /**
   * Get a single trip by ID
   */
  static async getTripById(tripId: string, userId: string): Promise<Trip | null> {
    const [trip] = await db
      .select()
      .from(trips)
      .where(and(eq(trips.id, tripId), eq(trips.userId, userId)));
    
    return trip as Trip || null;
  }

  /**
   * Create a new trip
   */
  static async createTrip(input: CreateTripInput): Promise<Trip> {
    // Validate input
    const validatedInput = createTripSchema.parse(input);
    
    const [newTrip] = await db
      .insert(trips)
      .values({
        ...validatedInput,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    
    return newTrip as Trip;
  }

  /**
   * Update an existing trip
   */
  static async updateTrip(input: UpdateTripInput): Promise<Trip | null> {
    // Validate input
    const validatedInput = updateTripSchema.parse(input);
    const { id, ...updateData } = validatedInput;
    
    const [updatedTrip] = await db
      .update(trips)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(trips.id, id))
      .returning();
    
    return updatedTrip as Trip || null;
  }

  /**
   * Delete a trip
   */
  static async deleteTrip(tripId: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(trips)
      .where(and(eq(trips.id, tripId), eq(trips.userId, userId)))
      .returning();
    
    return result.length > 0;
  }
}
