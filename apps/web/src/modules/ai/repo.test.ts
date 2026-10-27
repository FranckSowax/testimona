import { beforeEach, describe, expect, it, vi } from 'vitest';

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase/server', () => ({ getSupabaseServer: async () => ({ rpc }) }));

const { consumeAiQuota } = await import('./repo');

const DOSSIER = '44444444-4444-4444-8444-444444444444';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('consumeAiQuota', () => {
  it('appelle la fonction avec le dossier et le plafond de 20', async () => {
    rpc.mockResolvedValue({ data: true, error: null });
    expect(await consumeAiQuota(DOSSIER)).toEqual({ data: true, error: null });
    expect(rpc).toHaveBeenCalledWith('consume_ai_quota', {
      p_dossier_id: DOSSIER,
      p_daily_limit: 20,
    });
  });

  it('renvoie false quand le plafond est atteint ou la valeur n’est pas un vrai booléen', async () => {
    rpc.mockResolvedValueOnce({ data: false, error: null });
    expect(await consumeAiQuota(DOSSIER)).toEqual({ data: false, error: null });
    rpc.mockResolvedValueOnce({ data: null, error: null });
    expect(await consumeAiQuota(DOSSIER)).toEqual({ data: false, error: null });
    rpc.mockResolvedValueOnce({ data: 'true', error: null });
    expect(await consumeAiQuota(DOSSIER)).toEqual({ data: false, error: null });
  });

  it('transmet le code d’erreur, ou unknown sans code', async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { code: '42501', message: 'denied' } });
    expect(await consumeAiQuota(DOSSIER)).toEqual({
      data: null,
      error: { code: '42501', message: 'denied' },
    });
    rpc.mockResolvedValueOnce({ data: null, error: { message: 'boom' } });
    expect(await consumeAiQuota(DOSSIER)).toEqual({
      data: null,
      error: { code: 'unknown', message: 'boom' },
    });
  });
});
