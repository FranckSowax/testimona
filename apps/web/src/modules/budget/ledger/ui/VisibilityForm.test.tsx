// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import messages from '../../../../../messages/fr.json';
import type { Visibility } from '../schema';
import { VisibilityForm } from './VisibilityForm';

const setVisibilityAction = vi.fn();
vi.mock('../actions', () => ({
  setVisibilityAction: (...args: unknown[]) => setVisibilityAction(...args),
}));

const DOSSIER = '11111111-1111-4111-8111-111111111111';
const t = messages.ledger.visibility;

function renderForm(visibility: Visibility) {
  return render(
    <NextIntlClientProvider locale="fr" messages={messages}>
      <VisibilityForm dossierId={DOSSIER} visibility={visibility} />
    </NextIntlClientProvider>,
  );
}

const radio = (label: string) => screen.getByLabelText(label) as HTMLInputElement;

afterEach(() => {
  cleanup();
  setVisibilityAction.mockReset();
});

describe('VisibilityForm', () => {
  it('shows both options with the current one checked', () => {
    renderForm('members');
    expect(screen.getByRole('group', { name: t.title })).toBeTruthy();
    expect(radio(t.restricted).checked).toBe(false);
    expect(radio(t.members).checked).toBe(true);
    cleanup();
    renderForm('restricted');
    expect(radio(t.restricted).checked).toBe(true);
    expect(radio(t.members).checked).toBe(false);
  });

  it('confirms the save', async () => {
    setVisibilityAction.mockResolvedValue({ ok: true });
    renderForm('restricted');
    fireEvent.click(radio(t.members));
    fireEvent.click(screen.getByRole('button', { name: t.save }));
    expect((await screen.findByText(t.saved)).getAttribute('role')).toBe('status');
    expect((setVisibilityAction.mock.calls[0]?.[1] as FormData).get('visibility')).toBe('members');
  });

  it('shows an error in an alert and keeps the choice just made', async () => {
    setVisibilityAction.mockResolvedValue({ error: 'forbidden' });
    renderForm('restricted');
    fireEvent.click(radio(t.members));
    fireEvent.click(screen.getByRole('button', { name: t.save }));
    expect((await screen.findByRole('alert')).textContent).toBe(messages.dossier.errors.forbidden);
    // WHY: le formulaire n'est pas réinitialisé ; la personne peut réessayer sans refaire son choix.
    expect(radio(t.members).checked).toBe(true);
    expect(radio(t.restricted).checked).toBe(false);
    expect(screen.queryByText(t.saved)).toBeNull();
  });
});
