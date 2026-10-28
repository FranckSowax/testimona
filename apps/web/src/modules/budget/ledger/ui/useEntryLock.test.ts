import { describe, expect, it } from 'vitest';
import { lockAfter } from './useEntryLock';

describe('lockAfter', () => {
  it('fige pour un nouvel essai quand le reçu n’a pas pu être joint', () => {
    expect(lockAfter('receipt_unlinked', null)).toBe('unlinked');
    expect(lockAfter('receipt_unlinked', 'final')).toBe('unlinked');
  });

  it.each(['receipt_unavailable', 'changed_since_saved'] as const)(
    'fige sans nouvel essai après %s',
    (error) => {
      expect(lockAfter(error, null)).toBe('final');
      expect(lockAfter(error, 'unlinked')).toBe('final');
    },
  );

  it('garde le verrou en place pour toute autre réponse', () => {
    expect(lockAfter('unknown', 'unlinked')).toBe('unlinked');
    expect(lockAfter('validation', null)).toBeNull();
    expect(lockAfter(undefined, 'final')).toBe('final');
  });
});
