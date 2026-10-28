import { createTranslator } from 'next-intl';
import { describe, expect, it } from 'vitest';
import fr from '../../../../../messages/fr.json';
import { isManualFallback, receiptErrorText } from './receiptError';

const tFr = createTranslator({ locale: 'fr', messages: fr });
const t = (key: string) => tFr(key as never);

describe('receiptErrorText', () => {
  it.each(['receipt_type', 'receipt_size', 'too_many_receipts', 'upload_failed'] as const)(
    'uses receipts.errors for %s',
    (error) => {
      expect(receiptErrorText(error, t)).toBe(fr.receipts.errors[error]);
      expect(isManualFallback(error)).toBe(false);
    },
  );

  it.each(['unavailable', 'quota', 'failed', 'too_large_to_read'] as const)(
    'uses receipts.manual for %s',
    (error) => {
      expect(receiptErrorText(error, t)).toBe(fr.receipts.manual[error]);
      expect(isManualFallback(error)).toBe(true);
    },
  );

  it.each(['validation', 'forbidden', 'not_found', 'unauthenticated', 'unknown'] as const)(
    'uses dossier.errors for %s',
    (error) => {
      expect(receiptErrorText(error, t)).toBe(fr.dossier.errors[error]);
      expect(isManualFallback(error)).toBe(false);
    },
  );
});
