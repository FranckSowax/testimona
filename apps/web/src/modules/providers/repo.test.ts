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
    for (const method of [
      'select',
      'insert',
      'update',
      'eq',
      'in',
      'or',
      'order',
      'limit',
      'returns',
    ]) {
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

const { insertProvider, listPanelProviders, updateProvider } = await import('./repo');

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
const without = (key: string, o: object) =>
  Object.fromEntries(Object.entries(o).filter(([k]) => k !== key));
const dbRow = without('id', row);

const callsOf = (method: string) => calls.filter((c) => c.method === method);

beforeEach(() => {
  results.length = 0;
  calls.length = 0;
});

describe('listPanelProviders', () => {
  it("lit les prestataires actifs, vérifiés ou d'exemple, des catégories demandées", async () => {
    results.push({ data: [without('whatsapp', row)], error: null });
    const res = await listPanelProviders(['tentsChairs', 'sound']);
    expect(res).toEqual({ data: [without('whatsapp', provider)], error: null });
    expect(calls).toEqual(
      expect.arrayContaining([
        { method: 'from', args: ['provider'] },
        { method: 'in', args: ['category_key', ['tentsChairs', 'sound']] },
        { method: 'eq', args: ['active', true] },
        { method: 'limit', args: [200] },
        { method: 'or', args: ['is_example.eq.true,verified_at.not.is.null'] },
      ]),
    );
  });

  // WHY: le rôle `authenticated` ne peut plus lire `whatsapp` (migration 20261029000200).
  it('ne sélectionne jamais le numéro', async () => {
    results.push({ data: [], error: null });
    await listPanelProviders(['sound']);
    expect(String(callsOf('select')[0]?.args[0])).not.toContain('whatsapp');
  });

  it('remonte une erreur de lecture', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    results.push({ data: null, error: { code: '42501', message: 'denied' } });
    const res = await listPanelProviders(['sound']);
    expect(res.error?.code).toBe('42501');
    log.mockRestore();
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
