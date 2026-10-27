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

const { getTotals, getVisibility, insertEntry, listEntries, setVisibility } =
  await import('./repo');
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
  budgetLineId: null,
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

  it('compare la ligne visée et non le montant pour une annulation', async () => {
    const reversal = { ...entry, kind: 'reversal' as const, amount: 1, reversesId: 'target' };
    results.push(duplicate, {
      data: { id: 'e0', kind: 'reversal', amount: 7_000, reverses_id: 'target' },
      error: null,
    });
    expect(await insertEntry(reversal)).toEqual({
      data: { id: 'e0', duplicate: true },
      error: null,
    });
    results.push(duplicate, {
      data: { id: 'e0', kind: 'reversal', amount: 1, reverses_id: 'other' },
      error: null,
    });
    expect(await insertEntry(reversal)).toMatchObject({
      data: null,
      error: { code: 'idempotency_mismatch' },
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

describe('poste d’une dépense', () => {
  const LINE = '77777777-7777-4777-8777-777777777777';

  it('envoie budget_line_id à l’insertion', async () => {
    results.push({ data: { id: 'e1' }, error: null });
    await insertEntry({ ...entry, kind: 'expense', budgetLineId: LINE });
    expect(calls.find((c) => c.method === 'insert')?.args[0]).toMatchObject({
      kind: 'expense',
      budget_line_id: LINE,
    });
  });

  it('relit budget_line_id dans les lignes du registre', async () => {
    results.push({
      data: [
        {
          id: 'e1',
          kind: 'expense',
          amount: 50_000,
          method: 'cash',
          party_name: 'Traiteur',
          member_id: null,
          pledge_id: null,
          budget_line_id: LINE,
          note: '',
          occurred_on: '2026-10-20',
          reverses_id: null,
          reverses_kind: null,
          created_at: '2026-10-20T10:00:00Z',
        },
      ],
      error: null,
    });
    const res = await listEntries(DOSSIER);
    expect(res.data?.[0]).toMatchObject({ id: 'e1', budgetLineId: LINE, partyName: 'Traiteur' });
    expect(String(calls.find((c) => c.method === 'select')?.args[0])).toContain('budget_line_id');
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
