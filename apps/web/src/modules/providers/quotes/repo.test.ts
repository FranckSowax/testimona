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

const { insertQuoteRequest, listQuoteRequests } = await import('./repo');

const DOSSIER = '11111111-1111-4111-8111-111111111111';
const PROVIDER = '22222222-2222-4222-8222-222222222222';

beforeEach(() => {
  results.length = 0;
  calls.length = 0;
});

describe('insertQuoteRequest', () => {
  it('insère la demande sans auteur ni date (imposés par la base)', async () => {
    results.push({ data: { id: 'q1' }, error: null });
    const res = await insertQuoteRequest({
      dossierId: DOSSIER,
      providerId: PROVIDER,
      stepId: 'vigil-setup',
      message: 'Bonjour',
    });
    expect(res).toEqual({ data: { id: 'q1' }, error: null });
    expect(calls).toContainEqual({ method: 'from', args: ['quote_request'] });
    expect(calls).toContainEqual({
      method: 'insert',
      args: [
        { dossier_id: DOSSIER, provider_id: PROVIDER, step_id: 'vigil-setup', message: 'Bonjour' },
      ],
    });
  });

  it('remonte le code de la base', async () => {
    results.push({ data: null, error: { code: 'TL010', message: 'provider not reachable' } });
    const res = await insertQuoteRequest({
      dossierId: DOSSIER,
      providerId: PROVIDER,
      stepId: 'vigil-setup',
      message: 'Bonjour',
    });
    expect(res.error?.code).toBe('TL010');
  });
});

describe('listQuoteRequests', () => {
  it('lit les demandes de l’étape, les plus récentes d’abord', async () => {
    results.push({
      data: [
        {
          id: 'q1',
          provider_name: 'Tentes Owendo',
          created_by: 'u1',
          created_at: '2026-10-29T10:00:00Z',
        },
      ],
      error: null,
    });
    const res = await listQuoteRequests(DOSSIER, 'vigil-setup');
    expect(res.data).toEqual([
      {
        id: 'q1',
        providerName: 'Tentes Owendo',
        createdBy: 'u1',
        createdAt: '2026-10-29T10:00:00Z',
      },
    ]);
    expect(calls).toContainEqual({ method: 'eq', args: ['dossier_id', DOSSIER] });
    expect(calls).toContainEqual({ method: 'eq', args: ['step_id', 'vigil-setup'] });
    expect(calls).toContainEqual({ method: 'order', args: ['created_at', { ascending: false }] });
  });
});
