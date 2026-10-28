import { beforeEach, describe, expect, it, vi } from 'vitest';

// WHY: doublure minimale du client Supabase. Chaque requête (from ou rpc) consomme la réponse
// suivante de la file quand elle est attendue ; les méthodes de la requête renvoient la requête.
// Le client lui-même n'est pas « thenable », sinon `await getSupabaseServer()` le résoudrait.
const { results, calls } = vi.hoisted(() => ({
  results: [] as unknown[],
  calls: [] as { method: string; args: unknown[] }[],
}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase/server', () => {
  const next = () => Promise.resolve(results.shift());
  const query = () => {
    const q: Record<string, unknown> = {};
    for (const method of ['select', 'insert', 'update', 'upsert', 'delete', 'eq', 'order']) {
      q[method] = (...args: unknown[]) => {
        calls.push({ method, args });
        return q;
      };
    }
    q.returns = () => next();
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
    rpc: (...args: unknown[]) => {
      calls.push({ method: 'rpc', args });
      return next();
    },
  };
  return { getSupabaseServer: async () => db };
});

const {
  deleteLine,
  getScenario,
  insertGridRows,
  insertLine,
  listLines,
  setScenario,
  spentByLine,
  updateLine,
  updateRecomputed,
} = await import('./repo');

const DOSSIER = '44444444-4444-4444-8444-444444444444';
const LINE = '55555555-5555-4555-8555-555555555555';
const amounts = { sober: 1_000, intermediate: 2_000, full: 3_000 };

const callsOf = (method: string) => calls.filter((c) => c.method === method);

beforeEach(() => {
  results.length = 0;
  calls.length = 0;
});

describe('chemins d’erreur', () => {
  it('listLines, insertGridRows et getScenario rendent l’erreur de la base', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const denied = { data: null, error: { code: '42501', message: 'denied' } };
    results.push(denied, { error: { code: '23514', message: 'limit' } }, denied);
    expect(await listLines(DOSSIER)).toEqual(denied);
    expect(
      await insertGridRows(DOSSIER, [{ gridKey: 'coffin', label: 'C', amounts, position: 0 }]),
    ).toEqual({ data: null, error: { code: '23514', message: 'limit' } });
    expect(await getScenario(DOSSIER)).toEqual(denied);
    error.mockRestore();
  });

  it('complète une erreur sans code ni message', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    results.push({ data: null, error: {} });
    expect(await listLines(DOSSIER)).toEqual({
      data: null,
      error: { code: 'unknown', message: 'budget lines error' },
    });
    error.mockRestore();
  });
});

describe('insertLine', () => {
  it('ajoute un poste libre marqué modifié', async () => {
    results.push({ error: null });
    expect(await insertLine(DOSSIER, { label: 'Fleurs', amounts, position: 3 })).toEqual({
      data: true,
      error: null,
    });
    expect(callsOf('insert')[0]?.args[0]).toEqual({
      dossier_id: DOSSIER,
      grid_key: null,
      label: 'Fleurs',
      position: 3,
      edited: true,
      amount_sober: 1_000,
      amount_intermediate: 2_000,
      amount_full: 3_000,
    });
  });

  it('rend l’erreur de la base', async () => {
    results.push({ error: { code: '23514', message: 'limit' } });
    expect(await insertLine(DOSSIER, { label: 'Fleurs', amounts, position: 3 })).toEqual({
      data: null,
      error: { code: '23514', message: 'limit' },
    });
  });
});

describe('listLines', () => {
  it('convertit les colonnes amount_* en montants par niveau', async () => {
    results.push({
      data: [
        {
          id: 'a',
          grid_key: 'coffin',
          label: 'Cercueil',
          amount_sober: 1,
          amount_intermediate: 2,
          amount_full: 3,
          edited: false,
          position: 1,
        },
      ],
      error: null,
    });
    expect(await listLines(DOSSIER)).toEqual({
      data: [
        {
          id: 'a',
          gridKey: 'coffin',
          label: 'Cercueil',
          amounts: { sober: 1, intermediate: 2, full: 3 },
          edited: false,
          position: 1,
        },
      ],
      error: null,
    });
    expect(callsOf('eq')[0]?.args).toEqual(['dossier_id', DOSSIER]);
  });
});

