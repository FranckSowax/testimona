// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import messages from '../../../../../messages/fr.json';
import { ReverseButton } from './ReverseButton';

const reverseEntryAction = vi.fn();
vi.mock('../actions', () => ({
  reverseEntryAction: (...args: unknown[]) => reverseEntryAction(...args),
}));

const DOSSIER = '11111111-1111-4111-8111-111111111111';
const ENTRY = '22222222-2222-4222-8222-222222222222';
const LABEL = 'Awa Diallo · Cotisation reçue · 20 000 FCFA';
const TRIGGER = `Annuler la ligne ${LABEL}`;
const CONFIRM = "Confirmer l'annulation";

function renderButton() {
  return render(
    <NextIntlClientProvider locale="fr" messages={messages}>
      <ReverseButton dossierId={DOSSIER} entryId={ENTRY} label={LABEL} />
    </NextIntlClientProvider>,
  );
}

const open = () => fireEvent.click(screen.getByRole('button', { name: TRIGGER }));
const confirm = () => fireEvent.click(screen.getByRole('button', { name: CONFIRM }));
/** Clé d'idempotence envoyée lors du n-ième appel de l'action. */
const sentKey = (call: number) =>
  (reverseEntryAction.mock.calls[call]?.[1] as FormData).get('idempotencyKey');

afterEach(() => {
  cleanup();
  reverseEntryAction.mockReset();
});

describe('ReverseButton', () => {
  it('asks for confirmation, focuses « Garder », and returns focus on dismiss', () => {
    const { container } = renderButton();
    expect(screen.queryByRole('button', { name: CONFIRM })).toBeNull();

    open();
    const confirmButton = screen.getByRole('button', { name: CONFIRM });
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Garder' }));
    const warning = document.getElementById(confirmButton.getAttribute('aria-describedby') ?? '');
    expect(warning?.textContent).toBe('Cette annulation est définitive.');
    const hidden = (name: string) =>
      container.querySelector<HTMLInputElement>(`input[name="${name}"]`)?.value;
    expect(hidden('dossierId')).toBe(DOSSIER);
    expect(hidden('entryId')).toBe(ENTRY);
    expect(hidden('idempotencyKey')).toMatch(/^[0-9a-f-]{36}$/);

    fireEvent.click(screen.getByRole('button', { name: 'Garder' }));
    expect(document.activeElement).toBe(screen.getByRole('button', { name: TRIGGER }));
    expect(reverseEntryAction).not.toHaveBeenCalled();
  });

  it('shows a ledger-specific error in an alert', async () => {
    reverseEntryAction.mockResolvedValue({ error: 'already_reversed' });
    renderButton();
    open();
    confirm();
    expect((await screen.findByRole('alert')).textContent).toBe(
      messages.ledger.errors.already_reversed,
    );
  });

  it('shows a generic error with the dossier text', async () => {
    reverseEntryAction.mockResolvedValue({ error: 'forbidden' });
    renderButton();
    open();
    confirm();
    expect((await screen.findByRole('alert')).textContent).toBe(messages.dossier.errors.forbidden);
  });

  it('does not show a stale error after « Garder » then reopening', async () => {
    reverseEntryAction.mockResolvedValue({ error: 'forbidden' });
    renderButton();
    open();
    confirm();
    await screen.findByRole('alert');
    fireEvent.click(screen.getByRole('button', { name: 'Garder' }));
    open();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('disables the confirm button and says so while pending', async () => {
    let finish: (state: unknown) => void = () => {};
    reverseEntryAction.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    renderButton();
    open();
    confirm();
    const busy = await screen.findByRole('button', { name: 'Annulation…' });
    expect((busy as HTMLButtonElement).disabled).toBe(true);
    expect(busy.getAttribute('aria-busy')).toBe('true');
    // WHY: React 19 lie les actions asynchrones en cours ; une promesse jamais résolue
    // bloquerait les transitions des tests suivants.
    finish({ error: 'forbidden' });
    await screen.findByRole('alert');
  });

  it('closes on success and uses a new key for the next reversal', async () => {
    reverseEntryAction.mockResolvedValue({ ok: true });
    renderButton();
    open();
    confirm();
    await waitFor(() => expect(screen.getByRole('button', { name: TRIGGER })).toBeTruthy());
    expect(screen.queryByRole('button', { name: CONFIRM })).toBeNull();

    open();
    confirm();
    await waitFor(() => expect(reverseEntryAction).toHaveBeenCalledTimes(2));
    expect(sentKey(0)).toMatch(/^[0-9a-f-]{36}$/);
    expect(sentKey(1)).not.toBe(sentKey(0));
  });
});
