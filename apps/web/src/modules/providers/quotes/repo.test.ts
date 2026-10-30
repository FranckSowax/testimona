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
    rpc: (...args: unknown[]) => {
      calls.push({ method: 'rpc', args });
      return next();
    },
  };
  return { getSupabaseServer: async () => db };
});

const { listQuoteRequests, requestQuoteRpc } = await import('./repo');

const DOSSIER = '11111111-1111-4111-8111-111111111111';
const PROVIDER = '22222222-2222-4222-8222-222222222222';

beforeEach(() => {
  results.length = 0;
  calls.length = 0;
});

describe('requestQuoteRpc', () => {
  const request = {
    dossierId: DOSSIER,
    providerId: PROVIDER,
    stepId: 'vigil-setup' as const,
    message: 'Bonjour',
  };

  it('appelle request_quote, sans auteur ni date (imposés par la base), et rend le numéro', async () => {
    results.push({ data: '+24177123456', error: null });
    expect(await requestQuoteRpc(request)).toEqual({
      data: { whatsapp: '+24177123456' },
      error: null,
    });
    expect(calls).toEqual([
      {
        method: 'rpc',
        args: [
          'request_quote',
          {
            p_dossier_id: DOSSIER,
            p_provider_id: PROVIDER,
            p_step_id: 'vigil-setup',
            p_message: 'Bonjour',
          },
        ],
      },
    ]);
  });

  it('remonte le code de la base', async () => {
    results.push({ data: null, error: { code: 'TL010', message: 'provider not reachable' } });
    expect((await requestQuoteRpc(request)).error?.code).toBe('TL010');
  });

  it('signale une réponse sans numéro', async () => {
    results.push({ data: null, error: null });
    expect((await requestQuoteRpc(request)).error?.code).toBe('no_number');
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
