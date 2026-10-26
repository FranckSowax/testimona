import { beforeEach, describe, expect, it, vi } from 'vitest';

interface Call {
  table: string;
  filters: [string, string, unknown][];
}

interface FakeQuery {
  select(): FakeQuery;
  eq(column: string, value: unknown): FakeQuery;
  in(column: string, values: unknown[]): FakeQuery;
  order(): FakeQuery;
  limit(): FakeQuery;
  returns(): Promise<{ data: unknown; error: { code: string } | null }>;
}

let calls: Call[];
let results: Record<string, { data: unknown; error: { code: string } | null }>;

vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase/admin', () => ({
  getSupabaseAdminClient: () => ({
    from(table: string): FakeQuery {
      const call: Call = { table, filters: [] };
      calls.push(call);
      const query: FakeQuery = {
        select: () => query,
        eq: (column, value) => {
          call.filters.push(['eq', column, value]);
          return query;
        },
        in: (column, values) => {
          call.filters.push(['in', column, values]);
          return query;
        },
        order: () => query,
        limit: () => query,
        returns: () => Promise.resolve(results[table] ?? { data: [], error: null }),
      };
      return query;
    },
  }),
}));

const { listOwnerShopContributions } = await import('./shop-contributions');

const OWNER = '11111111-1111-4111-8111-111111111111';

beforeEach(() => {
  calls = [];
  results = {
    Memorial: { data: [{ id: 'm1' }], error: null },
    MemorialShopItem: { data: [{ id: 'i1' }, { id: 'i2' }], error: null },
    ShopContribution: {
      data: [
        {
          shopItemId: 'i1',
          donorName: 'Marie',
          amountCents: 1000,
          createdAt: '2026-10-27T08:00:00Z',
        },
      ],
      error: null,
    },
  };
});

describe('listOwnerShopContributions', () => {
  it("ne lit que les mémoriaux de l'utilisateur, puis leurs articles", async () => {
    const rows = await listOwnerShopContributions(OWNER);
    expect(rows).toHaveLength(1);
    expect(calls.map((c) => c.table)).toEqual(['Memorial', 'MemorialShopItem', 'ShopContribution']);
    expect(calls[0]?.filters).toContainEqual(['eq', 'ownerId', OWNER]);
    expect(calls[1]?.filters).toContainEqual(['in', 'memorialId', ['m1']]);
    expect(calls[2]?.filters).toContainEqual(['in', 'shopItemId', ['i1', 'i2']]);
    expect(calls[2]?.filters).toContainEqual(['eq', 'status', 'Succeeded']);
  });

  it("renvoie une liste vide sans interroger les contributions si l'utilisateur n'a aucun mémorial", async () => {
    results.Memorial = { data: [], error: null };
    expect(await listOwnerShopContributions(OWNER)).toEqual([]);
    expect(calls.map((c) => c.table)).toEqual(['Memorial']);
  });

  it('renvoie une liste vide et journalise en cas d’erreur', async () => {
    results.ShopContribution = { data: null, error: { code: '42501' } };
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await listOwnerShopContributions(OWNER)).toEqual([]);
    expect(log).toHaveBeenCalledWith('[shop-contributions] lecture impossible', { code: '42501' });
    log.mockRestore();
  });
});
