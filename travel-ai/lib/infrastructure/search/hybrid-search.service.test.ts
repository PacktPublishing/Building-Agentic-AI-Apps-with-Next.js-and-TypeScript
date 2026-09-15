import { describe, expect, it } from 'vitest';
import { HybridSearchService } from './hybrid-search.service';
import type { IVectorRepository, TripVectorPayload } from '@/lib/domain/vector/repository';

const trip = (id: string, budget: number, duration: number): TripVectorPayload => ({
  trip_id: id, user_id: 'u', title: id, destination: 'CDG', departure_city: 'Paris', departure_date: '',
  stay_duration: duration, num_people: 1, budget_category: 'standard', total_budget: budget,
  summary_text: `beach trip ${id}`, num_flights: 0, num_hotels: 0, num_activities: 0,
  status: 'confirmed', created_at: '', thread_id: '',
});

describe('hybrid filter contract', () => {
  it('applies budget and duration boundaries to lexical results', async () => {
    const vectorRepository: IVectorRepository = {
      upsert: async () => {}, getById: async () => null, delete: async () => {},
      search: async () => [],
    };
    const embeddings = { generate: async () => [1] } as any;
    const service = new HybridSearchService(vectorRepository, embeddings);
    service.addToIndex('cheap-short', 'beach trip cheap-short', trip('cheap-short', 500, 2));
    service.addToIndex('expensive-long', 'beach trip expensive-long', trip('expensive-long', 5000, 10));
    const results = await service.search('beach trip', { filters: { budget_max: 1000, max_duration: 3 }, limit: 5 });
    expect(results.map((result) => result.id)).toEqual(['cheap-short']);
  });
});
