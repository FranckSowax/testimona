// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
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
