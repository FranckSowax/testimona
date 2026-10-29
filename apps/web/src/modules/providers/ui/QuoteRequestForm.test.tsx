// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import messages from '../../../../messages/fr.json';

const action = vi.hoisted(() => vi.fn());
vi.mock('../quote-actions', () => ({ requestQuoteAction: action }));

const { QuoteRequestForm } = await import('./QuoteRequestForm');

const props = {
  dossierId: '11111111-1111-4111-8111-111111111111',
  providerId: '22222222-2222-4222-8222-222222222222',
  providerName: 'Tentes Owendo',
  stepId: 'vigil-setup' as const,
  message: 'Bonjour Tentes Owendo,',
};

const renderForm = () =>
  render(
    <NextIntlClientProvider locale="fr" messages={messages}>
      <QuoteRequestForm {...props} />
    </NextIntlClientProvider>,
  );

beforeEach(() => {
  action.mockReset();
  vi.spyOn(window, 'open').mockReturnValue(null);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('QuoteRequestForm', () => {
  it('montre le message prérempli après « Demander un devis »', () => {
    renderForm();
    expect(screen.queryByRole('textbox')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Demander un devis' }));
    expect(screen.getByRole('textbox', { name: 'Message envoyé à Tentes Owendo' })).toHaveProperty(
      'value',
      'Bonjour Tentes Owendo,',
    );
  });

  it('envoie le message modifié, ouvre WhatsApp et garde le lien', async () => {
    action.mockResolvedValue({ ok: true, href: 'https://wa.me/24177123456?text=x' });
    renderForm();
    fireEvent.click(screen.getByRole('button', { name: 'Demander un devis' }));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Bonjour, une tente.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Ouvrir WhatsApp' }));
    await waitFor(() =>
      expect(window.open).toHaveBeenCalledWith(
        'https://wa.me/24177123456?text=x',
        '_blank',
        'noopener,noreferrer',
      ),
    );
    const sent = action.mock.calls[0]![1] as FormData;
    expect(sent.get('message')).toBe('Bonjour, une tente.');
    expect(sent.get('providerId')).toBe(props.providerId);
    expect(sent.get('dossierId')).toBe(props.dossierId);
    expect(sent.get('stepId')).toBe('vigil-setup');
    expect(
      screen.getByRole('link', { name: 'Écrire à Tentes Owendo sur WhatsApp' }),
    ).toHaveProperty('href', 'https://wa.me/24177123456?text=x');
  });

  it('affiche l’erreur sans ouvrir WhatsApp', async () => {
    action.mockResolvedValue({ error: 'unreachable' });
    renderForm();
    fireEvent.click(screen.getByRole('button', { name: 'Demander un devis' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ouvrir WhatsApp' }));
    expect(await screen.findByRole('alert')).toHaveProperty(
      'textContent',
      messages.providers.quote.errors.unreachable,
    );
    expect(window.open).not.toHaveBeenCalled();
  });

  it('referme le formulaire avec « Annuler »', () => {
    renderForm();
    fireEvent.click(screen.getByRole('button', { name: 'Demander un devis' }));
    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }));
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(action).not.toHaveBeenCalled();
  });
});
