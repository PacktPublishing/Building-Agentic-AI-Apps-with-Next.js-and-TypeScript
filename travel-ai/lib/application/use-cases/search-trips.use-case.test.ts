import { describe, expect, it } from 'vitest';
import { SearchTripsUseCase } from './search-trips.use-case';
import type { IVectorRepository } from '@/lib/domain/vector/repository';

const payload = (userId: string, tripId = 't1') => ({ trip_id: tripId, user_id: userId, title: tripId, destination: 'CDG', departure_city: 'Paris', departure_date: '', stay_duration: 2, num_people: 1, budget_category: 'standard' as const, total_budget: 500, summary_text: 'trip', num_flights: 0, num_hotels: 0, num_activities: 0, status: 'confirmed', created_at: '', thread_id: '' });

describe('private retrieval authorization', () => {
  it('fails closed without an authenticated user', async () => {
    const repo = { search: async () => [], getById: async () => null } as any;
    const useCase = new SearchTripsUseCase(repo, { generate: async () => [1] } as any);
    await expect(useCase.searchTrips({ query: 'trip' })).rejects.toThrow('Authentication required');
  });

  it('does not use another user source trip for similarity', async () => {
    const repo: IVectorRepository = {
      upsert: async () => {}, delete: async () => {}, search: async () => [],
      getById: async () => ({ id: 't1', vector: [1], payload: payload('user-b') }),
    };
    const useCase = new SearchTripsUseCase(repo, { generate: async () => [1] });
    await expect(useCase.findSimilarTrips('t1', 'user-a')).rejects.toThrow('Trip not found');
  });
});
