import { createTranslator } from 'next-intl';
import { describe, expect, it } from 'vitest';
import en from '../../../../messages/en.json';
import fr from '../../../../messages/fr.json';
import { quoteErrorText } from './quoteError';

const tFr = createTranslator({ locale: 'fr', messages: fr });
const tEn = createTranslator({ locale: 'en', messages: en });

describe('quoteErrorText', () => {
  it('traduit unreachable avec providers.quote.errors', () => {
    expect(quoteErrorText('unreachable', (k) => tFr(k as never))).toBe(
      fr.providers.quote.errors.unreachable,
    );
    expect(quoteErrorText('unreachable', (k) => tEn(k as never))).toBe(
      en.providers.quote.errors.unreachable,
    );
  });

  it.each(['validation', 'forbidden', 'unauthenticated', 'unknown'] as const)(
    'traduit %s avec dossier.errors',
    (error) => {
      expect(quoteErrorText(error, (k) => tFr(k as never))).toBe(fr.dossier.errors[error]);
    },
  );
});
