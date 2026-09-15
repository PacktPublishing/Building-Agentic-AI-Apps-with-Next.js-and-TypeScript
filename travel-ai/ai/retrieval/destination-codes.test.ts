import { describe, expect, it } from 'vitest';
import { normalizeDestination } from './destination-codes';

describe('destination normalization', () => {
  it('maps country and city aliases to the payload code', () => {
    expect(normalizeDestination('Spain')).toEqual(['BCN', 'MAD', 'AGP', 'SVQ', 'PMI']);
    expect(normalizeDestination('Paris')).toEqual(['CDG', 'ORY']);
  });
  it('preserves explicit IATA codes', () => {
    expect(normalizeDestination('dub')).toBe('DUB');
  });
});
