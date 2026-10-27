import { describe, expect, it } from 'vitest';
import { formatXaf } from './format';

describe('formatXaf', () => {
  it('affiche un montant entier en francs CFA, selon la langue', () => {
    for (const locale of ['fr', 'en']) {
      const text = formatXaf(2_409_000, locale);
      expect(text.replace(/\D/g, '')).toBe('2409000');
      expect(text).toMatch(/FCFA|XAF/);
    }
  });
});
