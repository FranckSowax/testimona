// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { createTranslator } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import messages from '../../../../../messages/fr.json';
import type { EntryView } from '../model';
import { EntryList } from './EntryList';

vi.mock('next-intl/server', () => ({
  getTranslations: async (namespace: string) =>
    createTranslator({ locale: 'fr', messages, namespace: namespace as 'ledger' }),
}));
vi.mock('../actions', () => ({ reverseEntryAction: vi.fn() }));

const DOSSIER = '11111111-1111-4111-8111-111111111111';

const pledge: EntryView = {
  id: '33333333-3333-4333-8333-333333333333',
  kind: 'pledge',
  amount: 50_000,
  method: null,
  partyName: 'Awa Diallo',
  memberId: null,
  pledgeId: null,
  note: '',
  occurredOn: '2026-10-20',
  reversesId: null,
  reversesKind: null,
  createdAt: '2026-10-20T10:00:00Z',
  reversed: false,
  paid: 20_000,
  fulfilled: false,
};

afterEach(cleanup);

/** Espaces insécables (format fr-FR) ramenés à des espaces simples. */
const plain = (text: string | null) => (text ?? '').replace(/[  ]/g, ' ');

describe('EntryList', () => {
  it('shows what was already paid on a partly paid pledge', async () => {
    render(
      await EntryList({ dossierId: DOSSIER, locale: 'fr', views: [pledge], canManage: false }),
    );
    expect(plain(document.body.textContent)).toContain('Déjà versé : 20 000 FCFA');
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('labels a fulfilled pledge without the partly-paid mention', async () => {
    const done = { ...pledge, paid: 50_000, fulfilled: true };
    render(await EntryList({ dossierId: DOSSIER, locale: 'fr', views: [done], canManage: false }));
    const text = plain(document.body.textContent);
    expect(text).toContain('versée');
    expect(text).not.toContain('Déjà versé');
  });

  it('says so when there is no entry', async () => {
    render(await EntryList({ dossierId: DOSSIER, locale: 'fr', views: [], canManage: true }));
    expect(screen.getByText("Aucune ligne pour l'instant.")).toBeTruthy();
  });
});
