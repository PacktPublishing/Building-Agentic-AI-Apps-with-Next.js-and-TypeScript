import { describe, expect, it, vi } from 'vitest';
import { ToolMessage } from '@langchain/core/messages';

vi.mock('@langchain/anthropic', () => ({ ChatAnthropic: class { invoke() {} } }));
import { TravelAssistantAgent } from './agent';

async function events(name: string, payload: unknown, status?: 'error') {
  const agent = TravelAssistantAgent.getInstance() as any;
  const message = new ToolMessage({ name, content: typeof payload === 'string' ? payload : JSON.stringify(payload), tool_call_id: 'call-1', status });
  const result = [];
  for await (const event of agent.processToolMessage(message)) result.push(event);
  return result;
}

describe('travel UI mapping from tool results', () => {
  it('shows an error for tool failure and malformed nested data without raw diagnostics', async () => {
    const failed = await events('search_flights', { success: false, error: 'provider private details' });
    expect(failed[0].type).toBe('error');
    expect(JSON.stringify(failed)).not.toContain('provider private details');
    expect((await events('search_flights', { success: true, data: [{ id: 'f1' }] }))[0].type).toBe('error');
    expect((await events('search_hotels', { success: true, data: [] }))[0].type).toBe('tool_result');
  });
  it('keeps unavailable price, rating, amenities, image and location unavailable', async () => {
    const hotel = await events('search_hotels', { success: true, data: [{ id: 'h1', hotel: { name: 'Actual Hotel' } }] });
    const card = hotel[0].data.props.hotels[0];
    expect(card.price).toBeUndefined();
    expect(card.rating).toBeUndefined();
    expect(card.amenities).toBeUndefined();
    expect(card.images).toBeUndefined();
    expect(card.location).toBeUndefined();
    const flight = await events('search_flights', { success: true, data: [{ id: 'f1', itineraries: [{ segments: [{ departure: { iataCode: 'CDG', at: '2026-10-01T08:00:00' }, arrival: { iataCode: 'LHR', at: '2026-10-01T09:00:00' } }] }] }] });
    expect(flight[0].data.props.flights[0].price).toBeUndefined();
    expect(flight[0].data.props.flights[0].inbound).toBeUndefined();
  });

  it('does not display a blank provider price as a free offer', async () => {
    const hotel = await events('search_hotels', { success: true, data: [{ id: 'h1', hotel: { name: 'Actual Hotel' }, offers: [{ price: { total: ' ', currency: 'EUR' } }] }] });
    expect(hotel[0].data.props.hotels[0].price).toBeUndefined();

    const flight = await events('search_flights', { success: true, data: [{ id: 'f1', price: { total: '', currency: 'EUR' }, itineraries: [{ segments: [{ departure: { iataCode: 'CDG', at: '2026-10-01T08:00:00' }, arrival: { iataCode: 'LHR', at: '2026-10-01T09:00:00' } }] }] }] });
    expect(flight[0].data.props.flights[0].price).toBeUndefined();

    const activities = await events('search_tours_activities', { success: true, data: [{ id: 'a1', name: 'Walk', price: { amount: '', currencyCode: 'EUR' } }] });
    expect(activities[0].data.props.activities[0].price).toBeUndefined();

    const explicitZero = await events('search_tours_activities', { success: true, data: [{ id: 'a2', name: 'Free tour', price: { amount: '0', currencyCode: 'EUR' } }] });
    expect(explicitZero[0].data.props.activities[0].price).toEqual({ amount: '0', currencyCode: 'EUR' });
  });
});
