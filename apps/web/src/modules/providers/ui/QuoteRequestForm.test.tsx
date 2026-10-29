// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
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

  it('donne le focus au message à l’ouverture', () => {
    renderForm();
    fireEvent.click(screen.getByRole('button', { name: 'Demander un devis' }));
    expect(document.activeElement).toBe(screen.getByRole('textbox'));
  });

  it('rend le focus au bouton « Demander un devis » après « Annuler »', () => {
    renderForm();
    fireEvent.click(screen.getByRole('button', { name: 'Demander un devis' }));
    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }));
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Demander un devis' }));
  });

  it('ne laisse pas le focus au bouton au premier rendu', () => {
    renderForm();
    expect(document.activeElement).toBe(document.body);
  });

  it('bloque une double soumission avant le rendu suivant', async () => {
    // WHY: une action qui se résout : sans garde synchrone, React mettrait le second envoi en
    // file et l'exécuterait après le premier, d'où deux demandes tracées.
    action.mockResolvedValue({ error: 'unreachable' });
    renderForm();
    fireEvent.click(screen.getByRole('button', { name: 'Demander un devis' }));
    const form = screen.getByRole('textbox').closest('form')!;
    await act(async () => {
      fireEvent.submit(form);
      fireEvent.submit(form);
    });
    await screen.findByRole('alert');
    expect(action).toHaveBeenCalledTimes(1);
  });

  it('propose « Renvoyer la demande » après un succès', async () => {
    action.mockResolvedValue({ ok: true, href: 'https://wa.me/24177123456?text=x' });
    renderForm();
    fireEvent.click(screen.getByRole('button', { name: 'Demander un devis' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ouvrir WhatsApp' }));
    expect(await screen.findByRole('button', { name: 'Renvoyer la demande' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Ouvrir WhatsApp' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Renvoyer la demande' }));
    await waitFor(() => expect(action).toHaveBeenCalledTimes(2));
  });

  it('relie l’erreur au champ du message', async () => {
    action.mockResolvedValue({ error: 'unreachable' });
    renderForm();
    fireEvent.click(screen.getByRole('button', { name: 'Demander un devis' }));
    const field = screen.getByRole('textbox');
    expect(field.getAttribute('aria-invalid')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Ouvrir WhatsApp' }));
    const alert = await screen.findByRole('alert');
    expect(field.getAttribute('aria-invalid')).toBe('true');
    expect(alert.id).not.toBe('');
    expect(field.getAttribute('aria-describedby')?.split(' ')).toContain(alert.id);
  });

  it('efface lien et erreur périmés après « Annuler »', async () => {
    action.mockResolvedValue({ error: 'unreachable' });
    renderForm();
    fireEvent.click(screen.getByRole('button', { name: 'Demander un devis' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ouvrir WhatsApp' }));
    await screen.findByRole('alert');
    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }));
    fireEvent.click(screen.getByRole('button', { name: 'Demander un devis' }));
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.getByRole('button', { name: 'Ouvrir WhatsApp' })).toBeTruthy();
  });
});
