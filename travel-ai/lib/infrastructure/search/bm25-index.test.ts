import { describe, expect, it } from 'vitest';
import { BM25Index } from './bm25-index';
import type { TripVectorPayload } from '@/lib/domain/vector/repository';

const payload = (id: string): TripVectorPayload => ({
  trip_id: id, user_id: 'u', title: id, destination: 'CDG', departure_city: 'Paris',
  departure_date: '2026-01-01', stay_duration: 3, num_people: 1,
  budget_category: 'standard', total_budget: 1000, summary_text: `trip ${id} beach travel`,
  num_flights: 1, num_hotels: 1, num_activities: 1, status: 'confirmed', created_at: '', thread_id: '',
});

describe('BM25 corpus coverage', () => {
  it('indexes and searches a corpus larger than the old 1000-result cap', () => {
    const index = new BM25Index();
    for (let i = 0; i < 1501; i++) index.add(`trip-${i}`, `beach travel trip-${i}`, payload(`trip-${i}`));
    expect(index.size()).toBe(1501);
    expect(index.search('trip-1500', 5).some((result) => result.id === 'trip-1500')).toBe(true);
  });
});
