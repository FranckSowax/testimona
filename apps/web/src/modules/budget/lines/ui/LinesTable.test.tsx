// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import { createTranslator, NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import messages from '../../../../../messages/fr.json';
import type { LineView } from '../model';
import { LinesTable } from './LinesTable';

vi.mock('next-intl/server', () => ({
  getTranslations: async (namespace: string) =>
    createTranslator({ locale: 'fr', messages, namespace: namespace as 'lines' }),
}));
vi.mock('../actions', () => ({
  saveLineAction: vi.fn(),
  addLineAction: vi.fn(),
  deleteLineAction: vi.fn(),
}));

const DOSSIER = '11111111-1111-4111-8111-111111111111';
const coffin: LineView = {
  id: '22222222-2222-4222-8222-222222222222',
  gridKey: 'coffin',
  label: 'Cercueil',
  amounts: { sober: 100_000, intermediate: 200_000, full: 300_000 },
  edited: true,
  position: 0,
  spent: 50_000,
};
const flowers: LineView = {
  id: '33333333-3333-4333-8333-333333333333',
  gridKey: null,
  label: 'Fleurs',
  amounts: { sober: 10_000, intermediate: 20_000, full: 30_000 },
  edited: true,
  position: 1,
  spent: 0,
};

/** Espaces insécables (format fr-FR) ramenés à des espaces simples. */
const plain = (text: string | null) => (text ?? '').replace(/[  ]/g, ' ');

async function renderTable(
  opts: {
    scenario?: 'sober' | 'intermediate' | 'full' | null;
    unassigned?: number;
    canManage?: boolean;
  } = {},
) {
  const ui = await LinesTable({
    dossierId: DOSSIER,
    locale: 'fr',
    lines: [coffin, flowers],
    scenario: opts.scenario ?? null,
    unassignedSpent: opts.unassigned ?? 0,
    canManage: opts.canManage ?? false,
  });
  return render(
    <NextIntlClientProvider locale="fr" messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

afterEach(cleanup);

describe('LinesTable', () => {
  it('marks the retained scenario column', async () => {
    await renderTable({ scenario: 'intermediate' });
    expect(screen.getByRole('columnheader', { name: 'Intermédiaire (retenu)' })).toBeTruthy();
    expect(screen.getByRole('columnheader', { name: 'Sobre' })).toBeTruthy();
    expect(screen.queryByRole('columnheader', { name: /Sobre \(retenu\)/ })).toBeNull();
  });

  it('marks edited grid lines only and totals each level and the spending', async () => {
    await renderTable({ unassigned: 5_000 });
    expect(plain(screen.getByRole('rowheader', { name: /Cercueil/ }).textContent)).toBe(
      'Cercueil · modifié',
    );
    expect(screen.getByRole('rowheader', { name: 'Fleurs' }).textContent).toBe('Fleurs');
    const total = screen.getByRole('rowheader', { name: 'Total' }).closest('tr');
    const cells = within(total as HTMLElement)
      .getAllByRole('cell')
      .map((c) => plain(c.textContent));
    expect(cells).toEqual(['110 000 FCFA', '220 000 FCFA', '330 000 FCFA', '55 000 FCFA']);
  });

  it('shows the unassigned spending row only when it is not zero', async () => {
    await renderTable({ unassigned: 5_000 });
    expect(screen.getByRole('rowheader', { name: 'Dépenses sans poste' })).toBeTruthy();
    cleanup();
    await renderTable({ unassigned: 0 });
    expect(screen.queryByRole('rowheader', { name: 'Dépenses sans poste' })).toBeNull();
  });

  it('names the scrollable region after the caption and lets it take focus', async () => {
    await renderTable();
    const region = screen.getByRole('region', { name: messages.lines.table.caption });
    expect(region.getAttribute('tabindex')).toBe('0');
  });

  it('shows no forms to a member who cannot manage', async () => {
    await renderTable();
    expect(screen.queryByText('Ajouter un poste')).toBeNull();
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.queryByRole('button', { name: /Supprimer/ })).toBeNull();
  });

  it('shows the forms to a manager, without deleting a line that has expenses', async () => {
    await renderTable({ canManage: true });
    expect(screen.getByText('Ajouter un poste')).toBeTruthy();
    expect(screen.getByText('Modifier « Cercueil »')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Supprimer le poste : Fleurs' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Supprimer le poste : Cercueil' })).toBeNull();
  });
});
