import { describe, expect, it } from 'vitest';
import { assertReadOnlyTools } from './tool-safety';

describe('tool execution policy', () => {
  it('permits the audited search tools', () => {
    expect(() => assertReadOnlyTools([{ name: 'search_flights' }, { name: 'get_current_date' }])).not.toThrow();
  });
  it('fails closed for any future side-effecting or unknown tool', () => {
    expect(() => assertReadOnlyTools([{ name: 'book_flight' }])).toThrow('An unreviewed tool cannot run');
  });
});
