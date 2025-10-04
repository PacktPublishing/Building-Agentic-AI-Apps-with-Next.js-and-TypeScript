/**
 * Trips API Route
 * GET /api/trips - Get all trips for authenticated user
 * POST /api/trips - Create a new trip
 */

import { NextRequest, NextResponse } from 'next/server';
import { TripService } from '@/lib/services/trip-service';
import { requireAuth } from '@/lib/auth/session';
import { createTripSchema } from '@/lib/validations/trip';
import { ZodError } from 'zod';

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    const trips = await TripService.getUserTrips(session.user.id);
    
    return NextResponse.json({ data: trips });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    console.error('Error fetching trips:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trips' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    
    // Validate input
    const validatedData = createTripSchema.parse({
      ...body,
      userId: session.user.id,
    });
    
    const newTrip = await TripService.createTrip(validatedData);
    
    return NextResponse.json(
      { data: newTrip },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    
    console.error('Error creating trip:', error);
    return NextResponse.json(
      { error: 'Failed to create trip' },
      { status: 500 }
    );
  }
}
