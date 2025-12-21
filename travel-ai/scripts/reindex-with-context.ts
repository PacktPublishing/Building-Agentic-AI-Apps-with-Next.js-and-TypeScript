/**
 * Reindex with Contextual Retrieval
 *
 * Script to reindex all trips with contextual prefixes.
 * This improves retrieval by adding LLM-generated context to each chunk.
 *
 * Usage: pnpm tsx scripts/reindex-with-context.ts [--dry-run] [--limit=N]
 */

import { config } from '../config';
import { getQdrantClient, QDRANT_COLLECTIONS } from '../lib/infrastructure/qdrant/client';
import { OpenAIEmbeddingsService } from '../lib/infrastructure/embeddings/openai-service';
import { ContextualChunker, type TripContext } from '../lib/infrastructure/chunking/contextual-chunker';
import type { TripVectorPayload } from '../lib/domain/vector/repository';

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const limitArg = args.find((arg) => arg.startsWith('--limit='));
const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : undefined;

async function main() {
  console.log('🔄 Reindex with Contextual Retrieval');
  console.log('=====================================');

  if (dryRun) {
    console.log('🏃 DRY RUN MODE - No changes will be made\n');
  }

  // Initialize services
  const client = getQdrantClient();
  const embeddingsService = new OpenAIEmbeddingsService();
  const contextualChunker = new ContextualChunker({
    rateLimitDelay: 200, // Slower to avoid rate limits
  });

  try {
    // Fetch all points from Qdrant
    console.log('📥 Fetching existing trips from Qdrant...');

    const scrollResult = await client.scroll(QDRANT_COLLECTIONS.USER_TRIPS, {
      limit: limit || 1000,
      with_payload: true,
      with_vector: true,
    });

    const points = scrollResult.points;
    console.log(`📊 Found ${points.length} trips to process\n`);

    let processed = 0;
    let errors = 0;

    for (const point of points) {
      const payload = point.payload as TripVectorPayload;
      const tripId = point.id as string;

      console.log(`\n[${processed + 1}/${points.length}] Processing: ${payload.title}`);

      try {
        // Build trip context
        const tripContext: TripContext = {
          tripId: payload.trip_id,
          title: payload.title,
          destination: payload.destination,
          departureCity: payload.departure_city,
          departureDate: payload.departure_date,
          stayDuration: payload.stay_duration,
          numPeople: payload.num_people,
          budgetCategory: payload.budget_category,
          totalBudget: payload.total_budget,
        };

        // Generate contextual text
        const contextualChunk = await contextualChunker.addContext(
          payload.summary_text,
          tripContext,
          tripId
        );

        console.log(`  📝 Context: "${contextualChunk.contextPrefix.substring(0, 60)}..."`);
        console.log(`  📄 Original length: ${payload.summary_text.length}`);
        console.log(`  📄 Contextual length: ${contextualChunk.contextualText.length}`);

        if (!dryRun) {
          // Generate new embedding from contextual text
          const newEmbedding = await embeddingsService.generate(
            contextualChunk.contextualText
          );

          // Update payload with contextual text
          const updatedPayload: TripVectorPayload = {
            ...payload,
            summary_text: contextualChunk.contextualText,
          };

          // Upsert to Qdrant
          await client.upsert(QDRANT_COLLECTIONS.USER_TRIPS, {
            points: [
              {
                id: tripId,
                vector: newEmbedding,
                payload: updatedPayload,
              },
            ],
          });

          console.log(`  ✅ Updated in Qdrant`);
        } else {
          console.log(`  ⏭️ Skipped (dry run)`);
        }

        processed++;

        // Rate limiting
        await new Promise((resolve) => setTimeout(resolve, 300));
      } catch (error) {
        console.error(`  ❌ Error: ${error}`);
        errors++;
      }
    }

    console.log('\n=====================================');
    console.log('📊 Summary:');
    console.log(`  Processed: ${processed}`);
    console.log(`  Errors: ${errors}`);
    console.log(`  Mode: ${dryRun ? 'Dry Run' : 'Live'}`);

    if (dryRun) {
      console.log('\n💡 Run without --dry-run to apply changes');
    }
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

main();
