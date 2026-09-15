/**
 * HyDE (Hypothetical Document Embeddings) Generator
 *
 * Generates a hypothetical document that would answer the query,
 * then uses that document's embedding for search instead of the query.
 *
 * This bridges the gap between query language and document language.
 */

import { ChatAnthropic } from '@langchain/anthropic';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { config } from '@/config';
import type { IEmbeddingsService } from '@/lib/domain/embeddings/service';

/**
 * HyDE generation result
 */
export interface HyDEResult {
  /** Original query */
  originalQuery: string;
  /** Generated hypothetical document */
  hypotheticalDocument: string;
  /** Embedding of the hypothetical document */
  embedding: number[];
}

const HYDE_SYSTEM_PROMPT = `You are a travel content writer. Given a travel search query,
write a detailed trip description that would perfectly match what the user is looking for.

Write as if you're describing an actual trip in a travel database. Include:
- Destination details
- Duration and timing
- Type of activities
- Accommodation style
- Budget range (if implied)
- Who the trip is suitable for

Keep it to 2-3 paragraphs, natural and descriptive.
Write in English, as if it's a trip summary in a database.`;

/**
 * HyDE Generator Configuration
 */
interface HyDEGeneratorConfig {
  /** Model to use for generation */
  model?: string;
  /** Temperature for generation (higher = more creative) */
  temperature?: number;
}

/**
 * HyDE Generator
 *
 * Implements Hypothetical Document Embeddings for improved retrieval.
 * Instead of embedding the query directly, we:
 * 1. Generate a hypothetical document that answers the query
 * 2. Embed that document
 * 3. Search using the document's embedding
 *
 * This works because documents in the database are more similar to
 * other documents than they are to short queries.
 */
export class HyDEGenerator {
  private llm: ChatAnthropic;
  private embeddingsService: IEmbeddingsService;

  constructor(
    embeddingsService: IEmbeddingsService,
    hydeConfig: HyDEGeneratorConfig = {}
  ) {
    this.llm = new ChatAnthropic({
      modelName: hydeConfig.model || config.model_name,
      temperature: hydeConfig.temperature ?? 0.7,
      anthropicApiKey: config.anthropic_api_key,
    });
    this.embeddingsService = embeddingsService;
  }

  /**
   * Generate a hypothetical document and its embedding
   */
  async generate(query: string): Promise<HyDEResult> {
    console.log(`🔮 HyDE: Generating hypothetical document for "${query}"`);

    try {
      // Step 1: Generate hypothetical document
      const response = await this.llm.invoke([
        new SystemMessage(HYDE_SYSTEM_PROMPT),
        new HumanMessage(
          `Write a trip description that would perfectly match this search:\n\n"${query}"`
        ),
      ]);

      const hypotheticalDocument =
        typeof response.content === 'string'
          ? response.content.trim()
          : '';

      console.log(`📄 HyDE: Generated ${hypotheticalDocument.length} char document`);

      // Step 2: Generate embedding from hypothetical document
      const embedding = await this.embeddingsService.generate(hypotheticalDocument);

      return {
        originalQuery: query,
        hypotheticalDocument,
        embedding,
      };
    } catch (error) {
      console.error('❌ HyDE: Generation failed', error);
      // Fallback to regular query embedding
      const embedding = await this.embeddingsService.generate(query);
      return {
        originalQuery: query,
        hypotheticalDocument: query,
        embedding,
      };
    }
  }

  /**
   * Generate just the hypothetical document (without embedding)
   */
  async generateDocument(query: string): Promise<string> {
    try {
      const response = await this.llm.invoke([
        new SystemMessage(HYDE_SYSTEM_PROMPT),
        new HumanMessage(
          `Write a trip description that would perfectly match this search:\n\n"${query}"`
        ),
      ]);

      return typeof response.content === 'string' ? response.content.trim() : query;
    } catch (error) {
      console.error('❌ HyDE: Document generation failed', error);
      return query;
    }
  }
}
