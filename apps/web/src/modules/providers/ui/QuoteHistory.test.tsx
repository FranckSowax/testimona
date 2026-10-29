// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it } from 'vitest';
import messages from '../../../../messages/fr.json';
import { QuoteHistory } from './QuoteHistory';

afterEach(cleanup);

const renderHistory = (items: Parameters<typeof QuoteHistory>[0]['items']) =>
  render(
    <NextIntlClientProvider locale="fr" messages={messages}>
      <QuoteHistory items={items} locale="fr" />
    </NextIntlClientProvider>,
  );

describe('QuoteHistory', () => {
  it('liste prestataire, date et auteur', () => {
    renderHistory([
      { id: 'q1', providerName: 'Tentes Owendo', author: 'Awa', createdAt: '2026-10-29T10:00:00Z' },
      { id: 'q2', providerName: 'Sono Akanda', author: null, createdAt: '2026-10-28T10:00:00Z' },
    ]);
    expect(screen.getByRole('heading', { name: 'Devis demandés' })).toBeTruthy();
    const items = screen.getAllByRole('listitem').map((li) => li.textContent);
    expect(items[0]).toContain('Tentes Owendo, le 29 octobre 2026');
    expect(items[0]).toContain('par Awa');
    expect(items[1]).toContain('par un membre du dossier');
  });

  it('n’affiche rien sans demande', () => {
    const { container } = renderHistory([]);
    expect(container.textContent).toBe('');
  });
});
