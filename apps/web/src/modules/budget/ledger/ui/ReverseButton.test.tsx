// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
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

function renderButton() {
  return render(
    <NextIntlClientProvider locale="fr" messages={messages}>
      <ReverseButton dossierId={DOSSIER} entryId={ENTRY} />
    </NextIntlClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  reverseEntryAction.mockReset();
});

describe('ReverseButton', () => {
  it('asks for confirmation before reversing, and can be dismissed', () => {
    const { container } = renderButton();
    expect(screen.queryByRole('button', { name: "Confirmer l'annulation" })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Annuler cette ligne' }));
    expect(screen.getByRole('button', { name: "Confirmer l'annulation" })).toBeTruthy();
    const hidden = (name: string) =>
      container.querySelector<HTMLInputElement>(`input[name="${name}"]`)?.value;
    expect(hidden('dossierId')).toBe(DOSSIER);
    expect(hidden('entryId')).toBe(ENTRY);
    expect(hidden('idempotencyKey')).toMatch(/^[0-9a-f-]{36}$/);

    fireEvent.click(screen.getByRole('button', { name: 'Garder' }));
    expect(screen.getByRole('button', { name: 'Annuler cette ligne' })).toBeTruthy();
    expect(reverseEntryAction).not.toHaveBeenCalled();
  });

  it('shows a ledger-specific error in an alert', async () => {
    reverseEntryAction.mockResolvedValue({ error: 'already_reversed' });
    renderButton();
    fireEvent.click(screen.getByRole('button', { name: 'Annuler cette ligne' }));
    fireEvent.click(screen.getByRole('button', { name: "Confirmer l'annulation" }));
    expect((await screen.findByRole('alert')).textContent).toBe('Cette ligne a déjà été annulée.');
    expect(reverseEntryAction).toHaveBeenCalledTimes(1);
  });
});
