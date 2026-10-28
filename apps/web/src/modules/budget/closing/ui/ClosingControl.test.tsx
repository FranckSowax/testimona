// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import messages from '../../../../../messages/fr.json';
import { ClosingControl } from './ClosingControl';

const closeLedgerAction = vi.fn();
const reopenLedgerAction = vi.fn();
vi.mock('../actions', () => ({
  closeLedgerAction: (...args: unknown[]) => closeLedgerAction(...args),
  reopenLedgerAction: (...args: unknown[]) => reopenLedgerAction(...args),
}));

const DOSSIER = '11111111-1111-4111-8111-111111111111';
const t = messages.closing.control;

function renderControl(props: { closed: boolean; canReopen: boolean }) {
  return render(
    <NextIntlClientProvider locale="fr" messages={messages}>
      <ClosingControl dossierId={DOSSIER} {...props} />
    </NextIntlClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  closeLedgerAction.mockReset();
  reopenLedgerAction.mockReset();
});

describe('ClosingControl', () => {
  it('demande une confirmation, place le focus sur « Garder ouvert » et l’y ramène', () => {
    renderControl({ closed: false, canReopen: false });
    fireEvent.click(screen.getByRole('button', { name: t.close }));
    expect(screen.getByText(t.closeWarning)).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: t.keepOpen }));
    fireEvent.click(screen.getByRole('button', { name: t.keepOpen }));
    expect(document.activeElement).toBe(screen.getByRole('button', { name: t.close }));
  });

  it('clôture et l’annonce', async () => {
    closeLedgerAction.mockResolvedValue({ ok: true });
    renderControl({ closed: false, canReopen: false });
    fireEvent.click(screen.getByRole('button', { name: t.close }));
    fireEvent.click(screen.getByRole('button', { name: t.confirmClose }));
    expect((await screen.findByText(t.closed)).getAttribute('role')).toBe('status');
    expect((closeLedgerAction.mock.calls[0]?.[1] as FormData).get('dossierId')).toBe(DOSSIER);
  });

  it('affiche un refus dans une alerte', async () => {
    closeLedgerAction.mockResolvedValue({ error: 'forbidden' });
    renderControl({ closed: false, canReopen: false });
    fireEvent.click(screen.getByRole('button', { name: t.close }));
    fireEvent.click(screen.getByRole('button', { name: t.confirmClose }));
    expect((await screen.findByRole('alert')).textContent).toBe(messages.dossier.errors.forbidden);
  });

  it('propose la réouverture au propriétaire seul', async () => {
    reopenLedgerAction.mockResolvedValue({ ok: true });
    renderControl({ closed: true, canReopen: true });
    fireEvent.click(screen.getByRole('button', { name: t.reopen }));
    expect(await screen.findByText(t.reopened)).toBeTruthy();
    cleanup();
    renderControl({ closed: true, canReopen: false });
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByText(t.reopenOwnerOnly)).toBeTruthy();
  });
});

const wrap = (ui: ReactElement) => (
  <NextIntlClientProvider locale="fr" messages={messages}>
    {ui}
  </NextIntlClientProvider>
);

/** Promesse résolue à la main, pour observer l'état « en cours d'envoi ». */
function deferred<T>() {
  let resolve: (value: T) => void = () => {};
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

function openAndConfirm() {
  fireEvent.click(screen.getByRole('button', { name: t.close }));
  fireEvent.click(screen.getByRole('button', { name: t.confirmClose }));
}

describe('ClosingControl, envoi et annonces', () => {
  it('relie la confirmation à l’avertissement', () => {
    renderControl({ closed: false, canReopen: false });
    fireEvent.click(screen.getByRole('button', { name: t.close }));
    const confirm = screen.getByRole('button', { name: t.confirmClose });
    const warning = document.getElementById(confirm.getAttribute('aria-describedby') ?? '');
    expect(warning?.textContent).toBe(t.closeWarning);
  });

  it('bloque les deux boutons pendant l’envoi', async () => {
    const pending = deferred<{ ok: true }>();
    closeLedgerAction.mockReturnValue(pending.promise);
    renderControl({ closed: false, canReopen: false });
    openAndConfirm();
    const busy = await screen.findByRole('button', { name: t.closing });
    expect((busy as HTMLButtonElement).disabled).toBe(true);
    expect(busy.getAttribute('aria-busy')).toBe('true');
    const keep = screen.getByRole('button', { name: t.keepOpen }) as HTMLButtonElement;
    expect(keep.disabled).toBe(true);
    fireEvent.click(keep);
    expect(screen.getByText(t.closeWarning)).toBeTruthy();
    await act(async () => pending.resolve({ ok: true }));
  });

  it('place le focus sur le titre après la clôture, même quand la page se met à jour', async () => {
    closeLedgerAction.mockResolvedValue({ ok: true });
    const { rerender } = renderControl({ closed: false, canReopen: true });
    openAndConfirm();
    await screen.findByText(t.closed);
    const title = screen.getByRole('heading', { name: t.title });
    expect(document.activeElement).toBe(title);
    rerender(wrap(<ClosingControl dossierId={DOSSIER} closed canReopen />));
    expect(document.activeElement).toBe(title);
    expect(screen.getByRole('status').textContent).toBe(t.closed);
    expect(screen.getByRole('button', { name: t.reopen })).toBeTruthy();
  });

  it('affiche une erreur de réouverture', async () => {
    reopenLedgerAction.mockResolvedValue({ error: 'forbidden' });
    renderControl({ closed: true, canReopen: true });
    fireEvent.click(screen.getByRole('button', { name: t.reopen }));
    expect((await screen.findByRole('alert')).textContent).toBe(messages.dossier.errors.forbidden);
    expect(screen.getByRole('status').textContent).toBe('');
  });

  it('masque l’ancienne erreur pendant un nouvel envoi puis la réannonce', async () => {
    closeLedgerAction.mockResolvedValueOnce({ error: 'forbidden' });
    renderControl({ closed: false, canReopen: false });
    openAndConfirm();
    const first = await screen.findByRole('alert');
    const pending = deferred<{ error: 'forbidden' }>();
    closeLedgerAction.mockReturnValueOnce(pending.promise);
    fireEvent.click(screen.getByRole('button', { name: t.confirmClose }));
    await screen.findByRole('button', { name: t.closing });
    expect(screen.queryByRole('alert')).toBeNull();
    await act(async () => pending.resolve({ error: 'forbidden' }));
    const second = await screen.findByRole('alert');
    expect(second).not.toBe(first);
  });

  it('efface « Cotisations rouvertes. » au clic suivant sur « Clôturer »', async () => {
    reopenLedgerAction.mockResolvedValue({ ok: true });
    const { rerender } = renderControl({ closed: true, canReopen: true });
    fireEvent.click(screen.getByRole('button', { name: t.reopen }));
    await screen.findByText(t.reopened);
    rerender(wrap(<ClosingControl dossierId={DOSSIER} closed={false} canReopen />));
    expect(screen.getByRole('status').textContent).toBe(t.reopened);
    fireEvent.click(screen.getByRole('button', { name: t.close }));
    expect(screen.getByRole('status').textContent).toBe('');
  });
});