describe('insertGridRows', () => {
  it('ignore les postes déjà présents et envoie les colonnes de la base', async () => {
    results.push({ error: null });
    const res = await insertGridRows(DOSSIER, [
      { gridKey: 'coffin', label: 'Cercueil', amounts, position: 1 },
    ]);
    expect(res).toEqual({ data: true, error: null });
    expect(callsOf('upsert')[0]?.args).toEqual([
      [
        {
          dossier_id: DOSSIER,
          grid_key: 'coffin',
          label: 'Cercueil',
          position: 1,
          amount_sober: 1_000,
          amount_intermediate: 2_000,
          amount_full: 3_000,
        },
      ],
      { onConflict: 'dossier_id,grid_key', ignoreDuplicates: true },
    ]);
  });
});

describe('updateRecomputed', () => {
  it('ne met à jour que des postes toujours non modifiés', async () => {
    results.push({ error: null }, { error: null });
    const res = await updateRecomputed(DOSSIER, [
      { id: 'a', amounts },
      { id: 'b', amounts },
    ]);
    expect(res).toEqual({ data: true, error: null });
    expect(callsOf('update')).toHaveLength(2);
    expect(callsOf('eq').filter((c) => c.args[0] === 'edited')).toEqual([
      { method: 'eq', args: ['edited', false] },
      { method: 'eq', args: ['edited', false] },
    ]);
  });

  it('rend la première erreur', async () => {
    results.push({ error: null }, { error: { code: '42501', message: 'denied' } });
    expect(
      await updateRecomputed(DOSSIER, [
        { id: 'a', amounts },
        { id: 'b', amounts },
      ]),
    ).toEqual({ data: null, error: { code: '42501', message: 'denied' } });
  });
});

describe('updateLine et deleteLine', () => {
  it('marque le poste modifié', async () => {
    results.push({ data: [{ id: LINE }], error: null });
    const res = await updateLine(DOSSIER, LINE, { label: 'Cercueil', amounts });
    expect(res).toEqual({ data: true, error: null });
    expect(callsOf('update')[0]?.args[0]).toEqual({
      label: 'Cercueil',
      edited: true,
      amount_sober: 1_000,
      amount_intermediate: 2_000,
      amount_full: 3_000,
    });
  });

  it('signalent no_rows quand aucune ligne ne revient', async () => {
    results.push({ data: [], error: null }, { data: [], error: null });
    expect(await updateLine(DOSSIER, LINE, { label: 'X', amounts })).toMatchObject({
      data: null,
      error: { code: 'no_rows' },
    });
    expect(await deleteLine(DOSSIER, LINE)).toMatchObject({
      data: null,
      error: { code: 'no_rows' },
    });
  });

  it('rend l’erreur de la base pour un poste qui porte des dépenses', async () => {
    results.push({ data: null, error: { code: '23503', message: 'fk' } });
    expect(await deleteLine(DOSSIER, LINE)).toEqual({
      data: null,
      error: { code: '23503', message: 'fk' },
    });
  });
});

describe('scénario', () => {
  it('vaut null pour une valeur absente ou inconnue', async () => {
    results.push(
      { data: null, error: null },
      { data: { scenario: 'luxe' }, error: null },
      { data: { scenario: 'full' }, error: null },
    );
    expect(await getScenario(DOSSIER)).toEqual({ data: null, error: null });
    expect(await getScenario(DOSSIER)).toEqual({ data: null, error: null });
    expect(await getScenario(DOSSIER)).toEqual({ data: 'full', error: null });
  });

  it('passe par la fonction set_budget_scenario', async () => {
    results.push({ error: null });
    expect(await setScenario(DOSSIER, null)).toEqual({ data: true, error: null });
    expect(callsOf('rpc')[0]?.args).toEqual([
      'set_budget_scenario',
      { p_dossier_id: DOSSIER, p_scenario: null },
    ]);
  });
});

describe('spentByLine', () => {
  it('range les dépenses sans poste sous la clé vide et convertit les bigint', async () => {
    results.push({
      data: [
        { budget_line_id: LINE, spent: '45000' },
        { budget_line_id: null, spent: 12 },
      ],
      error: null,
    });
    const res = await spentByLine(DOSSIER);
    expect(res.error).toBeNull();
    expect([...(res.data ?? [])]).toEqual([
      [LINE, 45_000],
      ['', 12],
    ]);
    expect(callsOf('rpc')[0]?.args).toEqual(['ledger_spent_by_line', { p_dossier_id: DOSSIER }]);
  });
});
