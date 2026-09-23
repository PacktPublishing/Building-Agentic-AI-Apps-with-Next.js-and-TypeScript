import { describe, expect, it } from 'vitest';
import { availablePrice, FlightOffer, HotelOffer, normalizeToolResult } from './tool-result';

const success = { success: true, data: [], meta: { totalAvailable: 0 } };
describe('MCP tool result normalization', () => {
  it('accepts JSON text, text blocks, and a real empty success with zero count', () => {
    expect(normalizeToolResult({ content: JSON.stringify(success) })).toEqual({ kind: 'success', data: [], meta: { totalAvailable: 0 } });
    expect(normalizeToolResult({ content: [{ type: 'text', text: JSON.stringify(success) }] }).kind).toBe('success');
  });
  it.each([
    { content: '{bad' }, { content: JSON.stringify({ success: false, error: 'private' }) },
    { content: JSON.stringify(success), status: 'error' }, { content: JSON.stringify({ success: true }) },
    { content: JSON.stringify({ success: true, data: [null] }) },
  ])('rejects provider failures and invalid records', (message) => {
    expect(normalizeToolResult(message)).toEqual({ kind: 'error' });
  });
  it('does not invent prices, currencies, itineraries, or hotel details', () => {
    expect(availablePrice(undefined)).toBeUndefined();
    expect(availablePrice({ total: '100' })).toBeUndefined();
    expect(FlightOffer.safeParse({ id: 'f1', itineraries: [] }).success).toBe(false);
    expect(HotelOffer.safeParse({ hotel: {} }).success).toBe(false);
  });
});
