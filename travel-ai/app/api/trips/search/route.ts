/**
 * API Route - Semantic Trip Search
 *
 * POST /api/trips/search
 *
 * Search trips using natural language queries
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Application Layer
import { SearchTripsUseCase } from '@/lib/application/use-cases/search-trips.use-case';

// Infrastructure Layer
import { QdrantVectorRepository } from '@/lib/infrastructure/qdrant/vector-repository';
import { OpenAIEmbeddingsService } from '@/lib/infrastructure/embeddings/openai-service';

// Validation Schema
const searchSchema = z.object({
  query: z.string().min(1).max(500),
  userId: z.string().min(1),
  filters: z
    .object({
      destination: z.string().optional(),
      budgetCategory: z.enum(['economy', 'standard', 'premium']).optional(),
    })
    .optional(),
  limit: z.number().int().min(1).max(20).optional().default(5),
});

/**
 * POST /api/trips/search
 *
 * Search trips using semantic similarity
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Parse and validate request
    const body = await request.json();
    const validatedData = searchSchema.parse(body);

    console.log(`🔍 Search request: "${validatedData.query}" for user ${validatedData.userId}`);

    // 2. Initialize services (Dependency Injection)
    const vectorRepository = new QdrantVectorRepository();
    const embeddingsService = new OpenAIEmbeddingsService();

    // 3. Execute use case
    const searchUseCase = new SearchTripsUseCase(vectorRepository, embeddingsService);

    const results = await searchUseCase.searchTrips({
      query: validatedData.query,
      userId: validatedData.userId,
      filters: validatedData.filters,
      limit: validatedData.limit,
    });

    // 4. Return results
    return NextResponse.json({
      success: true,
      query: validatedData.query,
      results,
      count: results.length,
    });
  } catch (error) {
    console.error('❌ Search API Error:', error);

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
        error: 'Search failed',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
