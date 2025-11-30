import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { createInitialState, TripFormInput } from '@/ai/workflow/trip-planner-state';
import { createSSEStream } from '@/ai/workflow/trip-planner-streaming';
import { convertCityToIATA, isValidIATACode } from '@/ai/utils/city-to-iata';

/**
 * POST /api/trips/create
 *
 * Creates a new trip planning workflow and streams progress via SSE
 *
 * Request body:
 * {
 *   numPeople: number;
 *   departureCity: string;  // IATA code
 *   arrivalCity: string;    // IATA code
 *   departureDate: string;  // ISO date
 *   stayDuration: number;   // Days
 *   userId: string;
 * }
 *
 * Response: SSE stream with events:
 * - workflow_start
 * - orchestrator_complete
 * - search_start (x3)
 * - search_complete (x3)
 * - auto_save_complete
 * - workflow_complete
 * - error (if any)
 */
export async function POST(request: NextRequest) {
    try {
        // Parse request body
        const body = await request.json();

        // Validate required fields
        const validationError = validateTripInput(body);
        if (validationError) {
            return NextResponse.json(
                { error: validationError },
                { status: 400 }
            );
        }

        // Convert cities to IATA codes if needed
        let departureCityCode = body.departureCity;
        let arrivalCityCode = body.arrivalCity;

        // Convert departure city if not already IATA
        if (!isValidIATACode(body.departureCity)) {
            console.log(`🌍 Converting departure city: ${body.departureCity}`);
            const departureResult = await convertCityToIATA(body.departureCity);
            departureCityCode = departureResult.iataCode;
        }

        // Convert arrival city if not already IATA
        if (!isValidIATACode(body.arrivalCity)) {
            console.log(`🌍 Converting arrival city: ${body.arrivalCity}`);
            const arrivalResult = await convertCityToIATA(body.arrivalCity);
            arrivalCityCode = arrivalResult.iataCode;
        }

        // Extract form input
        const formInput: TripFormInput = {
            numPeople: body.numPeople,
            departureCity: departureCityCode,
            arrivalCity: arrivalCityCode,
            departureDate: body.departureDate,
            stayDuration: body.stayDuration,
            budgetCategory: body.budgetCategory || 'standard',
            numRooms: body.numRooms || Math.ceil(body.numPeople / 2),
            userId: body.userId
        };

        // Generate unique thread ID
        const threadId = `trip-${uuidv4()}`;

        console.log('🚀 Creating trip planning workflow:', {
            threadId,
            formInput
        });

        // Create initial state
        const initialState = createInitialState(formInput, threadId);

        // Create SSE stream
        const stream = await createSSEStream(initialState);

        // Return streaming response with SSE headers
        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache, no-transform',
                'Connection': 'keep-alive',
                'X-Accel-Buffering': 'no', // Disable nginx buffering
            },
        });

    } catch (error) {
        console.error('❌ Error creating trip workflow:', error);

        // Return JSON error for non-streaming errors
        return NextResponse.json(
            {
                error: 'Failed to create trip workflow',
                details: error instanceof Error ? error.message : String(error)
            },
            { status: 500 }
        );
    }
}

/**
 * Validate trip input
 */
function validateTripInput(body: any): string | null {
    if (!body) {
        return 'Request body is required';
    }

    // Required fields
    if (typeof body.numPeople !== 'number' || body.numPeople < 1 || body.numPeople > 10) {
        return 'numPeople must be a number between 1 and 10';
    }

    if (!body.departureCity || typeof body.departureCity !== 'string') {
        return 'departureCity is required and must be a string';
    }

    if (!body.arrivalCity || typeof body.arrivalCity !== 'string') {
        return 'arrivalCity is required and must be a string';
    }

    if (!body.departureDate || typeof body.departureDate !== 'string') {
        return 'departureDate is required and must be a string';
    }

    if (typeof body.stayDuration !== 'number' || body.stayDuration < 1 || body.stayDuration > 30) {
        return 'stayDuration must be a number between 1 and 30';
    }

    if (!body.userId || typeof body.userId !== 'string') {
        return 'userId is required and must be a string';
    }

    // Validate budgetCategory if provided
    if (body.budgetCategory && !['economy', 'standard', 'premium'].includes(body.budgetCategory)) {
        return 'budgetCategory must be one of: economy, standard, premium';
    }

    // Validate numRooms if provided
    if (body.numRooms !== undefined && (typeof body.numRooms !== 'number' || body.numRooms < 1 || body.numRooms > 10)) {
        return 'numRooms must be a number between 1 and 10';
    }

    // Validate date format (basic check)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(body.departureDate)) {
        return 'departureDate must be in YYYY-MM-DD format';
    }

    // Validate date is in the future
    const departureDate = new Date(body.departureDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (departureDate < today) {
        return 'departureDate must be in the future';
    }

    return null;
}

/**
 * OPTIONS handler for CORS preflight
 */
export async function OPTIONS() {
    return new Response(null, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        },
    });
}
