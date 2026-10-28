import { beforeEach, describe, expect, it, vi } from 'vitest';

const { service, auth } = vi.hoisted(() => ({
  service: { openReceipt: vi.fn() },
  auth: { getCurrentUser: vi.fn() },
}));

vi.mock('server-only', () => ({}));
vi.mock('./service', () => service);
vi.mock('@/lib/supabase/server', () => auth);

const { receiptRedirect } = await import('./http');

const RECEIPT = '77777777-7777-4777-8777-777777777777';

beforeEach(() => {
  vi.clearAllMocks();
  auth.getCurrentUser.mockResolvedValue({ id: 'u1' });
  service.openReceipt.mockResolvedValue({ ok: true, data: 'https://signed.example/r' });
});

describe('receiptRedirect', () => {
  it('redirige vers le lien signé, sans cache ni référent', async () => {
    const res = await receiptRedirect(RECEIPT);
    expect(res.status).toBe(303);
    expect(res.headers.get('Location')).toBe('https://signed.example/r');
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    expect(res.headers.get('Referrer-Policy')).toBe('no-referrer');
    expect(service.openReceipt).toHaveBeenCalledWith({ receiptId: RECEIPT });
  });

  it('exige une session', async () => {
    auth.getCurrentUser.mockResolvedValueOnce(null);
    expect((await receiptRedirect(RECEIPT)).status).toBe(401);
    expect(service.openReceipt).not.toHaveBeenCalled();
  });

  it('répond 404 pour un reçu absent ou interdit, 502 sinon', async () => {
    service.openReceipt.mockResolvedValueOnce({ ok: false, error: 'not_found' });
    expect((await receiptRedirect(RECEIPT)).status).toBe(404);
    service.openReceipt.mockResolvedValueOnce({ ok: false, error: 'forbidden' });
    expect((await receiptRedirect(RECEIPT)).status).toBe(404);
    service.openReceipt.mockResolvedValueOnce({ ok: false, error: 'unknown' });
    expect((await receiptRedirect(RECEIPT)).status).toBe(502);
  });

  it('répond 401 quand la session expire pendant la lecture', async () => {
    service.openReceipt.mockResolvedValueOnce({ ok: false, error: 'unauthenticated' });
    expect((await receiptRedirect(RECEIPT)).status).toBe(401);
  });
});
