import { SearchTripsUseCase } from '@/lib/application/use-cases/search-trips.use-case';
import { QdrantVectorRepository } from '@/lib/infrastructure/qdrant/vector-repository';
import { OpenAIEmbeddingsService } from '@/lib/infrastructure/embeddings/openai-service';

let instance: SearchTripsUseCase | null = null;

/** Application composition root for retrieval dependencies. */
export function getSearchTripsUseCase(): SearchTripsUseCase {
  if (!instance) instance = new SearchTripsUseCase(new QdrantVectorRepository(), new OpenAIEmbeddingsService());
  return instance;
}
