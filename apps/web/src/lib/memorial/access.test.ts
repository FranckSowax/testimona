import { beforeEach, describe, expect, it, vi } from 'vitest';

interface QueryResult {
  data: unknown;
  error: null;
}

interface FakeQuery {
  select(): FakeQuery;
  eq(): FakeQuery;
  maybeSingle(): Promise<QueryResult>;
  returns(): Promise<QueryResult>;
}

// Données renvoyées par table ; le filtrage (statut « accepted ») est fait par
// la base, donc les fixtures ne contiennent que des membres acceptés.
const tables: Record<string, unknown> = {};

vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase/admin', () => ({
  getSupabaseAdminClient: () => ({
    from(table: string): FakeQuery {
      const result: QueryResult = { data: tables[table] ?? null, error: null };
      const query: FakeQuery = {
        select: () => query,
        eq: () => query,
        maybeSingle: () => Promise.resolve(result),
        returns: () => Promise.resolve(result),
      };
      return query;
    },
  }),
}));

const { canManageMemorial } = await import('./access');

const OWNER = '11111111-1111-4111-8111-111111111111';
const CO_OWNER = '22222222-2222-4222-8222-222222222222';
const STRANGER = '33333333-3333-4333-8333-333333333333';
const MEMORIAL = '44444444-4444-4444-8444-444444444444';

beforeEach(() => {
  tables.Memorial = { ownerId: OWNER };
  tables.MemorialMember = [{ userId: CO_OWNER }, { userId: null }];
});

describe('canManageMemorial', () => {
  it('refuse un visiteur non connecté', async () => {
    expect(await canManageMemorial(MEMORIAL, null)).toBe(false);
    expect(await canManageMemorial(MEMORIAL, undefined)).toBe(false);
  });

  it('autorise le propriétaire', async () => {
    expect(await canManageMemorial(MEMORIAL, OWNER)).toBe(true);
  });

  it('autorise un co-propriétaire accepté', async () => {
    expect(await canManageMemorial(MEMORIAL, CO_OWNER)).toBe(true);
  });

  it('refuse un inconnu', async () => {
    expect(await canManageMemorial(MEMORIAL, STRANGER)).toBe(false);
  });

  it('refuse tout le monde sauf les membres si le mémorial est introuvable', async () => {
    tables.Memorial = null;
    expect(await canManageMemorial(MEMORIAL, OWNER)).toBe(false);
    expect(await canManageMemorial(MEMORIAL, CO_OWNER)).toBe(true);
  });
});
