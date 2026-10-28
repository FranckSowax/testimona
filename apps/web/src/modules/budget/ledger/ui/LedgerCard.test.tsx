// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { createTranslator } from 'next-intl';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import messages from '../../../../../messages/fr.json';
import { LedgerCard } from './LedgerCard';

vi.mock('next-intl/server', () => ({
  getTranslations: async (namespace: string) =>
    createTranslator({ locale: 'fr', messages, namespace: namespace as 'ledger.card' }),
}));
vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

afterEach(cleanup);

const plain = (text: string | null) => (text ?? '').replace(/[\u00a0\u202f]/g, ' ');
const totals = { received: 250_000, pledgedOpen: 0, spent: 0 };

describe('LedgerCard', () => {
  it('shows received and budget amounts', async () => {
    const { container } = render(
      await LedgerCard({
        dossierId: 'abc',
        locale: 'fr',
        budget: { amount: 1_000_000, source: 'envisaged' },
        totals,
      }),
    );
    expect(plain(container.querySelector('p')?.textContent ?? '')).toBe(
      '250 000 FCFA reçus sur un budget envisagé de 1 000 000 FCFA.',
    );
  });

  it('shows a retained budget', async () => {
    const { container } = render(
      await LedgerCard({
        dossierId: 'abc',
        locale: 'fr',
        budget: { amount: 3_100_000, source: 'retained' },
        totals,
      }),
    );
    expect(plain(container.querySelector('p')?.textContent ?? '')).toBe(
      '250 000 FCFA reçus sur un budget retenu de 3 100 000 FCFA.',
    );
  });

  it('says no budget is chosen when budget is null', async () => {
    const { container } = render(
      await LedgerCard({ dossierId: 'abc', locale: 'fr', budget: null, totals }),
    );
    expect(plain(container.querySelector('p')?.textContent ?? '')).toBe(
      "250 000 FCFA reçus. Aucun budget n'est encore choisi.",
    );
  });

  it('shows a neutral text, not 0 FCFA, when totals are unreadable', async () => {
    const { container } = render(
      await LedgerCard({
        dossierId: 'abc',
        locale: 'fr',
        budget: { amount: 5_000, source: 'retained' },
        totals: null,
      }),
    );
    const text = plain(container.querySelector('p')?.textContent ?? '');
    expect(text).toBe(messages.ledger.card.unavailable);
    expect(text).not.toContain('FCFA');
  });

  it('links to the contributions page', async () => {
    const { container } = render(
      await LedgerCard({ dossierId: 'abc', locale: 'fr', budget: null, totals: null }),
    );
    expect(container.querySelector('a')?.getAttribute('href')).toBe('/dossier/abc/cotisations');
  });
});
