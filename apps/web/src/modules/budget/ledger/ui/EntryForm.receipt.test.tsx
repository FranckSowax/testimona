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
// WHY: la prise de photo a ses propres tests ; ici on vérifie seulement le branchement.
vi.mock('../../receipts/ui/ReceiptCapture', () => ({
  ReceiptCapture: ({
    onAttach,
    onRead,
    onBusyChange,
    disabled,
  }: {
    onAttach: (id: string | null) => void;
    onRead: (p: unknown) => void;
    onBusyChange: (busy: boolean) => void;
    disabled: boolean;
  }) => (
    <div>
      <button type="button" disabled={disabled} onClick={() => onAttach('receipt-1')}>
        attach
      </button>
      <button
        type="button"
        onClick={() =>
          onRead({ amount: 45_000, occurredOn: null, partyName: 'Mba', budgetLineId: null })
        }
      >
        read
      </button>
      <button type="button" onClick={() => onBusyChange(true)}>
        busy
      </button>
    </div>
  ),
}));

const DOSSIER = '11111111-1111-4111-8111-111111111111';
const form = messages.ledger.form;
const unlinked = messages.receipts.unlinked;

function renderForm(props: Partial<Parameters<typeof EntryForm>[0]> = {}) {
  return render(
    <NextIntlClientProvider locale="fr" messages={messages}>
      <EntryForm
        dossierId={DOSSIER}
        kind="expense"
        withReceipt
        amountLabel={(n) => formatXaf(n, 'fr')}
        {...props}
      />
    </NextIntlClientProvider>,
  );
}

const hidden = (container: HTMLElement, name: string) =>
  container.querySelector<HTMLInputElement>(`input[name="${name}"]`)?.value;
const field = (label: string) => screen.getByLabelText(label) as HTMLInputElement;
const button = (name: string) => screen.queryByRole('button', { name });
// WHY: `.disabled` ne reflète pas un `fieldset` désactivé ; `:disabled` si.
const isDisabled = (el: Element | null) => el?.matches(':disabled') ?? false;

/** Saisit une dépense avec reçu et l'envoie ; renvoie la clé d'idempotence utilisée. */
async function submitExpense(container: HTMLElement) {
  fireEvent.click(screen.getByRole('button', { name: 'attach' }));
  fireEvent.change(field(form.supplier), { target: { value: 'Mba' } });
  fireEvent.change(field(form.amount), { target: { value: '45000' } });
  const submit = screen.getByRole('button', { name: form.submit });
  await waitFor(() => expect(submit).toHaveProperty('disabled', false));
  const key = hidden(container, 'idempotencyKey');
  fireEvent.click(submit);
  await waitFor(() => expect(saveEntryAction).toHaveBeenCalledTimes(1));
  return key;
}

afterEach(() => {
  cleanup();
  saveEntryAction.mockReset();
});

