import { describe, expect, it } from 'vitest';
import { fuseWithRRF } from './rrf';

const payload = (id: string) => ({ id, trip_id: id, user_id: 'u', title: id, destination: 'CDG', departure_city: 'Paris', departure_date: '', stay_duration: 2, num_people: 1, budget_category: 'standard' as const, total_budget: 100, summary_text: id, num_flights: 0, num_hotels: 0, num_activities: 0, status: 'confirmed', created_at: '', thread_id: '' });

describe('weighted RRF', () => {
  it('changes ranking pressure when alpha changes', () => {
    const semantic = [{ id: 'semantic-only', rank: 1, score: 1, payload: payload('s'), source: 'semantic' as const }];
    const lexical = [{ id: 'lexical-only', rank: 1, score: 1, payload: payload('l'), source: 'lexical' as const }];
    const semanticHeavy = fuseWithRRF([semantic, lexical], { alpha: 0.9 });
    const lexicalHeavy = fuseWithRRF([semantic, lexical], { alpha: 0.1 });
    expect(semanticHeavy[0].id).toBe('semantic-only');
    expect(lexicalHeavy[0].id).toBe('lexical-only');
  });
});
