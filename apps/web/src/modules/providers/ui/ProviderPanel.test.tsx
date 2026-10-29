// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import messages from '../../../../messages/fr.json';
import type { PanelGroup } from '../panel';
import { ProviderPanel } from './ProviderPanel';

vi.mock('../quote-actions', () => ({ requestQuoteAction: vi.fn() }));

const groups: PanelGroup[] = [
  {
    category: 'tentsChairs',
    providers: [
      {
        id: '11111111-1111-4111-8111-111111111111',
        categoryKey: 'tentsChairs',
        name: 'Tentes Owendo',
        city: 'Libreville',
        district: 'Owendo',
        whatsapp: '+24177123456',
        priceNote: 'Tente 5×10 m, 40 000 XAF',
        isExample: false,
        verifiedAt: '2026-10-01T00:00:00Z',
        active: true,
      },
      {
        id: '22222222-2222-4222-8222-222222222222',
        categoryKey: 'tentsChairs',
        name: 'Location Akanda (exemple)',
        city: 'Libreville',
        district: null,
        whatsapp: null,
        priceNote: null,
        isExample: true,
        verifiedAt: null,
        active: true,
      },
    ],
  },
];

function renderPanel(g: PanelGroup[]) {
  return render(
    <NextIntlClientProvider locale="fr" messages={messages}>
      <ProviderPanel city="Libreville" groups={g} quote={null} />
    </NextIntlClientProvider>,
  );
}

afterEach(cleanup);

describe('ProviderPanel', () => {
  it('affiche les prestataires par catégorie avec leur badge', () => {
    renderPanel(groups);
    expect(screen.getByRole('heading', { name: 'Prestataires à Libreville' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Tentes et chaises' })).toBeTruthy();
    const [verified, example] = screen.getAllByRole('listitem') as HTMLElement[];
    expect(within(verified!).getByText('Vérifié')).toBeTruthy();
    expect(within(verified!).getByText('Owendo')).toBeTruthy();
    expect(within(verified!).getByText('Tente 5×10 m, 40 000 XAF')).toBeTruthy();
    expect(within(verified!).queryByText(/contact indisponible/)).toBeNull();
    expect(within(example!).getByText('Exemple')).toBeTruthy();
    expect(within(example!).getByText("Prestataire d'exemple, contact indisponible.")).toBeTruthy();
  });

  it("n'affiche rien sans prestataire", () => {
    const { container } = renderPanel([]);
    expect(container.innerHTML).toBe('');
  });

  it("n'affiche pas le numéro WhatsApp", () => {
    renderPanel(groups);
    expect(screen.queryByText(/\+241/)).toBeNull();
  });

  it('propose un devis pour un prestataire vérifié seulement, avec le message préparé', () => {
    render(
      <NextIntlClientProvider locale="fr" messages={messages}>
        <ProviderPanel
          city="Libreville"
          groups={groups}
          quote={{
            dossierId: '33333333-3333-4333-8333-333333333333',
            stepId: 'vigil-setup',
            messages: { '11111111-1111-4111-8111-111111111111': 'Bonjour Tentes Owendo,' },
          }}
        />
      </NextIntlClientProvider>,
    );
    const [verified, example] = screen.getAllByRole('listitem') as HTMLElement[];
    expect(within(verified!).getByRole('button', { name: 'Demander un devis' })).toBeTruthy();
    expect(within(example!).queryByRole('button', { name: 'Demander un devis' })).toBeNull();
    expect(screen.getAllByRole('button', { name: 'Demander un devis' })).toHaveLength(1);
    expect(screen.queryByText(/\+241/)).toBeNull();
  });

  it('ne propose aucun devis sans droit de demande', () => {
    renderPanel(groups);
    expect(screen.queryByRole('button', { name: 'Demander un devis' })).toBeNull();
  });
});
