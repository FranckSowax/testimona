import { describe, expect, it } from 'vitest';
import { specificMessage } from './specific-error';

describe('specificMessage', () => {
  it('reconnaît une taille excessive', () => {
    expect(specificMessage({ '': 'too large' })).toBe('ui.tooLarge');
    expect(specificMessage({ '': 'too long' })).toBe('ui.tooLarge');
  });

  it('reconnaît un caractère invalide', () => {
    expect(specificMessage({ '': 'invalid character' })).toBe('ui.invalidCharacter');
  });

  it('reconnaît un texte vide', () => {
    expect(specificMessage({ '': 'empty' })).toBe('draft.empty');
  });

  it('renvoie null sans cause reconnue ou sans erreur de champ', () => {
    expect(specificMessage({})).toBeNull();
    expect(specificMessage(undefined)).toBeNull();
    expect(specificMessage({ '': 'Required' })).toBeNull();
  });
});
