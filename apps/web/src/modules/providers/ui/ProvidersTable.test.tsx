// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import messages from '../../../../messages/fr.json';
import type { Provider } from '../schema';
import { ProvidersTable } from './ProvidersTable';

vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const BASE: Provider = {
  id: '66666666-6666-4666-8666-666666666666',
  categoryKey: 'sound',
  name: 'Sono Owendo',
  city: 'Libreville',
  district: 'Owendo',
  whatsapp: '+24177123456',
  priceNote: null,
  isExample: false,
  verifiedAt: '2026-10-01T09:00:00.000Z',
  active: true,
};

const renderTable = (providers: Provider[]) =>
  render(
    <NextIntlClientProvider locale="fr" messages={messages}>
      <ProvidersTable providers={providers} />
    </NextIntlClientProvider>,
  );

afterEach(cleanup);

describe('ProvidersTable', () => {
  it('affiche le statut exemple', () => {
    renderTable([{ ...BASE, isExample: true, whatsapp: null, verifiedAt: null }]);
    expect(screen.getByText('Exemple')).toBeTruthy();
  });

  it('affiche la date de vérification', () => {
    renderTable([BASE]);
    expect(screen.getByText(/^Vérifié le .*2026/)).toBeTruthy();
  });

  it('affiche non vérifié et masqué pour un prestataire inactif', () => {
    renderTable([{ ...BASE, verifiedAt: null, active: false }]);
    expect(screen.getByText('Non vérifié · Masqué')).toBeTruthy();
  });

  it('relie chaque ligne à son écran de modification', () => {
    renderTable([BASE]);
    const link = screen.getByRole('link', { name: 'Modifier Sono Owendo' });
    expect(link.getAttribute('href')).toBe(`/admin/providers/${BASE.id}`);
    expect(screen.getByText('Libreville, Owendo')).toBeTruthy();
  });

  it('affiche un message quand la liste est vide', () => {
    renderTable([]);
    expect(screen.getByText('Aucun prestataire pour ces critères.')).toBeTruthy();
    expect(screen.queryByRole('table')).toBeNull();
  });
});
