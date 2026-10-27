import { beforeEach, describe, expect, it, vi } from 'vitest';

// WHY: doublure minimale du client Supabase. Chaque appel terminal (single, maybeSingle, rpc)
// consomme la réponse suivante de la file ; les autres méthodes renvoient la chaîne elle-même.
const { results, calls } = vi.hoisted(() => ({
  results: [] as unknown[],
  calls: [] as { method: string; args: unknown[] }[],
}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase/server', () => {
  const next = () => Promise.resolve(results.shift());
  const chain: Record<string, (...args: unknown[]) => unknown> = {};
  for (const method of ['from', 'select', 'insert', 'eq', 'order', 'limit']) {
    chain[method] = (...args: unknown[]) => {
      calls.push({ method, args });
      return chain;
    };
  }
  chain.returns = () => next();
  chain.single = () => next();
  chain.maybeSingle = () => next();
  chain.upsert = (...args: unknown[]) => {
    calls.push({ method: 'upsert', args });
    return next();
  };
  chain.rpc = (...args: unknown[]) => {
    calls.push({ method: 'rpc', args });
    return next();
  };
  return { getSupabaseServer: async () => chain };
});

const { getTotals, getVisibility, insertEntry, setVisibility } = await import('./repo');
import type { NewEntry } from './repo';

const DOSSIER = '44444444-4444-4444-8444-444444444444';
const KEY = '55555555-5555-4555-8555-555555555555';
const entry: NewEntry = {
  dossierId: DOSSIER,
  kind: 'receipt',
  amount: 50_000,
  method: 'cash',
  partyName: 'Oncle Paul',
  memberId: null,
  pledgeId: null,
  note: '',
  occurredOn: '2026-10-20',
  reversesId: null,
  idempotencyKey: KEY,
};
const duplicate = { data: null, error: { code: '23505', message: 'duplicate key' } };

beforeEach(() => {
  results.length = 0;
  calls.length = 0;
});

describe('insertEntry', () => {
  it('insère la ligne avec les colonnes de la base', async () => {
    results.push({ data: { id: 'e1' }, error: null });
    expect(await insertEntry(entry)).toEqual({ data: { id: 'e1', duplicate: false }, error: null });
    expect(calls.find((c) => c.method === 'insert')?.args[0]).toMatchObject({
      dossier_id: DOSSIER,
      kind: 'receipt',
      amount: 50_000,
      idempotency_key: KEY,
    });
  });

  it('renvoie la ligne existante pour un double envoi identique', async () => {
    results.push(duplicate, { data: { id: 'e0', kind: 'receipt', amount: 50_000 }, error: null });
    expect(await insertEntry(entry)).toEqual({ data: { id: 'e0', duplicate: true }, error: null });
  });

  it('ne compare que le type pour une annulation', async () => {
    results.push(duplicate, { data: { id: 'e0', kind: 'reversal', amount: 7_000 }, error: null });
    expect(await insertEntry({ ...entry, kind: 'reversal', amount: 1 })).toEqual({
      data: { id: 'e0', duplicate: true },
      error: null,
    });
  });

  it('signale une clé réutilisée pour une autre saisie', async () => {
    results.push(duplicate, { data: { id: 'e0', kind: 'receipt', amount: 1_000 }, error: null });
    expect(await insertEntry(entry)).toMatchObject({
      data: null,
      error: { code: 'idempotency_mismatch' },
    });
    results.push(duplicate, { data: { id: 'e0', kind: 'expense', amount: 50_000 }, error: null });
    expect(await insertEntry(entry)).toMatchObject({ error: { code: 'idempotency_mismatch' } });
  });

  it('rend l’erreur d’origine si la ligne existante est introuvable', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    results.push(duplicate, { data: null, error: null });
    expect(await insertEntry(entry)).toEqual(duplicate);
    results.push(duplicate, { data: null, error: { code: '42501', message: 'x' } });
    expect(await insertEntry(entry)).toEqual(duplicate);
    expect(error).toHaveBeenCalledTimes(1);
    error.mockRestore();
  });
});

describe('getTotals', () => {
  it('convertit les bigint reçus en chaînes, que la réponse soit un tableau ou un objet', async () => {
    results.push({ data: [{ received: '120000', pledged_open: '30000', spent: '45000' }] });
    expect(await getTotals(DOSSIER)).toEqual({
      data: { received: 120_000, pledgedOpen: 30_000, spent: 45_000 },
      error: null,
    });
    expect(calls.at(-1)).toEqual({
      method: 'rpc',
      args: ['ledger_totals', { p_dossier_id: DOSSIER }],
    });
    results.push({ data: { received: '5', pledged_open: 0, spent: '2' }, error: null });
    expect(await getTotals(DOSSIER)).toEqual({
      data: { received: 5, pledgedOpen: 0, spent: 2 },
      error: null,
    });
  });
});

describe('visibilité', () => {
  it('vaut restricted tant que rien n’est réglé', async () => {
    results.push({ data: null, error: null });
    expect(await getVisibility(DOSSIER)).toEqual({ data: 'restricted', error: null });
  });

  it('n’envoie pas updated_at, laissé à la base', async () => {
    results.push({ error: null });
    expect(await setVisibility(DOSSIER, 'members')).toEqual({ data: true, error: null });
    expect(calls.find((c) => c.method === 'upsert')?.args[0]).toEqual({
      dossier_id: DOSSIER,
      amounts_visibility: 'members',
    });
  });
});
