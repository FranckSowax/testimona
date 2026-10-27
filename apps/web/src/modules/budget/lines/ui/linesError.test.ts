import { createTranslator } from 'next-intl';
import { describe, expect, it } from 'vitest';
import en from '../../../../../messages/en.json';
import fr from '../../../../../messages/fr.json';
import { linesErrorText } from './linesError';

const tFr = createTranslator({ locale: 'fr', messages: fr });
const tEn = createTranslator({ locale: 'en', messages: en });
const t = (key: string) => tFr(key as never);

describe('linesErrorText', () => {
  it.each(['line_in_use', 'no_attendance', 'too_many_lines'] as const)(
    'uses lines.errors for %s',
    (error) => {
      expect(linesErrorText(error, t)).toBe(fr.lines.errors[error]);
      expect(linesErrorText(error, (key) => tEn(key as never))).toBe(en.lines.errors[error]);
    },
  );

  it.each(['validation', 'forbidden', 'not_found', 'unauthenticated', 'unknown'] as const)(
    'uses dossier.errors for %s',
    (error) => {
      expect(linesErrorText(error, t)).toBe(fr.dossier.errors[error]);
    },
  );
});
