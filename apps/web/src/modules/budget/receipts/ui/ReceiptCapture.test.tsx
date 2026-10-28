// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import messages from '../../../../../messages/fr.json';
import { RECEIPT_MAX_BYTES } from '../schema';
import { ReceiptCapture } from './ReceiptCapture';

const { prepare, read, upload, from, shrink } = vi.hoisted(() => {
  const upload = vi.fn();
  return {
    prepare: vi.fn(),
    read: vi.fn(),
    upload,
    from: vi.fn(() => ({ uploadToSignedUrl: upload })),
    shrink: vi.fn(async (file: File) => file),
  };
});
vi.mock('../actions', () => ({ prepareReceiptUploadAction: prepare, readReceiptAction: read }));
vi.mock('@/lib/supabase/client', () => ({ getSupabaseBrowser: () => ({ storage: { from } }) }));
// WHY: la réduction a ses propres tests ; jsdom n'a pas de vrai canvas.
vi.mock('./shrinkImage', () => ({ shrinkImage: shrink }));

const DOSSIER = '11111111-1111-4111-8111-111111111111';
const RECEIPT = '77777777-7777-4777-8777-777777777777';
const PATH = `${DOSSIER}/${RECEIPT}.jpg`;
const prefill = { amount: 45_000, occurredOn: '2026-10-20', partyName: 'Mba', budgetLineId: null };
const text = messages.receipts;
const onAttach = vi.fn();
const onRead = vi.fn();
const onBusyChange = vi.fn();

function renderCapture(disabled = false) {
  render(
    <NextIntlClientProvider locale="fr" messages={messages}>
      <ReceiptCapture
        dossierId={DOSSIER}
        onAttach={onAttach}
        onRead={onRead}
        onBusyChange={onBusyChange}
        disabled={disabled}
      />
    </NextIntlClientProvider>,
  );
  return screen.getByLabelText(text.capture.label) as HTMLInputElement;
}

const choose = (input: HTMLElement, file: File) =>
  fireEvent.change(input, { target: { files: [file] } });
const jpeg = () => new File([new Uint8Array([0xff, 0xd8, 0xff])], 'r.jpg', { type: 'image/jpeg' });

beforeEach(() => {
  prepare.mockResolvedValue({ ok: true, data: { receiptId: RECEIPT, path: PATH, token: 'tok' } });
  upload.mockResolvedValue({ data: { path: PATH }, error: null });
  read.mockResolvedValue({ ok: true, data: prefill });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('ReceiptCapture', () => {
  it('envoie la photo, joint le reçu puis propose la lecture', async () => {
    const input = renderCapture();
    expect(input.hasAttribute('capture')).toBe(false);
    expect(input.getAttribute('name')).toBeNull();
    choose(input, jpeg());
    await waitFor(() => expect(onRead).toHaveBeenCalledWith(prefill));
    expect(prepare).toHaveBeenCalledWith({
      dossierId: DOSSIER,
      mimeType: 'image/jpeg',
      sizeBytes: 3,
    });
    expect(from).toHaveBeenCalledWith('receipts');
    expect(upload).toHaveBeenCalledWith(PATH, 'tok', expect.any(File), {
      contentType: 'image/jpeg',
    });
    expect(onAttach).toHaveBeenLastCalledWith(RECEIPT);
    expect(read).toHaveBeenCalledWith({ dossierId: DOSSIER, receiptId: RECEIPT });
    expect(screen.getByRole('status').textContent).toBe(text.capture.read);
  });

  it('envoie la photo réduite par le navigateur', async () => {
    const small = new File([new Uint8Array(10)], 'r.jpg', { type: 'image/jpeg' });
    shrink.mockResolvedValueOnce(small);
    const png = new File([new Uint8Array(RECEIPT_MAX_BYTES + 1)], 'r.png', { type: 'image/png' });
    choose(renderCapture(), png);
    await waitFor(() => expect(onRead).toHaveBeenCalled());
    expect(prepare).toHaveBeenCalledWith({
      dossierId: DOSSIER,
      mimeType: 'image/jpeg',
      sizeBytes: 10,
    });
    expect(upload).toHaveBeenCalledWith(PATH, 'tok', small, { contentType: 'image/jpeg' });
  });

  it('refuse un mauvais type ou une photo trop lourde sans rien envoyer', async () => {
    const input = renderCapture();
    choose(input, new File(['x'], 'r.gif', { type: 'image/gif' }));
    expect((await screen.findByRole('alert')).textContent).toBe(text.errors.receipt_type);
    expect(shrink).not.toHaveBeenCalled();
    const big = jpeg();
    Object.defineProperty(big, 'size', { value: RECEIPT_MAX_BYTES + 1 });
    choose(input, big);
    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toBe(text.errors.receipt_size),
    );
    expect(prepare).not.toHaveBeenCalled();
  });

  it('bloque une seconde photo et signale l’attente pendant l’envoi et la lecture', async () => {
    let finishRead: (value: unknown) => void = () => {};
    read.mockReturnValueOnce(new Promise((resolve) => (finishRead = resolve)));
    const input = renderCapture();
    choose(input, jpeg());
    await waitFor(() => expect(read).toHaveBeenCalled());
    expect(input.disabled).toBe(true);
    expect(onBusyChange).toHaveBeenLastCalledWith(true);
    expect(screen.getByRole('status').textContent).toBe(text.capture.reading);
    choose(input, jpeg());
    expect(prepare).toHaveBeenCalledTimes(1);
    finishRead({ ok: true, data: prefill });
    await waitFor(() => expect(input.disabled).toBe(false));
    expect(onBusyChange).toHaveBeenLastCalledWith(false);
    expect(read).toHaveBeenCalledTimes(1);
  });

  it('désactive le choix quand le formulaire le demande', () => {
    expect(renderCapture(true).disabled).toBe(true);
  });

  it.each(['quota', 'too_large_to_read'] as const)(
    'garde la photo jointe quand l’IA ne lit pas le reçu (%s)',
    async (error) => {
      read.mockResolvedValueOnce({ ok: false, error });
      choose(renderCapture(), jpeg());
      await waitFor(() => expect(screen.getByRole('status').textContent).toBe(text.manual[error]));
      expect(onAttach).toHaveBeenLastCalledWith(RECEIPT);
      expect(onRead).not.toHaveBeenCalled();
      expect(screen.queryByRole('alert')).toBeNull();
    },
  );

  it('garde la photo jointe quand la lecture lève', async () => {
    read.mockRejectedValueOnce(new Error('network'));
    choose(renderCapture(), jpeg());
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe(text.manual.failed));
    expect(onAttach).toHaveBeenLastCalledWith(RECEIPT);
  });

  it('ne joint rien quand l’envoi échoue ou que la photo n’est pas une image', async () => {
    upload.mockResolvedValueOnce({ data: null, error: { message: 'x' } });
    const input = renderCapture();
    choose(input, jpeg());
    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toBe(text.errors.upload_failed),
    );
    expect(onAttach).not.toHaveBeenCalledWith(RECEIPT);
    read.mockResolvedValueOnce({ ok: false, error: 'receipt_type' });
    choose(input, jpeg());
    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toBe(text.errors.receipt_type),
    );
    expect(onAttach).toHaveBeenLastCalledWith(null);
  });

  it('montre l’erreur de préparation (limite de reçus)', async () => {
    prepare.mockResolvedValueOnce({ ok: false, error: 'too_many_receipts' });
    choose(renderCapture(), jpeg());
    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toBe(text.errors.too_many_receipts),
    );
    expect(upload).not.toHaveBeenCalled();
  });
});
