// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { createTranslator, NextIntlClientProvider } from 'next-intl';
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
const receipt: EntryView = {
  ...pledge,
  id: '44444444-4444-4444-8444-444444444444',
  kind: 'receipt',
  amount: 20_000,
  method: 'airtel_money',
  paid: 0,
};
const reversal: EntryView = {
  ...receipt,
  id: '55555555-5555-4555-8555-555555555555',
  kind: 'reversal',
  method: null,
  reversesId: receipt.id,
  reversesKind: 'receipt',
};

afterEach(cleanup);

/** Espaces insécables (format fr-FR) ramenés à des espaces simples. */
const plain = (text: string | null) => (text ?? '').replace(/[  ]/g, ' ');

async function renderList(views: EntryView[], canManage = false) {
  render(
    <NextIntlClientProvider locale="fr" messages={messages}>
      {await EntryList({ dossierId: DOSSIER, locale: 'fr', views, canManage })}
    </NextIntlClientProvider>,
  );
  return screen.getAllByRole('listitem').map((li) => plain(li.textContent));
}

describe('EntryList', () => {
  it('shows what was already paid on a partly paid pledge, without a sign', async () => {
    const [line] = await renderList([pledge]);
    expect(line).toContain('Déjà versé : 20 000 FCFA');
    expect(line).toContain('Awa Diallo · Promesse');
    expect(line).not.toMatch(/[+−]50 000/);
  });

  it('labels a fulfilled pledge without the partly-paid mention', async () => {
    const [line] = await renderList([{ ...pledge, paid: 50_000, fulfilled: true }]);
    expect(line).toContain('versée');
    expect(line).not.toContain('Déjà versé');
  });

  it('shows a reversal of a receipt with its kind and a minus sign, and the reversed line', async () => {
    const [rev, rec] = await renderList([reversal, { ...receipt, reversed: true }]);
    expect(rev).toContain('Annulation — Cotisation reçue');
    expect(rev).toContain('−20 000 FCFA');
    expect(rec).toContain('+20 000 FCFA');
    expect(rec).toContain('Airtel Money');
    expect(rec).toContain('annulée');
  });

  it('offers reversal only to managers, and only on reversible lines', async () => {
    await renderList([reversal, { ...receipt, reversed: true }, pledge], true);
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(1);
    expect(plain(buttons[0]?.getAttribute('aria-label') ?? '')).toBe(
      'Annuler cette ligne : Awa Diallo · Promesse · 50 000 FCFA',
    );
    cleanup();
    await renderList([pledge], false);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('says so when there is no entry', async () => {
    render(await EntryList({ dossierId: DOSSIER, locale: 'fr', views: [], canManage: true }));
    expect(screen.getByText("Aucune ligne pour l'instant.")).toBeTruthy();
  });
});
