/**
 * Trip Detail API Route
 * GET /api/trips/:id - Get a specific trip
 * PUT /api/trips/:id - Update a trip
 * DELETE /api/trips/:id - Delete a trip
 */

import { NextRequest, NextResponse } from 'next/server';
import { TripService } from '@/lib/services/trip-service';
import { requireAuth } from '@/lib/auth/session';
import { updateTripSchema } from '@/lib/validations/trip';
import { ZodError } from 'zod';

interface RouteParams {
  params: {
    id: string;
  };
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await requireAuth();
    const trip = await TripService.getTripById(params.id, session.user.id);
    
    if (!trip) {
      return NextResponse.json(
        { error: 'Trip not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ data: trip });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    console.error('Error fetching trip:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trip' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    
    // Validate input
    const validatedData = updateTripSchema.parse({
      ...body,
      id: params.id,
    });
    
    const updatedTrip = await TripService.updateTrip(validatedData);
    
    if (!updatedTrip) {
      return NextResponse.json(
        { error: 'Trip not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ data: updatedTrip });
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
    
    console.error('Error updating trip:', error);
    return NextResponse.json(
      { error: 'Failed to update trip' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await requireAuth();
    const deleted = await TripService.deleteTrip(params.id, session.user.id);
    
    if (!deleted) {
      return NextResponse.json(
        { error: 'Trip not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ message: 'Trip deleted successfully' });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    console.error('Error deleting trip:', error);
    return NextResponse.json(
      { error: 'Failed to delete trip' },
      { status: 500 }
    );
  }
}
