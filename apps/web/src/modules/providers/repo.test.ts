import { beforeEach, describe, expect, it, vi } from 'vitest';

// WHY: doublure minimale du client Supabase. Chaque requête consomme la réponse suivante de la
// file ; les méthodes de la requête renvoient la requête, qui est « thenable » (await) et se
// termine aussi par single/maybeSingle. Le client lui-même n'est pas « thenable ».
const { results, calls } = vi.hoisted(() => ({
  results: [] as unknown[],
  calls: [] as { method: string; args: unknown[] }[],
}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase/server', () => {
  const next = () => Promise.resolve(results.shift());
  const query = () => {
    const q: Record<string, unknown> = {};
    for (const method of ['select', 'insert', 'update', 'eq', 'order', 'limit', 'returns']) {
      q[method] = (...args: unknown[]) => {
        calls.push({ method, args });
        return q;
      };
    }
    q.single = () => next();
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
  return { getSupabaseServer: async () => db };
});

const { getProvider, insertProvider, listProviders, updateProvider } = await import('./repo');

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
const write = {
  categoryKey: 'sound' as const,
  name: 'Sono Plus',
  city: 'Libreville',
  district: 'Akanda',
  whatsapp: '+24177123456',
  priceNote: 'dès 50 000 FCFA',
  isExample: false,
  verifiedAt: '2026-10-01T09:00:00.000Z',
  active: true,
};
const dbRow = Object.fromEntries(Object.entries(row).filter(([key]) => key !== 'id'));

const callsOf = (method: string) => calls.filter((c) => c.method === method);

beforeEach(() => {
  results.length = 0;
  calls.length = 0;
});

describe('listProviders', () => {
  it('convertit les colonnes en prestataires et trie par ville puis nom', async () => {
    results.push({ data: [row], error: null });
    expect(await listProviders({})).toEqual({ data: [provider], error: null });
    expect(callsOf('from')[0]?.args).toEqual(['provider']);
    expect(callsOf('order').map((c) => c.args)).toEqual([['city'], ['name']]);
    expect(callsOf('limit')[0]?.args).toEqual([200]);
    expect(callsOf('eq')).toHaveLength(0);
  });

  it('applique les filtres ville et catégorie', async () => {
    results.push({ data: [], error: null });
    await listProviders({ city: 'Libreville', category: 'sound' });
    expect(callsOf('eq').map((c) => c.args)).toEqual([
      ['city', 'Libreville'],
      ['category_key', 'sound'],
    ]);
  });

  it('rend une erreur de la base et ne journalise que le code', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    results.push({ data: null, error: { code: '42501', message: 'secret detail' } });
    expect(await listProviders({})).toEqual({
      data: null,
      error: { code: '42501', message: 'secret detail' },
    });
    expect(log).toHaveBeenCalledWith('[providers] listProviders impossible', { code: '42501' });
    log.mockRestore();
  });

  it('complète une erreur sans code ni message', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    results.push({ data: null, error: {} });
    expect(await listProviders({})).toEqual({
      data: null,
      error: { code: 'unknown', message: 'providers error' },
    });
    log.mockRestore();
  });
});

describe('getProvider', () => {
  it('lit un prestataire par identifiant', async () => {
    results.push({ data: row, error: null });
    expect(await getProvider(ID)).toEqual({ data: provider, error: null });
    expect(callsOf('eq')[0]?.args).toEqual(['id', ID]);
  });

  it('renvoie no_rows quand rien ne correspond', async () => {
    results.push({ data: null, error: null });
    expect(await getProvider(ID)).toEqual({
      data: null,
      error: { code: 'no_rows', message: 'no row matched' },
    });
  });

  it('rend l’erreur de la base', async () => {
    results.push({ data: null, error: { code: '42501', message: 'denied' } });
    expect(await getProvider(ID)).toEqual({
      data: null,
      error: { code: '42501', message: 'denied' },
    });
  });
});

describe('insertProvider', () => {
  it('écrit les colonnes en snake_case et rend l’identifiant', async () => {
    results.push({ data: { id: ID }, error: null });
    expect(await insertProvider(write)).toEqual({ data: { id: ID }, error: null });
    expect(callsOf('insert')[0]?.args).toEqual([dbRow]);
  });

  it('rend l’erreur de la base', async () => {
    results.push({ data: null, error: { code: '23514', message: 'check' } });
    expect(await insertProvider(write)).toEqual({
      data: null,
      error: { code: '23514', message: 'check' },
    });
  });
});

describe('updateProvider', () => {
  it('écrit les colonnes et filtre sur l’identifiant', async () => {
    results.push({ data: [{ id: ID }], error: null });
    expect(await updateProvider(ID, write)).toEqual({ data: true, error: null });
    expect(callsOf('update')[0]?.args).toEqual([dbRow]);
    expect(callsOf('eq')[0]?.args).toEqual(['id', ID]);
  });

  it('renvoie no_rows quand la mise à jour ne touche aucune ligne', async () => {
    results.push({ data: [], error: null });
    expect(await updateProvider(ID, write)).toEqual({
      data: null,
      error: { code: 'no_rows', message: 'no row matched' },
    });
  });

  it('rend l’erreur de la base', async () => {
    results.push({ data: null, error: { code: '42501', message: 'denied' } });
    expect(await updateProvider(ID, write)).toEqual({
      data: null,
      error: { code: '42501', message: 'denied' },
    });
  });
});
