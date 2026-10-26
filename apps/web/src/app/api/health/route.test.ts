import { afterEach, describe, expect, it, vi } from 'vitest';

interface QueryResult {
  error: { code: string; message: string; details: string; hint: string } | null;
}

let next: () => Promise<QueryResult>;

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServer: async () => ({
    from: () => ({ select: () => ({ limit: () => next() }) }),
  }),
}));

const { GET } = await import('./route');

const SECRET_DETAIL = 'JWT expired for project abcd';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('GET /api/health', () => {
  it('répond 200 quand Supabase répond', async () => {
    next = async () => ({ error: null });
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await GET();
    expect(res.status).toBe(200);
    expect((await res.json()).checks.supabase).toBe('ok');
    expect(log).not.toHaveBeenCalled();
  });

  it("journalise l'erreur Supabase sans l'exposer dans la réponse", async () => {
    next = async () => ({
      error: { code: 'PGRST301', message: SECRET_DETAIL, details: '', hint: '' },
    });
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await GET();
    expect(res.status).toBe(503);
    expect(log).toHaveBeenCalledWith(
      '[health] Supabase check failed',
      expect.objectContaining({ code: 'PGRST301', message: SECRET_DETAIL }),
    );
    expect(JSON.stringify(await res.json())).not.toContain(SECRET_DETAIL);
  });

  it('journalise une exception réseau', async () => {
    next = async () => {
      throw new TypeError('fetch failed');
    };
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await GET();
    expect(res.status).toBe(503);
    expect(log).toHaveBeenCalledWith(
      '[health] Supabase check threw',
      expect.objectContaining({ error: 'fetch failed' }),
    );
  });
});
