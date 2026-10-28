// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { createTranslator } from 'next-intl';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import messages from '../../../../../messages/fr.json';
import { entryViews, type LedgerEntry } from '../../ledger/model';
import { ClosedNotice } from './ClosedNotice';
import { ReceivedList } from './ReceivedList';
import { SpentTable } from './SpentTable';

vi.mock('next-intl/server', () => ({
  getTranslations: async (namespace: string) =>
    createTranslator({ locale: 'fr', messages, namespace: namespace as 'closing.spent' }),
}));
vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

afterEach(cleanup);

const plain = (text: string | null) => (text ?? '').replace(/[  ]/g, ' ');
const line = (id: string, label: string, spent: number) => ({
  id,
  gridKey: null,
  label,
  amounts: { sober: 0, intermediate: 0, full: 0 },
  edited: true,
  position: 0,
  spent,
});

const entry = (over: Partial<LedgerEntry>): LedgerEntry => ({
  id: 'r1',
  kind: 'receipt',
  amount: 10_000,
  method: 'cash',
  partyName: 'Tante Marie',
  memberId: null,
  pledgeId: null,
  budgetLineId: null,
  note: '',
  occurredOn: '2026-10-20',
  reversesId: null,
  reversesKind: null,
  createdAt: '2026-10-20T10:00:00Z',
  ...over,
});

describe('SpentTable', () => {
  it('liste les postes qui ont des dépenses, « Sans poste » et le total', async () => {
    render(
      await SpentTable({
        locale: 'fr',
        labelledBy: 'spent-title',
        lines: [line('l1', 'Cercueil', 300_000), line('l2', 'Fleurs', 0)],
        unassignedSpent: 20_000,
      }),
    );
    expect(screen.getAllByRole('row').map((r) => plain(r.textContent))).toEqual([
      'PosteDépensé',
      'Cercueil300 000 FCFA',
      'Dépenses sans poste20 000 FCFA',
      'Total320 000 FCFA',
    ]);
  });

  it('dit qu’il n’y a aucune dépense', async () => {
    render(await SpentTable({ locale: 'fr', labelledBy: 'x', lines: [], unassignedSpent: 0 }));
    expect(screen.getByText(messages.closing.spent.empty)).toBeTruthy();
  });
});

describe('ReceivedList', () => {
  it('montre le nom, le montant et la date de chaque cotisation', async () => {
    render(await ReceivedList({ locale: 'fr', views: entryViews([entry({})]) }));
    expect(plain(screen.getByRole('listitem').textContent)).toBe(
      'Tante Marie10 000 FCFA · 20 oct. 2026',
    );
  });

  it('dit qu’il n’y a rien à afficher', async () => {
    render(await ReceivedList({ locale: 'fr', views: [] }));
    expect(screen.getByText(messages.closing.page.receivedEmpty)).toBeTruthy();
  });
});

describe('ClosedNotice', () => {
  it('donne la date et, au besoin, le lien vers le bilan', async () => {
    render(
      await ClosedNotice({ dossierId: 'abc', closedOn: '28 octobre 2026', showSummaryLink: true }),
    );
    expect(screen.getByText(/clôturées depuis le 28 octobre 2026/)).toBeTruthy();
    expect(
      screen.getByRole('link', { name: messages.closing.notice.seeSummary }).getAttribute('href'),
    ).toBe('/dossier/abc/cotisations/bilan');
    cleanup();
    render(
      await ClosedNotice({ dossierId: 'abc', closedOn: '28 octobre 2026', showSummaryLink: false }),
    );
    expect(screen.queryByRole('link')).toBeNull();
  });
});
