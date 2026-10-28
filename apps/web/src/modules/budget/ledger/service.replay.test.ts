import { beforeEach, describe, expect, it, vi } from 'vitest';

// WHY: ce test garde les vrais dépôts (registre et reçus) pour vérifier que renvoyer le formulaire
// après « receipt_unlinked » passe par la relecture du double envoi d'insertEntry, puis retente le
// rattachement sur la dépense existante. Chaque appel terminal (single, maybeSingle, returns)
// consomme la réponse suivante de la file ; les autres méthodes renvoient la chaîne elle-même.
const { results, calls, dossierRepo } = vi.hoisted(() => ({
  results: [] as unknown[],
  calls: [] as { method: string; args: unknown[] }[],
  dossierRepo: { getDossier: vi.fn() },
}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase/server', () => {
  const next = () => Promise.resolve(results.shift());
  const chain: Record<string, (...args: unknown[]) => unknown> = {};
  for (const method of ['from', 'select', 'insert', 'update', 'eq']) {
    chain[method] = (...args: unknown[]) => {
      calls.push({ method, args });
      return chain;
    };
  }
  chain.returns = () => next();
  chain.single = () => next();
  chain.maybeSingle = () => next();
  return { getSupabaseServer: async () => chain };
});
vi.mock('@/modules/dossier/repo', () => dossierRepo);
vi.mock('@/lib/email/resend', () => ({ sendEmail: vi.fn(), dossierInviteEmail: vi.fn() }));

const { recordExpense } = await import('./service');

const DOSSIER = '44444444-4444-4444-8444-444444444444';
const KEY = '55555555-5555-4555-8555-555555555555';
const RECEIPT = '77777777-7777-4777-8777-777777777777';
const expense = {
  dossierId: DOSSIER,
  idempotencyKey: KEY,
  partyName: 'Pompes funèbres',
  amount: '50000',
  note: '',
  occurredOn: '2026-10-20',
  method: 'cash',
  budgetLineId: '',
  receiptId: RECEIPT,
};
const duplicate = { data: null, error: { code: '23505', message: 'duplicate key' } };
const existing = {
  data: {
    id: 'e1',
    kind: 'expense',
    amount: 50_000,
    method: 'cash',
    party_name: 'Pompes funèbres',
    budget_line_id: null,
    note: '',
    occurred_on: '2026-10-20',
    reverses_id: null,
  },
  error: null,
};
const attachCalls = () => calls.filter((c) => c.method === 'update').map((c) => c.args[0]);

beforeEach(() => {
  vi.clearAllMocks();
  results.length = 0;
  calls.length = 0;
  dossierRepo.getDossier.mockResolvedValue({ id: DOSSIER, entryPoint: 'death' });
});

describe('recordExpense : renvoi après un reçu non joint', () => {
  it('rejoue la clé, retrouve la dépense et retente le rattachement', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    // Premier envoi : la dépense est créée, la photo manque encore au stockage (TL006).
    results.push(
      { data: { id: 'e1' }, error: null },
      { data: null, error: { code: 'TL006', message: 'receipt photo missing' } },
    );
    expect(await recordExpense(expense)).toEqual({ ok: false, error: 'receipt_unlinked' });

    // Second envoi, même clé : 23505, relecture de la ligne existante, rattachement réussi.
    results.push(duplicate, existing, { data: [{ id: RECEIPT }], error: null });
    expect(await recordExpense(expense)).toEqual({ ok: true, data: { id: 'e1' } });

    expect(calls.filter((c) => c.method === 'insert')).toHaveLength(2);
    expect(attachCalls()).toEqual([{ entry_id: 'e1' }, { entry_id: 'e1' }]);
    expect(calls).toContainEqual({ method: 'eq', args: ['id', RECEIPT] });
    expect(results).toHaveLength(0);
    spy.mockRestore();
  });

  it('accepte un double envoi dont le rattachement avait déjà réussi', async () => {
    // WHY: la base rend le rattachement identique sans effet ; la ligne est renvoyée.
    results.push(duplicate, existing, { data: [{ id: RECEIPT }], error: null });
    expect(await recordExpense(expense)).toEqual({ ok: true, data: { id: 'e1' } });
    expect(attachCalls()).toEqual([{ entry_id: 'e1' }]);
  });

  it('refuse un renvoi de même clé et même montant pour un autre fournisseur', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    results.push(duplicate, existing);
    expect(await recordExpense({ ...expense, partyName: 'Menuiserie Obame' })).toEqual({
      ok: false,
      error: 'changed_since_saved',
    });
    expect(attachCalls()).toEqual([]);
    spy.mockRestore();
  });

  it('ne rattache rien si la clé est rejouée pour un autre montant', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    results.push(duplicate, existing);
    expect(await recordExpense({ ...expense, amount: '60000' })).toEqual({
      ok: false,
      error: 'changed_since_saved',
    });
    expect(attachCalls()).toEqual([]);
    expect(spy).toHaveBeenCalledWith('[budget/ledger] recordExpense failed', {
      code: 'idempotency_mismatch',
    });
    spy.mockRestore();
  });
});
