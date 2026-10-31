import { beforeEach, describe, expect, it, vi } from 'vitest';

// WHY: doublure minimale du client service-role, comme dans `modules/providers/repo.test.ts`.
// Chaque requête consomme la réponse suivante de la file.
const { results, calls } = vi.hoisted(() => ({
  results: [] as unknown[],
  calls: [] as { method: string; args: unknown[] }[],
}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase/server', () => ({ getSupabaseServer: vi.fn() }));
const admin = vi.hoisted(() => ({ isPlatformAdmin: vi.fn() }));
vi.mock('@/lib/auth/platform-admin', () => admin);
vi.mock('@/lib/supabase/admin', () => {
  const next = () => Promise.resolve(results.shift());
  const query = () => {
    const q: Record<string, unknown> = {};
    for (const method of ['select', 'eq', 'order', 'limit', 'returns']) {
      q[method] = (...args: unknown[]) => {
        calls.push({ method, args });
        return q;
      };
    }
    q.maybeSingle = () => next();
    q.then = (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
      next().then(resolve, reject);
    return q;
  };
  const db = {
    from: (...args: unknown[]) => {
      calls.push({ method: 'from', args });
      return query();
    },
  };
  return { getSupabaseAdminClient: () => db };
});

const { getProviderWithContact, listProvidersWithContact } = await import('./providers');

const ID = '66666666-6666-4666-8666-666666666666';
const row = {
  id: ID,
  category_key: 'sound',
  name: 'Sono Plus',
  city: 'Libreville',
  district: 'Akanda',
  whatsapp: '+24177123456',
  price_note: 'dès 50 000 FCFA',
  is_example: false,
  verified_at: '2026-10-01T09:00:00.000Z',
  active: true,
};
const provider = {
  id: ID,
  categoryKey: 'sound',
  name: 'Sono Plus',
  city: 'Libreville',
  district: 'Akanda',
  whatsapp: '+24177123456',
  priceNote: 'dès 50 000 FCFA',
  isExample: false,
  verifiedAt: '2026-10-01T09:00:00.000Z',
  active: true,
};

const callsOf = (method: string) => calls.filter((c) => c.method === method);

beforeEach(() => {
  results.length = 0;
  calls.length = 0;
  admin.isPlatformAdmin.mockResolvedValue(true);
});

describe('garde administrateur', () => {
  it('refuse sans lire la base hors administrateur', async () => {
    admin.isPlatformAdmin.mockResolvedValue(false);
    const denied = { data: null, error: { code: '42501', message: 'platform admin only' } };
    expect(await listProvidersWithContact({})).toEqual(denied);
    expect(await getProviderWithContact(ID)).toEqual(denied);
    expect(calls).toEqual([]);
  });
});

describe('listProvidersWithContact', () => {
  it('lit le numéro, convertit les colonnes et trie par ville puis nom', async () => {
    results.push({ data: [row], error: null });
    expect(await listProvidersWithContact({})).toEqual({ data: [provider], error: null });
    expect(callsOf('from')[0]?.args).toEqual(['provider']);
    expect(String(callsOf('select')[0]?.args[0])).toContain('whatsapp');
    expect(callsOf('order').map((c) => c.args)).toEqual([['city'], ['name']]);
    expect(callsOf('limit')[0]?.args).toEqual([200]);
    expect(callsOf('eq')).toHaveLength(0);
  });

  it('applique les filtres ville et catégorie', async () => {
    results.push({ data: [], error: null });
    await listProvidersWithContact({ city: 'Libreville', category: 'sound' });
    expect(callsOf('eq').map((c) => c.args)).toEqual([
      ['city', 'Libreville'],
      ['category_key', 'sound'],
    ]);
  });

  it('rend une erreur de la base et ne journalise que le code', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    results.push({ data: null, error: { code: '42501', message: 'secret detail' } });
    expect(await listProvidersWithContact({})).toEqual({
      data: null,
      error: { code: '42501', message: 'secret detail' },
    });
    expect(log).toHaveBeenCalledWith('[providers] listProviders impossible', { code: '42501' });
    log.mockRestore();
  });

  it('complète une erreur sans code ni message', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    results.push({ data: null, error: {} });
    expect(await listProvidersWithContact({})).toEqual({
      data: null,
      error: { code: 'unknown', message: 'providers error' },
    });
    log.mockRestore();
  });
});

describe('getProviderWithContact', () => {
  it('lit un prestataire par identifiant, numéro compris', async () => {
    results.push({ data: row, error: null });
    expect(await getProviderWithContact(ID)).toEqual({ data: provider, error: null });
    expect(callsOf('eq')[0]?.args).toEqual(['id', ID]);
  });

  it('renvoie no_rows quand rien ne correspond', async () => {
    results.push({ data: null, error: null });
    expect(await getProviderWithContact(ID)).toEqual({
      data: null,
      error: { code: 'no_rows', message: 'no row matched' },
    });
  });

  it('rend l’erreur de la base', async () => {
    results.push({ data: null, error: { code: '42501', message: 'denied' } });
    expect(await getProviderWithContact(ID)).toEqual({
      data: null,
      error: { code: '42501', message: 'denied' },
    });
  });
});
