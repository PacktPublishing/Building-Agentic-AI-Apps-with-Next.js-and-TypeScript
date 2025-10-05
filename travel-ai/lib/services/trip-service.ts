import { and, desc, eq } from 'drizzle-orm';
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { db } from '@/lib/db';
import { trips } from '@/lib/db/schema';

/**
 * Drizzle-inferred trip type used across the service surface.
 */
export type Trip = InferSelectModel<typeof trips>;

type NewTrip = InferInsertModel<typeof trips>;

export interface CreateTripInput {
  userId: string;
  title: string;
  destination: string;
  startDate?: string | Date | null;
  endDate?: string | Date | null;
  budget?: string | number | null;
}

export interface UpdateTripInput {
  id: string;
  userId: string;
  title?: string;
  destination?: string;
  startDate?: string | Date | null;
  endDate?: string | Date | null;
  budget?: string | number | null;
}

const normalizeDate = (value?: string | Date | null) => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return value instanceof Date ? value.toISOString().slice(0, 10) : value;
};

const normalizeBudget = (value?: string | number | null) => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return typeof value === 'number' ? value.toString() : value;
};

export class TripService {
  static async getUserTrips(userId: string): Promise<Trip[]> {
    return db
      .select()
      .from(trips)
      .where(eq(trips.userId, userId))
      .orderBy(desc(trips.createdAt));
  }

  static async getTripById(tripId: string, userId: string): Promise<Trip | null> {
    const [trip] = await db
      .select()
      .from(trips)
      .where(and(eq(trips.id, tripId), eq(trips.userId, userId)))
      .limit(1);

    return trip ?? null;
  }

  static async createTrip(input: CreateTripInput): Promise<Trip> {
    const payload: NewTrip = {
      userId: input.userId,
      title: input.title,
      destination: input.destination,
    };

    const startDate = normalizeDate(input.startDate);
    if (startDate !== undefined) payload.startDate = startDate;

    const endDate = normalizeDate(input.endDate);
    if (endDate !== undefined) payload.endDate = endDate;

    const budget = normalizeBudget(input.budget);
    if (budget !== undefined) payload.budget = budget;

    const [trip] = await db.insert(trips).values(payload).returning();

    return trip;
  }

  static async updateTrip(input: UpdateTripInput): Promise<Trip | null> {
    const { id, userId, ...updates } = input;

    const payload: Partial<NewTrip> = {};

    if (updates.title !== undefined) payload.title = updates.title;
    if (updates.destination !== undefined) payload.destination = updates.destination;

    const startDate = normalizeDate(updates.startDate);
    if (startDate !== undefined) payload.startDate = startDate;

    const endDate = normalizeDate(updates.endDate);
    if (endDate !== undefined) payload.endDate = endDate;

    const budget = normalizeBudget(updates.budget);
    if (budget !== undefined) payload.budget = budget;

    if (Object.keys(payload).length === 0) {
      return this.getTripById(id, userId);
    }

    const [trip] = await db
      .update(trips)
      .set(payload)
      .where(and(eq(trips.id, id), eq(trips.userId, userId)))
      .returning();

    return trip ?? null;
  }

  static async deleteTrip(tripId: string, userId: string): Promise<boolean> {
    const deleted = await db
      .delete(trips)
      .where(and(eq(trips.id, tripId), eq(trips.userId, userId)))
      .returning({ id: trips.id });

    return deleted.length > 0;
  }
}
