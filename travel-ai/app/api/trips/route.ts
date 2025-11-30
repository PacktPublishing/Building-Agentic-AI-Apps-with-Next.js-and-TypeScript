/**
 * API Route - List User Trips
 *
 * GET /api/trips?userId=xxx
 */

import { NextRequest, NextResponse } from 'next/server';
import { db, trips } from '@/lib/db';
import { eq, desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Fetch all trips for the user, ordered by creation date
    const userTrips = await db
      .select({
        id: trips.id,
        title: trips.title,
        destination: trips.destination,
        departureCity: trips.departureCity,
        arrivalCity: trips.arrivalCity,
        startDate: trips.startDate,
        endDate: trips.endDate,
        stayDuration: trips.stayDuration,
        numPeople: trips.numPeople,
        budget: trips.budget,
        status: trips.status,
        createdAt: trips.createdAt,
      })
      .from(trips)
      .where(eq(trips.userId, userId))
      .orderBy(desc(trips.createdAt));

    return NextResponse.json({
      success: true,
      trips: userTrips,
      count: userTrips.length,
    });
  } catch (error) {
    console.error('❌ Error fetching trips:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trips' },
      { status: 500 }
    );
  }
}
