/**
 * Presentation Layer - Save Trip API Endpoint
 *
 * POST /api/trips/save
 *
 * Clean Architecture: API route delegates to Use Case
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Application Layer
import { SaveTripUseCase } from '@/lib/application/use-cases/save-trip.use-case';

// Infrastructure Layer (Adapters)
import { DrizzleTripRepository } from '@/lib/infrastructure/db/trip-repository';
import { QdrantVectorRepository } from '@/lib/infrastructure/qdrant/vector-repository';
import { OpenAIEmbeddingsService } from '@/lib/infrastructure/embeddings/openai-service';

// Validation Schema
const saveTripSchema = z.object({
  userId: z.string().min(1), // Allow any string for dev, UUID in production
  title: z.string().min(1).max(200).optional(),
  formInput: z.object({
    numPeople: z.number().int().min(1).max(20),
    departureCity: z.string().min(1),
    arrivalCity: z.string().min(1),
    departureDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    stayDuration: z.number().int().min(1).max(90),
    budgetCategory: z.enum(['economy', 'standard', 'premium']).optional().default('standard'),
    numRooms: z.number().int().min(1).max(10).optional().default(1),
    userId: z.string().min(1),
  }),
  orchestratorDecisions: z.object({
    budget: z.object({
      flightBudgetPerPerson: z.number(),
      hotelBudgetPerNight: z.number(),
      activityBudgetPerDay: z.number(),
      totalEstimated: z.number(),
    }),
    criteria: z.object({
      flightClass: z.enum(['economy', 'premium_economy', 'business']),
      maxStops: z.number(),
      hotelStars: z.number(),
      activityTypes: z.array(z.string()),
    }),
    analysisComplete: z.boolean().optional(),
  }),
  flightResults: z.object({
    data: z.array(z.any()).nullable(),
  }),
  hotelResults: z.object({
    data: z.array(z.any()).nullable(),
  }),
  activityResults: z.object({
    data: z.array(z.any()).nullable(),
  }),
  threadId: z.string(),
});

/**
 * POST /api/trips/save
 *
 * Saves trip to both PostgreSQL and Qdrant
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Parse and validate request body
    const body = await request.json();
    const validatedData = saveTripSchema.parse(body);

    console.log(`📥 Received save request for user: ${validatedData.userId}`);

    // 2. Initialize repositories (Dependency Injection)
    const tripRepository = new DrizzleTripRepository();
    const vectorRepository = new QdrantVectorRepository();
    const embeddingsService = new OpenAIEmbeddingsService();

    // 3. Execute use case
    const saveTripUseCase = new SaveTripUseCase(
      tripRepository,
      vectorRepository,
      embeddingsService
    );

    const savedTrip = await saveTripUseCase.execute(validatedData as any);

    // 4. Return success response
    return NextResponse.json(
      {
        success: true,
        tripId: savedTrip.id,
        message: 'Trip saved successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('❌ API Error - Save Trip:', error);

    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    // Handle other errors
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to save trip',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
