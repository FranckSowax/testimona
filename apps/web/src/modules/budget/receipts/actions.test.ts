import { beforeEach, describe, expect, it, vi } from 'vitest';

const { service, auth } = vi.hoisted(() => ({
  service: { prepareReceiptUpload: vi.fn(), readReceiptPrefill: vi.fn() },
  auth: { getCurrentUser: vi.fn() },
}));

vi.mock('server-only', () => ({}));
vi.mock('./service', () => service);
vi.mock('@/lib/supabase/server', () => auth);

const { prepareReceiptUploadAction, readReceiptAction } = await import('./actions');

const DOSSIER = '44444444-4444-4444-8444-444444444444';
const RECEIPT = '77777777-7777-4777-8777-777777777777';

beforeEach(() => {
  vi.clearAllMocks();
  auth.getCurrentUser.mockResolvedValue({ id: 'u1' });
  service.prepareReceiptUpload.mockResolvedValue({ ok: true, data: { receiptId: RECEIPT } });
  service.readReceiptPrefill.mockResolvedValue({ ok: false, error: 'quota' });
});

describe('actions des reçus', () => {
  it('refusent un visiteur non connecté sans appeler le service', async () => {
    auth.getCurrentUser.mockResolvedValue(null);
    const input = { dossierId: DOSSIER, mimeType: 'image/jpeg', sizeBytes: 1 };
    expect(await prepareReceiptUploadAction(input)).toEqual({
      ok: false,
      error: 'unauthenticated',
    });
    expect(await readReceiptAction({ dossierId: DOSSIER, receiptId: RECEIPT })).toEqual({
      ok: false,
      error: 'unauthenticated',
    });
    expect(service.prepareReceiptUpload).not.toHaveBeenCalled();
    expect(service.readReceiptPrefill).not.toHaveBeenCalled();
  });

  it('transmettent l’entrée seule, sans second argument', async () => {
    const input = { dossierId: DOSSIER, mimeType: 'image/jpeg', sizeBytes: 1 };
    await prepareReceiptUploadAction(input);
    expect(service.prepareReceiptUpload).toHaveBeenCalledWith(input);
    expect(await readReceiptAction({ dossierId: DOSSIER, receiptId: RECEIPT })).toEqual({
      ok: false,
      error: 'quota',
    });
    expect(service.readReceiptPrefill.mock.calls[0]).toEqual([
      { dossierId: DOSSIER, receiptId: RECEIPT },
    ]);
  });

  it('n’étalent qu’un objet', async () => {
    await readReceiptAction('forged' as never);
    expect(service.readReceiptPrefill).toHaveBeenCalledWith({});
  });
});
