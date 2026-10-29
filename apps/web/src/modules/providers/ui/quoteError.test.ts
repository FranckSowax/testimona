import { createTranslator } from 'next-intl';
import { describe, expect, it } from 'vitest';
import en from '../../../../messages/en.json';
import fr from '../../../../messages/fr.json';
import type { QuoteError } from '../quote-service';
import { quoteErrorText } from './quoteError';

// WHY: Record typé : ajouter une erreur au service sans la tester fait échouer la compilation.
const ERRORS: Record<QuoteError, true> = {
  validation: true,
  forbidden: true,
  unreachable: true,
  unauthenticated: true,
  unknown: true,
};
const CODES = Object.keys(ERRORS) as QuoteError[];
const expected = (messages: typeof fr, error: QuoteError) =>
  error === 'unreachable' ? messages.providers.quote.errors.unreachable : messages.dossier.errors[error];

const tFr = createTranslator({ locale: 'fr', messages: fr });
const tEn = createTranslator({ locale: 'en', messages: en });

describe('quoteErrorText', () => {
  it.each(CODES)('traduit %s en français', (error) => {
    const text = quoteErrorText(error, (k) => tFr(k as never));
    expect(text).toBe(expected(fr, error));
    expect(text).not.toBe('');
  });

  it.each(CODES)('traduit %s en anglais', (error) => {
    const text = quoteErrorText(error, (k) => tEn(k as never));
    expect(text).toBe(expected(en, error));
    expect(text).not.toBe('');
  });
});
