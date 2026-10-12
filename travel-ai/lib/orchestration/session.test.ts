import { describe, expect, it } from 'vitest';
import { parseConversationBody, SessionError } from './session';

describe('conversation input limits', () => {
  it('accepts a bounded request and an opaque UUID', () => {
    expect(parseConversationBody({ message: '  Plan a trip  ', threadId: '2942cb20-0f89-47b2-af56-53e5b6b7f22e' })).toEqual({
      message: 'Plan a trip', threadId: '2942cb20-0f89-47b2-af56-53e5b6b7f22e', stream: false,
    });
  });
  it.each([
    { message: '' }, { message: 'x'.repeat(4001) }, { message: 'Trip', stream: 'yes' },
    { message: 'Trip', threadId: 'guessed-thread' }, { message: 'Trip', debug: true },
  ])('rejects invalid payloads', (input) => {
    expect(() => parseConversationBody(input)).toThrow(SessionError);
  });
});
