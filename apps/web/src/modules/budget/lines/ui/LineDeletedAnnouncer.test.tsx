// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it } from 'vitest';
import messages from '../../../../../messages/fr.json';
import { LineDeletedAnnouncer, useOnLineDeleted } from './LineDeletedAnnouncer';

const CAPTION = 'lines-caption';
const EMPTY = 'lines-empty';

/** Bouton qui signale une suppression, comme DeleteLineButton après une action réussie. */
function DeleteTrigger() {
  const onDeleted = useOnLineDeleted();
  return (
    <button type="button" onClick={onDeleted}>
      Supprimer
    </button>
  );
}

/** Page réduite : tableau (légende) tant qu'il reste des postes, sinon message vide. */
function Page({ empty }: { empty: boolean }) {
  return (
    <NextIntlClientProvider locale="fr" messages={messages}>
      <LineDeletedAnnouncer focusId={CAPTION} fallbackFocusId={EMPTY} empty={empty}>
        {empty ? (
          <p id={EMPTY} tabIndex={-1}>
            Aucun poste
          </p>
        ) : (
          <p id={CAPTION} tabIndex={-1}>
            Postes
          </p>
        )}
        <DeleteTrigger />
      </LineDeletedAnnouncer>
    </NextIntlClientProvider>
  );
}

const status = () => screen.getByRole('status').textContent;
const remove = () => fireEvent.click(screen.getByRole('button', { name: 'Supprimer' }));

afterEach(cleanup);

describe('LineDeletedAnnouncer', () => {
  it('stays silent and leaves focus alone before any deletion', () => {
    const { rerender } = render(<Page empty={false} />);
    expect(status()).toBe('');
    rerender(<Page empty />);
    expect(document.activeElement).toBe(document.body);
  });

  it('keeps the announcement and moves focus to the empty message when the last line goes', async () => {
    const { rerender } = render(<Page empty={false} />);
    remove();
    expect(document.activeElement).toBe(document.getElementById(CAPTION));
    // WHY: la revalidation retire ensuite le dernier poste, et la légende avec le tableau.
    rerender(<Page empty />);
    expect(document.activeElement).toBe(document.getElementById(EMPTY));
    await waitFor(() => expect(status()).toBe('Poste supprimé.'));
  });

  it('focuses the empty message when the page is already empty on the announcement', () => {
    const { rerender } = render(<Page empty={false} />);
    rerender(<Page empty />);
    remove();
    expect(document.activeElement).toBe(document.getElementById(EMPTY));
  });

  it('does not steal focus when lines come back after a deletion', () => {
    const { rerender } = render(<Page empty={false} />);
    remove();
    rerender(<Page empty />);
    const button = screen.getByRole('button', { name: 'Supprimer' });
    button.focus();
    rerender(<Page empty={false} />);
    expect(document.activeElement).toBe(button);
  });

  it('clears the status before announcing a second deletion', async () => {
    render(<Page empty={false} />);
    remove();
    await waitFor(() => expect(status()).toBe('Poste supprimé.'));
    act(() => remove());
    expect(status()).toBe('');
    await waitFor(() => expect(status()).toBe('Poste supprimé.'));
  });
});
