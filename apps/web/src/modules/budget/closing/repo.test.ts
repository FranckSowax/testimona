import { beforeEach, describe, expect, it, vi } from 'vitest';

// WHY: doublure minimale du client Supabase, comme lines/repo.test.ts. Chaque requête (from ou
// rpc) consomme la réponse suivante de la file ; les méthodes de la requête renvoient la requête.
const { results, calls } = vi.hoisted(() => ({
  results: [] as unknown[],
  calls: [] as { method: string; args: unknown[] }[],
}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase/server', () => {
  const next = () => Promise.resolve(results.shift());
  const query = () => {
    const q: Record<string, unknown> = {};
    for (const method of ['select', 'eq', 'order', 'range']) {
      q[method] = (...args: unknown[]) => {
        calls.push({ method, args });
        return q;
      };
    }
    q.returns = () => next();
    q.maybeSingle = () => next();
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

const { EXPORT_MAX_ROWS, closeLedger, getClosure, listExportRows, reopenLedger } =
  await import('./repo');

const DOSSIER = '44444444-4444-4444-8444-444444444444';
const callsOf = (method: string) => calls.filter((c) => c.method === method);

const dbRow = (id: string) => ({
  id,
  kind: 'receipt',
  amount: '10000',
  method: 'cash',
  party_name: 'Oncle Paul',
  budget_line_id: null,
  note: '',
  occurred_on: '2026-10-20',
  reverses_id: null,
  pledge_id: null,
  created_at: '2026-10-20T10:00:00Z',
});

beforeEach(() => {
  results.length = 0;
  calls.length = 0;
});

describe('getClosure', () => {
  it('lit la date de clôture, ou null sans réglage', async () => {
    results.push({ data: { closed_at: '2026-10-28T09:00:00Z' }, error: null });
    expect(await getClosure(DOSSIER)).toEqual({
      data: { closedAt: '2026-10-28T09:00:00Z' },
      error: null,
    });
    expect(callsOf('from')[0]!.args).toEqual(['dossier_finance']);
    expect(callsOf('select')[0]!.args).toEqual(['closed_at']);
    expect(callsOf('eq')[0]!.args).toEqual(['dossier_id', DOSSIER]);
    results.push({ data: null, error: null });
    expect(await getClosure(DOSSIER)).toEqual({ data: { closedAt: null }, error: null });
  });

  it('rend et journalise l’erreur de la base', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    results.push({ data: null, error: { code: '42501', message: 'denied' } });
    expect(await getClosure(DOSSIER)).toEqual({
      data: null,
      error: { code: '42501', message: 'denied' },
    });
    expect(spy).toHaveBeenCalledWith('[budget/closing] getClosure impossible', { code: '42501' });
    spy.mockRestore();
  });
});

describe('closeLedger et reopenLedger', () => {
  it('appellent les fonctions de la base', async () => {
    results.push({ data: '2026-10-28T09:00:00Z', error: null }, { data: null, error: null });
    expect(await closeLedger(DOSSIER)).toEqual({ data: '2026-10-28T09:00:00Z', error: null });
    expect(await reopenLedger(DOSSIER)).toEqual({ data: true, error: null });
    expect(callsOf('rpc').map((c) => c.args)).toEqual([
      ['close_ledger', { p_dossier_id: DOSSIER }],
      ['reopen_ledger', { p_dossier_id: DOSSIER }],
    ]);
  });

  it('rendent le refus de la base, complété s’il manque', async () => {
    results.push(
      { data: null, error: { code: '42501', message: 'denied' } },
      { data: null, error: {} },
    );
    expect(await closeLedger(DOSSIER)).toEqual({
      data: null,
      error: { code: '42501', message: 'denied' },
    });
    expect(await reopenLedger(DOSSIER)).toEqual({
      data: null,
      error: { code: 'unknown', message: 'closing error' },
    });
  });
});

describe('closeLedger, réponse inattendue', () => {
  it('refuse une réponse qui n’est pas une date', async () => {
    results.push({ data: null, error: null });
    expect(await closeLedger(DOSSIER)).toEqual({
      data: null,
      error: { code: 'unknown', message: 'closing error' },
    });
  });
});

describe('listExportRows', () => {
  it('lit les lignes par pages de 1 000 et les convertit', async () => {
    const page = Array.from({ length: 1000 }, (_, i) => dbRow(`e${i}`));
    results.push({ data: page, error: null }, { data: [dbRow('last')], error: null });
    const res = await listExportRows(DOSSIER);
    expect(res.data).toHaveLength(1001);
    expect(res.data?.[1000]).toEqual({
      id: 'last',
      kind: 'receipt',
      amount: 10_000,
      method: 'cash',
      partyName: 'Oncle Paul',
      budgetLineId: null,
      note: '',
      occurredOn: '2026-10-20',
      reversesId: null,
      pledgeId: null,
      createdAt: '2026-10-20T10:00:00Z',
    });
    expect(callsOf('range').map((c) => c.args)).toEqual([
      [0, 999],
      [1000, 1999],
    ]);
    expect(callsOf('from')[0]!.args).toEqual(['ledger_entry']);
    expect(callsOf('eq')[0]!.args).toEqual(['dossier_id', DOSSIER]);
    expect(callsOf('order').map((c) => c.args)).toEqual([
      ['created_at', { ascending: true }],
      ['id', { ascending: true }],
      ['created_at', { ascending: true }],
      ['id', { ascending: true }],
    ]);
  });

  it('trie la sortie par date d’opération, puis création, puis id', async () => {
    const mk = (id: string, occurred_on: string, created_at: string) => ({
      ...dbRow(id),
      occurred_on,
      created_at,
    });
    results.push({
      data: [
        mk('a', '2026-10-22', '2026-10-20T10:00:00Z'),
        mk('c', '2026-10-21', '2026-10-21T10:00:00Z'),
        mk('b', '2026-10-21', '2026-10-21T10:00:00Z'),
        mk('d', '2026-10-21', '2026-10-20T09:00:00Z'),
      ],
      error: null,
    });
    const res = await listExportRows(DOSSIER);
    expect(res.data?.map((r) => r.id)).toEqual(['d', 'b', 'c', 'a']);
  });

  it('rend une liste vide pour un registre vide ou une réponse nulle', async () => {
    results.push({ data: [], error: null }, { data: null, error: null });
    expect(await listExportRows(DOSSIER)).toEqual({ data: [], error: null });
    expect(await listExportRows(DOSSIER)).toEqual({ data: [], error: null });
  });

  it('accepte un registre d’exactement 50 000 lignes', async () => {
    const page = Array.from({ length: 1000 }, (_, i) => dbRow(`e${i}`));
    for (let i = 0; i < EXPORT_MAX_ROWS / 1000; i += 1) results.push({ data: page, error: null });
    results.push({ data: [], error: null });
    const res = await listExportRows(DOSSIER);
    expect(res.data).toHaveLength(EXPORT_MAX_ROWS);
    expect(callsOf('range')).toHaveLength(51);
  });

  it('refuse un registre trop grand plutôt que de le tronquer', async () => {
    const page = Array.from({ length: 1000 }, (_, i) => dbRow(`e${i}`));
    for (let i = 0; i < EXPORT_MAX_ROWS / 1000; i += 1) results.push({ data: page, error: null });
    results.push({ data: [dbRow('extra')], error: null });
    expect(await listExportRows(DOSSIER)).toEqual({
      data: null,
      error: { code: 'too_large', message: 'ledger too large to export' },
    });
  });

  it('rend et journalise l’erreur d’une page', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    results.push({ data: null, error: { code: '42501', message: 'denied' } });
    expect(await listExportRows(DOSSIER)).toEqual({
      data: null,
      error: { code: '42501', message: 'denied' },
    });
    expect(spy).toHaveBeenCalledWith('[budget/closing] listExportRows impossible', {
      code: '42501',
    });
    spy.mockRestore();
  });
});
