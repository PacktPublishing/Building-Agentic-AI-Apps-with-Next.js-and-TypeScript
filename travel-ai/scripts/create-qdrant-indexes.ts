/**
 * Create Qdrant Payload Indexes
 *
 * Creates indexes on payload fields to enable filtering.
 * Required for Self-Query filter extraction to work.
 *
 * Usage: pnpm tsx scripts/create-qdrant-indexes.ts
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { getQdrantClient, QDRANT_COLLECTIONS } from '../lib/infrastructure/qdrant/client';

async function main() {
  console.log('🔧 Creating Qdrant Payload Indexes');
  console.log('═'.repeat(50));

  const client = getQdrantClient();
  const collection = QDRANT_COLLECTIONS.USER_TRIPS;

  const indexes = [
    { field: 'destination', type: 'keyword' as const },
    { field: 'budget_category', type: 'keyword' as const },
    { field: 'user_id', type: 'keyword' as const },
    { field: 'departure_city', type: 'keyword' as const },
    { field: 'status', type: 'keyword' as const },
    { field: 'total_budget', type: 'float' as const },
    { field: 'stay_duration', type: 'integer' as const },
    { field: 'num_people', type: 'integer' as const },
  ];

  for (const index of indexes) {
    console.log(`\nCreating index: ${index.field} (${index.type})`);
    try {
      await client.createPayloadIndex(collection, {
        field_name: index.field,
        field_schema: index.type,
      });
      console.log(`  ✅ Created`);
    } catch (error: any) {
      if (error.message?.includes('already exists')) {
        console.log(`  ⏭️ Already exists`);
      } else {
        console.log(`  ❌ Error: ${error.message}`);
      }
    }
  }

  console.log('\n' + '═'.repeat(50));
  console.log('✅ Index creation complete!');
}

main().catch(console.error);
