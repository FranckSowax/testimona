// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import messages from '../../../../../messages/fr.json';
import { DeleteLineButton } from './DeleteLineButton';
import { LineDeletedAnnouncer } from './LineDeletedAnnouncer';

const deleteLineAction = vi.fn();
vi.mock('../actions', () => ({
  deleteLineAction: (...args: unknown[]) => deleteLineAction(...args),
}));

const DOSSIER = '11111111-1111-4111-8111-111111111111';
const LINE = '22222222-2222-4222-8222-222222222222';
const TRIGGER = 'Supprimer le poste : Cercueil';
const CONFIRM = 'Confirmer la suppression du poste : Cercueil';
const CAPTION = 'lines-caption';

function renderButton() {
  return render(
    <NextIntlClientProvider locale="fr" messages={messages}>
      <LineDeletedAnnouncer focusId={CAPTION}>
        <p id={CAPTION} tabIndex={-1}>
          Postes
        </p>
        <DeleteLineButton dossierId={DOSSIER} lineId={LINE} label="Cercueil" />
      </LineDeletedAnnouncer>
    </NextIntlClientProvider>,
  );
}

const open = () => fireEvent.click(screen.getByRole('button', { name: TRIGGER }));
const confirm = () => fireEvent.click(screen.getByRole('button', { name: CONFIRM }));

afterEach(() => {
  cleanup();
  deleteLineAction.mockReset();
});

describe('DeleteLineButton', () => {
  it('names the trigger after its visible text and the line', () => {
    renderButton();
    const trigger = screen.getByRole('button', { name: TRIGGER });
    expect(trigger.textContent).toBe('Supprimer');
  });

  it('asks for confirmation, focuses « Garder », and returns focus on dismiss', () => {
    const { container } = renderButton();
    expect(screen.queryByRole('button', { name: CONFIRM })).toBeNull();
    open();
    const confirmButton = screen.getByRole('button', { name: CONFIRM });
    // WHY: le nom accessible commence par le texte visible.
    expect(confirmButton.textContent).toBe('Confirmer la suppression');
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Garder' }));
    const warning = document.getElementById(confirmButton.getAttribute('aria-describedby') ?? '');
    expect(warning?.textContent).toBe(messages.lines.form.deleteWarning);
    const hidden = (name: string) =>
      container.querySelector<HTMLInputElement>(`input[name="${name}"]`)?.value;
    expect(hidden('dossierId')).toBe(DOSSIER);
    expect(hidden('lineId')).toBe(LINE);

    fireEvent.click(screen.getByRole('button', { name: 'Garder' }));
    expect(document.activeElement).toBe(screen.getByRole('button', { name: TRIGGER }));
    expect(deleteLineAction).not.toHaveBeenCalled();
  });

  it('shows « line_in_use » with the lines text', async () => {
    deleteLineAction.mockResolvedValue({ error: 'line_in_use' });
    renderButton();
    open();
    confirm();
    expect((await screen.findByRole('alert')).textContent).toBe(messages.lines.errors.line_in_use);
  });

  it('shows a generic error with the dossier text, not again after reopening', async () => {
    deleteLineAction.mockResolvedValue({ error: 'not_found' });
    renderButton();
    open();
    confirm();
    expect((await screen.findByRole('alert')).textContent).toBe(messages.dossier.errors.not_found);
    fireEvent.click(screen.getByRole('button', { name: 'Garder' }));
    open();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('disables the confirm button and says so while pending', async () => {
    let finish: (state: unknown) => void = () => {};
    deleteLineAction.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    renderButton();
    open();
    confirm();
    const busy = await screen.findByRole('button', { name: 'Suppression…' });
    expect((busy as HTMLButtonElement).disabled).toBe(true);
    expect(busy.getAttribute('aria-busy')).toBe('true');
    // WHY: une promesse jamais résolue bloquerait les transitions des tests suivants.
    finish({ error: 'forbidden' });
    await screen.findByRole('alert');
  });

  it('announces the deletion and moves focus to the stable anchor', async () => {
    deleteLineAction.mockResolvedValue({ ok: true });
    renderButton();
    expect(screen.getByRole('status').textContent).toBe('');
    open();
    confirm();
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('Poste supprimé.'));
    await waitFor(() => expect(screen.queryByRole('button', { name: CONFIRM })).toBeNull());
    expect(document.activeElement).toBe(document.getElementById(CAPTION));
  });
});
