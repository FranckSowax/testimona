// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import messages from '../../../../../messages/fr.json';
import { LinesActions } from './LinesActions';

const createLinesAction = vi.fn();
const recomputeLinesAction = vi.fn();
vi.mock('../actions', () => ({
  createLinesAction: (...args: unknown[]) => createLinesAction(...args),
  recomputeLinesAction: (...args: unknown[]) => recomputeLinesAction(...args),
}));

const DOSSIER = '11111111-1111-4111-8111-111111111111';

function renderActions(hasLines: boolean) {
  return render(
    <NextIntlClientProvider locale="fr" messages={messages}>
      <LinesActions dossierId={DOSSIER} hasLines={hasLines} />
    </NextIntlClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  createLinesAction.mockReset();
  recomputeLinesAction.mockReset();
});

describe('LinesActions', () => {
  it('offers « Créer les postes » when there is no line', async () => {
    createLinesAction.mockResolvedValue({ ok: true });
    renderActions(false);
    expect(screen.queryByRole('button', { name: "Recalculer selon l'affluence" })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Créer les postes' }));
    await waitFor(() => expect(createLinesAction).toHaveBeenCalledTimes(1));
    expect((createLinesAction.mock.calls[0]?.[1] as FormData).get('dossierId')).toBe(DOSSIER);
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('Postes créés.'));
    expect(recomputeLinesAction).not.toHaveBeenCalled();
  });

  it('offers recomputing with its hint linked', async () => {
    recomputeLinesAction.mockResolvedValue({ ok: true });
    renderActions(true);
    expect(screen.queryByRole('button', { name: 'Créer les postes' })).toBeNull();
    const button = screen.getByRole('button', { name: "Recalculer selon l'affluence" });
    const hint = document.getElementById(button.getAttribute('aria-describedby') ?? '');
    expect(hint?.textContent).toBe(messages.lines.page.recomputeHint);
    fireEvent.click(button);
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('Postes recalculés.'));
  });

  it('shows the lines-specific « no_attendance » error', async () => {
    createLinesAction.mockResolvedValue({ error: 'no_attendance' });
    renderActions(false);
    fireEvent.click(screen.getByRole('button', { name: 'Créer les postes' }));
    expect((await screen.findByRole('alert')).textContent).toBe(
      messages.lines.errors.no_attendance,
    );
  });

  it('shows a generic error with the dossier text', async () => {
    recomputeLinesAction.mockResolvedValue({ error: 'forbidden' });
    renderActions(true);
    fireEvent.click(screen.getByRole('button', { name: "Recalculer selon l'affluence" }));
    expect((await screen.findByRole('alert')).textContent).toBe(messages.dossier.errors.forbidden);
  });
});
