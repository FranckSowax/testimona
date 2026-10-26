import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { asRole, createTestDb, listMigrations } from './helpers/db';

let db: PGlite;

beforeAll(async () => {
  db = await createTestDb();
});

afterAll(async () => {
  await db?.close();
});

describe('chaîne de migrations', () => {
  it('nomme chaque migration avec un horodatage unique', () => {
    const files = listMigrations();
    const stamps = files.map((f) => f.split('_')[0]);
    expect(files.every((f) => /^\d{14}_[a-z0-9_]+\.sql$/.test(f))).toBe(true);
    expect(new Set(stamps).size).toBe(stamps.length);
  });

  it('active la RLS sur 100 % des tables du schéma public', async () => {
    const { rows } = await db.query<{ table: string }>(`
      select c.relname as table
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity
      order by 1
    `);
    expect(rows.map((r) => r.table)).toEqual([]);
  });

  it('refuse aux visiteurs anonymes toute écriture dans les tables financières', async () => {
    for (const table of ['CreditTransaction', 'UserCredit', 'Donation', 'StudiaBalance']) {
      const attempt = asRole(db, 'anon', null, () =>
        db.query(`insert into "${table}" default values`),
      );
      // 42501 = refus RLS, et non une contrainte NOT NULL qui masquerait l'absence de policy.
      await expect(attempt, table).rejects.toMatchObject({ code: '42501' });
    }
  });
});
