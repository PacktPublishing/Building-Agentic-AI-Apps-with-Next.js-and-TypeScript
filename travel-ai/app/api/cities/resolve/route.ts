import { NextRequest, NextResponse } from 'next/server';
import { convertCityToIATA } from '@/ai/utils/city-to-iata';

/**
 * POST /api/cities/resolve
 *
 * Resolves a city name to its IATA airport code
 *
 * Request body:
 * {
 *   city: string;  // City name (e.g., "Paris", "New York")
 * }
 *
 * Response:
 * {
 *   iataCode: string;
 *   cityFullName: string;
 *   country: string;
 *   ambiguity: boolean;
 *   alternatives?: Array<{ code: string; name: string; country: string }>;
 * }
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Validation
        if (!body.city || typeof body.city !== 'string') {
            return NextResponse.json(
                { error: 'City name is required and must be a string' },
                { status: 400 }
            );
        }

        const cityInput = body.city.trim();

        if (cityInput.length === 0) {
            return NextResponse.json(
                { error: 'City name cannot be empty' },
                { status: 400 }
            );
        }

        if (cityInput.length > 100) {
            return NextResponse.json(
                { error: 'City name too long' },
                { status: 400 }
            );
        }

        console.log(`🌍 Resolving city: "${cityInput}"`);

        // Convert city to IATA
        const result = await convertCityToIATA(cityInput);

        return NextResponse.json(result);

    } catch (error) {
        console.error('❌ Error resolving city:', error);

        return NextResponse.json(
            {
                error: 'Failed to resolve city to IATA code',
                details: error instanceof Error ? error.message : String(error)
            },
            { status: 500 }
        );
    }
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
