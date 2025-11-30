/**
 * Qdrant Initialization Endpoint
 *
 * GET /api/qdrant/init
 *
 * Initializes Qdrant collections
 * Call this once on first deployment or manually to ensure collections exist
 */

import { NextResponse } from 'next/server';
import { initializeCollections } from '@/lib/infrastructure/qdrant/collections';

export async function GET() {
  try {
    console.log('🔧 Initializing Qdrant collections...');

    await initializeCollections();

    return NextResponse.json({
      success: true,
      message: 'Qdrant collections initialized successfully',
    });
  } catch (error) {
    console.error('❌ Failed to initialize Qdrant:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to initialize Qdrant collections',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
