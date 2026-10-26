import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { asRole, asUser, createTestDb, createUser } from './helpers/db';

let db: PGlite;
let visitor: string;

const DENIED = { code: '42501' };
const PERSONAL_COLUMNS = ['donorEmail', 'donorName', 'message', 'stripeSessionId', 'donorId'];

beforeAll(async () => {
  db = await createTestDb();
  const owner = await createUser(db, 'owner@test.local');
  visitor = await createUser(db, 'visitor@test.local');
  // Données créées en superutilisateur, comme le ferait le service-role.
  await db.query(
    `with m as (
       insert into "Memorial" (id, slug, "ownerId", firstname, lastname, "isPublic", "updatedAt")
       values (gen_random_uuid(), 'jean-ndong', $1, 'Jean', 'Ndong', true, now()) returning id
     ), i as (
       insert into "MemorialShopItem" ("memorialId", "productId", "targetQuantity", "unitPriceCents")
       select id, 'pagne', 10, 500 from m returning id
     )
     insert into "ShopContribution" ("shopItemId", "amountCents", "donorEmail", "donorName", message)
     select id, 1000, 'donateur@test.local', 'Marie', 'Courage à la famille' from i`,
    [owner],
  );
});

afterAll(async () => {
  await db?.close();
});

describe('ShopContribution : colonnes personnelles', () => {
  it('laisse le public lire les colonnes non personnelles', async () => {
    const { rows } = await asRole(db, 'anon', null, () =>
      db.query<{ amountCents: number }>(
        `select id, "shopItemId", "amountCents", status, "createdAt", "isAnonymous", "wantsItem"
         from "ShopContribution"`,
      ),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.amountCents).toBe(1000);
  });

  it.each(PERSONAL_COLUMNS)('refuse la colonne %s aux visiteurs anonymes', async (column) => {
    const attempt = asRole(db, 'anon', null, () =>
      db.query(`select "${column}" from "ShopContribution"`),
    );
    await expect(attempt).rejects.toMatchObject(DENIED);
  });

  it.each(PERSONAL_COLUMNS)('refuse la colonne %s aux utilisateurs connectés', async (column) => {
    const attempt = asUser(db, visitor, () =>
      db.query(`select "${column}" from "ShopContribution"`),
    );
    await expect(attempt).rejects.toMatchObject(DENIED);
  });

  it('refuse select * au public', async () => {
    const attempt = asRole(db, 'anon', null, () => db.query('select * from "ShopContribution"'));
    await expect(attempt).rejects.toMatchObject(DENIED);
  });

  it('garde toutes les colonnes côté serveur', async () => {
    const { rows } = await db.query<{ donorEmail: string }>(
      'select "donorEmail" from "ShopContribution"',
    );
    expect(rows[0]?.donorEmail).toBe('donateur@test.local');
  });
});
