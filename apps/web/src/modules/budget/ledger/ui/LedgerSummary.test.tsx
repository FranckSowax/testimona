// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { createTranslator } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import messages from '../../../../../messages/fr.json';
import { LedgerSummary } from './LedgerSummary';

vi.mock('next-intl/server', () => ({
  getTranslations: async (namespace: string) =>
    createTranslator({ locale: 'fr', messages, namespace: namespace as 'ledger' }),
}));

afterEach(cleanup);

/** Paires libellé → valeur de la synthèse, espaces insécables normalisés. */
function figures(container: HTMLElement): Record<string, string> {
  const plain = (text: string | null) => (text ?? '').replace(/[  ]/g, ' ');
  return Object.fromEntries(
    [...container.querySelectorAll('dt')].map((dt) => [
      plain(dt.textContent),
      plain(dt.nextElementSibling?.textContent ?? ''),
    ]),
  );
}

describe('LedgerSummary', () => {
  it('shows dashes without a budget', async () => {
    const totals = { received: 10_000, pledgedOpen: 0, spent: 0 };
    const { container } = render(await LedgerSummary({ locale: 'fr', budget: null, totals }));
    const f = figures(container);
    expect(f['Budget non choisi']).toBe('—');
    expect(f['Reste à réunir']).toBe('—');
    expect(f['Reçu']).toBe('10 000 FCFA');
  });

  it('renders a negative balance when spending exceeds receipts', async () => {
    const totals = { received: 10_000, pledgedOpen: 5_000, spent: 25_000 };
    const { container } = render(
      await LedgerSummary({
        locale: 'fr',
        budget: { amount: 100_000, source: 'envisaged' },
        totals,
      }),
    );
    const f = figures(container);
    expect(f['Disponible']).toMatch(/^-15 000 FCFA$|^−15 000 FCFA$/);
    expect(f['Budget envisagé']).toBe('100 000 FCFA');
    expect(f['Reste à réunir']).toBe('90 000 FCFA');
  });

  it('labels a retained budget and computes the rest from it', async () => {
    const totals = { received: 40_000, pledgedOpen: 0, spent: 0 };
    const { container } = render(
      await LedgerSummary({
        locale: 'fr',
        budget: { amount: 300_000, source: 'retained' },
        totals,
      }),
    );
    const f = figures(container);
    expect(f['Budget retenu']).toBe('300 000 FCFA');
    expect(f['Budget envisagé']).toBeUndefined();
    expect(f['Reste à réunir']).toBe('260 000 FCFA');
  });
});
