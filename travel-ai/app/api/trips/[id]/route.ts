/**
 * API Route - Get Trip by ID
 *
 * GET /api/trips/[id]
 */

import { NextRequest, NextResponse } from 'next/server';
import { db, trips } from '@/lib/db';
import { eq } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'Trip ID is required' },
        { status: 400 }
      );
    }

    // Fetch trip from database
    const [trip] = await db
      .select()
      .from(trips)
      .where(eq(trips.id, id))
      .limit(1);

    if (!trip) {
      return NextResponse.json(
        { error: 'Trip not found' },
        { status: 404 }
      );
    }

    // Return trip data
    return NextResponse.json({
      success: true,
      trip: {
        id: trip.id,
        title: trip.title,
        destination: trip.destination,
        startDate: trip.startDate,
        endDate: trip.endDate,
        budget: trip.budget,
        numPeople: trip.numPeople,
        departureCity: trip.departureCity,
        arrivalCity: trip.arrivalCity,
        departureDate: trip.departureDate,
        stayDuration: trip.stayDuration,
        flights: trip.flights || [],
        hotels: trip.hotels || [],
        activities: trip.activities || [],
        status: trip.status,
        threadId: trip.threadId,
        createdAt: trip.createdAt,
        updatedAt: trip.updatedAt,
      },
    });
  } catch (error) {
    console.error('❌ Error fetching trip:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trip' },
      { status: 500 }
    );
  }
}
