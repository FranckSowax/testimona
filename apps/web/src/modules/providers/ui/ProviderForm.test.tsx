// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import messages from '../../../../messages/fr.json';
import type { Provider } from '../schema';
import { ProviderForm } from './ProviderForm';

const createProviderAction = vi.fn();
const updateProviderAction = vi.fn();
vi.mock('../actions', () => ({
  createProviderAction: (...args: unknown[]) => createProviderAction(...args),
  updateProviderAction: (...args: unknown[]) => updateProviderAction(...args),
}));

const VERIFIED = "Vérifié par l'équipe Testimona";
const PROVIDER: Provider = {
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

const renderForm = (provider?: Provider) =>
  render(
    <NextIntlClientProvider locale="fr" messages={messages}>
      <ProviderForm provider={provider} />
    </NextIntlClientProvider>,
  );

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('ProviderForm', () => {
  it('préremplit un prestataire existant', () => {
    renderForm(PROVIDER);
    expect(screen.getByLabelText('Nom')).toHaveProperty('value', 'Sono Owendo');
    expect(screen.getByLabelText('Numéro WhatsApp')).toHaveProperty('value', '+24177123456');
    expect(screen.getByLabelText(VERIFIED)).toHaveProperty('checked', true);
  });

  it('désactive le numéro et la vérification pour un exemple', () => {
    renderForm(PROVIDER);
    fireEvent.click(screen.getByLabelText("Prestataire d'exemple"));
    expect(screen.getByLabelText('Numéro WhatsApp')).toHaveProperty('disabled', true);
    expect(screen.getByLabelText(VERIFIED)).toHaveProperty('disabled', true);
  });

  it('envoie la modification et affiche les erreurs de champ', async () => {
    updateProviderAction.mockResolvedValue({
      error: 'validation',
      fieldErrors: { whatsapp: 'invalid phone' },
    });
    renderForm(PROVIDER);
    fireEvent.submit(screen.getByRole('form'));
    await waitFor(() => expect(updateProviderAction).toHaveBeenCalledTimes(1));
    const data = updateProviderAction.mock.calls[0]![1] as FormData;
    expect(data.get('providerId')).toBe(PROVIDER.id);
    expect(data.get('verified')).toBe('on');
    expect(await screen.findByText(/au format international, par exemple/)).toBeTruthy();
  });

  it('vide numéro et vérification quand on coche Exemple, et les laisse vides en décochant', async () => {
    updateProviderAction.mockResolvedValue({ ok: true });
    renderForm(PROVIDER);
    fireEvent.click(screen.getByLabelText("Prestataire d'exemple"));
    expect(screen.getByLabelText('Numéro WhatsApp')).toHaveProperty('value', '');
    expect(screen.getByLabelText(VERIFIED)).toHaveProperty('checked', false);
    fireEvent.submit(screen.getByRole('form'));
    await waitFor(() => expect(updateProviderAction).toHaveBeenCalledTimes(1));
    const data = updateProviderAction.mock.calls[0]![1] as FormData;
    expect(data.get('isExample')).toBe('on');
    expect(data.get('whatsapp')).toBeNull();
    expect(data.get('verified')).toBeNull();

    fireEvent.click(screen.getByLabelText("Prestataire d'exemple"));
    expect(screen.getByLabelText('Numéro WhatsApp')).toHaveProperty('value', '');
    expect(screen.getByLabelText('Numéro WhatsApp')).toHaveProperty('disabled', false);
    expect(screen.getByLabelText(VERIFIED)).toHaveProperty('checked', false);
  });

  it('affiche la date de vérification existante', () => {
    renderForm(PROVIDER);
    expect(screen.getByText(/Vérifié le .*2026/)).toBeTruthy();
  });

  it('affiche une erreur globale pour une clé sans champ', async () => {
    updateProviderAction.mockResolvedValue({
      error: 'validation',
      fieldErrors: { providerId: 'x' },
    });
    renderForm(PROVIDER);
    fireEvent.submit(screen.getByRole('form'));
    expect(await screen.findByText('Certaines informations sont incomplètes.')).toBeTruthy();
  });

  it('signale une erreur de catégorie sur la liste déroulante', async () => {
    updateProviderAction.mockResolvedValue({
      error: 'validation',
      fieldErrors: { categoryKey: 'x' },
    });
    renderForm(PROVIDER);
    fireEvent.submit(screen.getByRole('form'));
    expect(await screen.findByText('Certaines informations sont incomplètes.')).toBeTruthy();
    expect(screen.getByLabelText('Catégorie').getAttribute('aria-invalid')).toBe('true');
  });

  it('place le focus sur le premier champ en erreur', async () => {
    updateProviderAction.mockResolvedValue({
      error: 'validation',
      fieldErrors: { whatsapp: 'invalid phone' },
    });
    renderForm(PROVIDER);
    fireEvent.submit(screen.getByRole('form'));
    await screen.findByText(/au format international/);
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByLabelText('Numéro WhatsApp')),
    );
  });

  it('confirme l’enregistrement puis le retire après un envoi en échec', async () => {
    updateProviderAction.mockResolvedValueOnce({ ok: true });
    renderForm(PROVIDER);
    fireEvent.submit(screen.getByRole('form'));
    expect(await screen.findByText('Prestataire enregistré.')).toBeTruthy();
    updateProviderAction.mockResolvedValueOnce({ error: 'unknown' });
    fireEvent.submit(screen.getByRole('form'));
    await waitFor(() => expect(screen.queryByText('Prestataire enregistré.')).toBeNull());
    expect(await screen.findByText(/Une erreur est survenue/)).toBeTruthy();
  });

  it('crée un prestataire sans identifiant', async () => {
    createProviderAction.mockResolvedValue({ ok: true });
    renderForm();
    fireEvent.submit(screen.getByRole('form'));
    await waitFor(() => expect(createProviderAction).toHaveBeenCalledTimes(1));
    expect((createProviderAction.mock.calls[0]![1] as FormData).get('providerId')).toBeNull();
  });
});