describe('EntryForm et le reçu', () => {
  it('joint le reçu et préremplit les champs de la dépense', async () => {
    const { container } = renderForm();
    expect(hidden(container, 'receiptId')).toBe('');
    fireEvent.click(screen.getByRole('button', { name: 'attach' }));
    fireEvent.click(screen.getByRole('button', { name: 'read' }));
    expect(hidden(container, 'receiptId')).toBe('receipt-1');
    expect(field(form.amount).value).toBe('45000');
    expect(field(form.supplier).value).toBe('Mba');
    const submit = screen.getByRole('button', { name: form.submit });
    await waitFor(() => expect(submit).toHaveProperty('disabled', false));
    fireEvent.click(submit);
    await waitFor(() => expect(saveEntryAction).toHaveBeenCalled());
    const data = saveEntryAction.mock.calls[0]![1] as FormData;
    expect(data.get('receiptId')).toBe('receipt-1');
  });

  it('ne propose pas de photo sans withReceipt ni hors des dépenses', () => {
    const { container } = renderForm({ withReceipt: false });
    expect(button('attach')).toBeNull();
    expect(hidden(container, 'receiptId')).toBeUndefined();
    cleanup();
    renderForm({ kind: 'receipt' });
    expect(button('attach')).toBeNull();
  });

  it('bloque l’envoi pendant l’envoi ou la lecture de la photo', async () => {
    renderForm();
    const submit = screen.getByRole('button', { name: form.submit });
    await waitFor(() => expect(submit).toHaveProperty('disabled', false));
    fireEvent.click(screen.getByRole('button', { name: 'busy' }));
    expect(submit).toHaveProperty('disabled', true);
    fireEvent.submit(submit.closest('form')!);
    expect(saveEntryAction).not.toHaveBeenCalled();
  });

  it('fige la dépense sans reçu joint et retente avec la même saisie et la même clé', async () => {
    saveEntryAction.mockResolvedValueOnce({ error: 'receipt_unlinked' });
    const { container } = renderForm();
    const key = await submitExpense(container);
    const retry = await screen.findByRole('button', { name: unlinked.retry });
    expect(screen.getByRole('alert').textContent).toBe(messages.ledger.errors.receipt_unlinked);
    expect(screen.getByText(unlinked.frozen)).toBeTruthy();
    expect(isDisabled(field(form.amount))).toBe(true);
    expect(isDisabled(button('attach'))).toBe(true);
    expect(button(form.submit)).toBeNull();
    expect(document.activeElement).toBe(retry);

    saveEntryAction.mockResolvedValueOnce({ ok: true });
    fireEvent.click(retry);
    await waitFor(() => expect(saveEntryAction).toHaveBeenCalledTimes(2));
    const data = saveEntryAction.mock.calls[1]![1] as FormData;
    expect(data.get('idempotencyKey')).toBe(key);
    expect(data.get('receiptId')).toBe('receipt-1');
    expect(data.get('amount')).toBe('45000');
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe(form.saved));
    expect(isDisabled(field(form.amount))).toBe(false);
    expect(field(form.amount).value).toBe('');
    expect(hidden(container, 'receiptId')).toBe('');
    expect(hidden(container, 'idempotencyKey')).not.toBe(key);
  });

  it('continue sans le reçu : formulaire vide, nouvelle clé, message retiré', async () => {
    saveEntryAction.mockResolvedValueOnce({ error: 'receipt_unlinked' });
    const { container } = renderForm();
    const key = await submitExpense(container);
    fireEvent.click(await screen.findByRole('button', { name: unlinked.continue }));
    await waitFor(() => expect(isDisabled(field(form.amount))).toBe(false));
    expect(field(form.amount).value).toBe('');
    expect(field(form.supplier).value).toBe('');
    expect(hidden(container, 'receiptId')).toBe('');
    expect(hidden(container, 'idempotencyKey')).not.toBe(key);
    expect(screen.queryByRole('alert')).toBeNull();
    expect(button(unlinked.retry)).toBeNull();
    expect(document.activeElement).toBe(field(form.supplier));
    expect(button(form.submit)).toBeTruthy();
  });

  it.each(['receipt_unavailable', 'changed_since_saved'] as const)(
    'après %s, ne propose que de continuer sans le reçu',
    async (error) => {
      saveEntryAction.mockResolvedValueOnce({ error });
      const { container } = renderForm();
      const key = await submitExpense(container);
      const next = await screen.findByRole('button', { name: unlinked.continue });
      expect(screen.getByRole('alert').textContent).toBe(messages.ledger.errors[error]);
      expect(button(unlinked.retry)).toBeNull();
      expect(button(form.submit)).toBeNull();
      expect(isDisabled(field(form.amount))).toBe(true);
      expect(document.activeElement).toBe(next);
      fireEvent.click(next);
      await waitFor(() => expect(field(form.amount).value).toBe(''));
      expect(hidden(container, 'idempotencyKey')).not.toBe(key);
      expect(screen.queryByRole('alert')).toBeNull();
    },
  );
});
