// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import messages from '../../../../../messages/fr.json';
import { formatXaf } from '../../format';
import { EntryForm } from './EntryForm';

const saveEntryAction = vi.fn();
vi.mock('../actions', () => ({
  saveEntryAction: (...args: unknown[]) => saveEntryAction(...args),
}));

// WHY: la vraie clé est créée au montage ; on peut la forcer à '' pour voir l'envoi bloqué.
const keyOverride = vi.hoisted(() => ({ value: null as string | null }));
vi.mock('./useIdempotencyKey', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./useIdempotencyKey')>();
  return {
    ...actual,
    useIdempotencyKey: (): [string, () => void] => {
      const real = actual.useIdempotencyKey();
      return keyOverride.value === null ? real : [keyOverride.value, real[1]];
    },
  };
});

const DOSSIER = '11111111-1111-4111-8111-111111111111';
const PLEDGE = '33333333-3333-4333-8333-333333333333';
const MEMBER = '44444444-4444-4444-8444-444444444444';
const SUBMIT = 'Enregistrer';
const plain = (s: string | null) => (s ?? '').replace(/[  ]/g, ' ');

function renderForm(props: Partial<Parameters<typeof EntryForm>[0]> = {}) {
  return render(
    <NextIntlClientProvider locale="fr" messages={messages}>
      <EntryForm
        dossierId={DOSSIER}
        kind="pledge"
        amountLabel={(n) => formatXaf(n, 'fr')}
        {...props}
      />
    </NextIntlClientProvider>,
  );
}

const hidden = (container: HTMLElement, name: string) =>
  container.querySelector<HTMLInputElement>(`input[name="${name}"]`)?.value;
const submit = () => fireEvent.click(screen.getByRole('button', { name: SUBMIT }));

afterEach(() => {
  cleanup();
  saveEntryAction.mockReset();
  keyOverride.value = null;
});

describe('EntryForm', () => {
  it('asks only for the name, amount, date and note on a pledge', () => {
    const { container } = renderForm();
    expect(screen.getByLabelText(messages.ledger.form.party)).toBeTruthy();
    const amount = screen.getByLabelText(messages.ledger.form.amount);
    expect(amount.getAttribute('inputmode')).toBe('numeric');
    expect(screen.getByLabelText(messages.ledger.form.date).getAttribute('max')).toMatch(
      /^\d{4}-\d{2}-\d{2}$/,
    );
    expect(screen.queryByLabelText(messages.ledger.form.method)).toBeNull();
    expect(screen.queryByLabelText(messages.ledger.form.member)).toBeNull();
    expect(hidden(container, 'kind')).toBe('pledge');
    expect(hidden(container, 'dossierId')).toBe(DOSSIER);
  });

  it('asks for the method, the member and the pledge on a receipt', () => {
    renderForm({
      kind: 'receipt',
      members: [{ id: MEMBER, name: 'Awa Diallo' }],
      pledges: [{ id: PLEDGE, label: 'Awa Diallo', amount: 30_000 }],
    });
    expect(screen.getByLabelText(messages.ledger.form.method)).toBeTruthy();
    const member = screen.getByLabelText(messages.ledger.form.member);
    expect(Array.from(member.querySelectorAll('option'), (o) => o.textContent)).toEqual([
      messages.ledger.form.memberNone,
      'Awa Diallo',
    ]);
    const pledge = screen.getByLabelText(messages.ledger.form.pledge);
    expect(plain(pledge.querySelector(`option[value="${PLEDGE}"]`)?.textContent ?? null)).toBe(
      'Awa Diallo · 30 000 FCFA',
    );
  });

  it('hides the pledge choice on a receipt when no pledge is open', () => {
    renderForm({ kind: 'receipt' });
    expect(screen.queryByLabelText(messages.ledger.form.pledge)).toBeNull();
  });

  it('keeps the submit button disabled until the key exists', () => {
    keyOverride.value = '';
    renderForm();
    expect((screen.getByRole('button', { name: SUBMIT }) as HTMLButtonElement).disabled).toBe(true);
    cleanup();
    keyOverride.value = null;
    renderForm();
    expect((screen.getByRole('button', { name: SUBMIT }) as HTMLButtonElement).disabled).toBe(
      false,
    );
  });

  it('shows a translated field error tied to its field', async () => {
    saveEntryAction.mockResolvedValue({
      error: 'validation',
      fieldErrors: { amount: 'invalid number', note: 'something new' },
    });
    renderForm();
    submit();
    await screen.findAllByRole('alert');
    const amount = screen.getByLabelText(messages.ledger.form.amount);
    expect(amount.getAttribute('aria-invalid')).toBe('true');
    const error = document.getElementById(amount.getAttribute('aria-describedby') ?? '');
    expect(error?.textContent).toBe(messages.ledger.errors.invalidNumber);
    const note = screen.getByLabelText(messages.ledger.form.note);
    const noteError = document.getElementById(note.getAttribute('aria-describedby') ?? '');
    expect(noteError?.textContent).toBe(messages.dossier.errors.validation);
    // WHY: le message général ne double pas les erreurs de champ.
    expect(screen.getAllByRole('alert')).toHaveLength(2);
  });

  it('shows a ledger-specific error in an alert', async () => {
    saveEntryAction.mockResolvedValue({ error: 'pledge_unavailable' });
    renderForm({ kind: 'receipt' });
    submit();
    expect((await screen.findByRole('alert')).textContent).toBe(
      messages.ledger.errors.pledge_unavailable,
    );
  });

  it('confirms the save and renews the key', async () => {
    saveEntryAction.mockResolvedValue({ ok: true });
    const { container } = renderForm();
    const first = hidden(container, 'idempotencyKey');
    expect(first).toMatch(/^[0-9a-f-]{36}$/);
    submit();
    await waitFor(() =>
      expect(screen.getByRole('status').textContent).toBe(messages.ledger.form.saved),
    );
    await waitFor(() => expect(hidden(container, 'idempotencyKey')).not.toBe(first));
    expect((saveEntryAction.mock.calls[0]?.[1] as FormData).get('idempotencyKey')).toBe(first);
  });
});
