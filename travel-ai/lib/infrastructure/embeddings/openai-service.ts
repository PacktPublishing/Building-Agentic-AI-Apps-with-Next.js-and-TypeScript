/**
 * Infrastructure Layer - OpenAI Embeddings Service
 *
 * Implements IEmbeddingsService using OpenAI API
 */

import OpenAI from 'openai';
import type { IEmbeddingsService } from '@/lib/domain/embeddings/service';

export class OpenAIEmbeddingsService implements IEmbeddingsService {
  private client: OpenAI;
  private model: string = 'text-embedding-3-small'; // 1536 dimensions

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }

    this.client = new OpenAI({ apiKey });
  }

  async generate(text: string): Promise<number[]> {
    try {
      const response = await this.client.embeddings.create({
        model: this.model,
        input: text,
        encoding_format: 'float',
      });

      const embedding = response.data[0].embedding;

      console.log(`✅ Generated embedding (${embedding.length} dimensions)`);

      return embedding;
    } catch (error) {
      console.error('❌ Failed to generate embedding:', error);
      throw new Error(`Failed to generate embedding: ${error}`);
    }
  }

  async generateBatch(texts: string[]): Promise<number[][]> {
    try {
      const response = await this.client.embeddings.create({
        model: this.model,
        input: texts,
        encoding_format: 'float',
      });

      const embeddings = response.data.map((item) => item.embedding);

      console.log(`✅ Generated ${embeddings.length} embeddings`);

      return embeddings;
    } catch (error) {
      console.error('❌ Failed to generate batch embeddings:', error);
      throw new Error(`Failed to generate batch embeddings: ${error}`);
    }
  }
}
