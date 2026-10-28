import { beforeEach, describe, expect, it, vi } from 'vitest';

const { service, auth, cache } = vi.hoisted(() => ({
  service: { closeLedger: vi.fn(), reopenLedger: vi.fn() },
  auth: { getCurrentUser: vi.fn() },
  cache: { revalidatePath: vi.fn() },
}));

vi.mock('server-only', () => ({}));
vi.mock('./service', () => service);
vi.mock('@/lib/supabase/server', () => auth);
vi.mock('next/cache', () => cache);
vi.mock('next-intl/server', () => ({ getLocale: vi.fn(async () => 'en') }));

const { closeLedgerAction, reopenLedgerAction } = await import('./actions');
const { localizedPath } = await import('@/lib/auth/redirect-target');

const DOSSIER = '44444444-4444-4444-8444-444444444444';

function form(): FormData {
  const data = new FormData();
  data.set('dossierId', DOSSIER);
  return data;
}

beforeEach(() => {
  vi.clearAllMocks();
  auth.getCurrentUser.mockResolvedValue({ id: 'u1' });
  service.closeLedger.mockResolvedValue({ ok: true, data: { closedAt: '2026-10-28T09:00:00Z' } });
  service.reopenLedger.mockResolvedValue({ ok: true, data: true });
});

describe('closeLedgerAction et reopenLedgerAction', () => {
  it('clôturent puis revalident le dossier et les trois écrans des cotisations', async () => {
    expect(await closeLedgerAction(null, form())).toEqual({ ok: true });
    expect(service.closeLedger).toHaveBeenCalledWith({ dossierId: DOSSIER });
    for (const page of ['', '/cotisations', '/cotisations/postes', '/cotisations/bilan']) {
      expect(cache.revalidatePath).toHaveBeenCalledWith(
        localizedPath(`/dossier/${DOSSIER}${page}`, 'en'),
      );
    }
    cache.revalidatePath.mockClear();
    expect(await reopenLedgerAction(null, form())).toEqual({ ok: true });
    expect(service.reopenLedger).toHaveBeenCalledWith({ dossierId: DOSSIER });
    expect(cache.revalidatePath).toHaveBeenCalledTimes(4);
    for (const page of ['', '/cotisations', '/cotisations/postes', '/cotisations/bilan']) {
      expect(cache.revalidatePath).toHaveBeenCalledWith(
        localizedPath(`/dossier/${DOSSIER}${page}`, 'en'),
      );
    }
  });

  it('rendent l’erreur sans revalider', async () => {
    service.closeLedger.mockResolvedValueOnce({ ok: false, error: 'forbidden' });
    expect(await closeLedgerAction(null, form())).toEqual({ error: 'forbidden' });
    expect(cache.revalidatePath).not.toHaveBeenCalled();
    service.reopenLedger.mockResolvedValueOnce({ ok: false, error: 'forbidden' });
    expect(await reopenLedgerAction(null, form())).toEqual({ error: 'forbidden' });
    expect(cache.revalidatePath).not.toHaveBeenCalled();
  });

  it('exigent une session', async () => {
    auth.getCurrentUser.mockResolvedValue(null);
    expect(await closeLedgerAction(null, form())).toEqual({ error: 'unauthenticated' });
    expect(await reopenLedgerAction(null, form())).toEqual({ error: 'unauthenticated' });
    expect(service.closeLedger).not.toHaveBeenCalled();
  });
});
