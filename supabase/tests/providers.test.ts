import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { asAdmin, asRole, asUser, createTestDb, createUser } from './helpers/db';

const DENIED = { code: '42501' };

let db: PGlite;
let admin: string;
let owner: string;
let coordinator: string;
let contributor: string;
let stranger: string;
let dossierId: string;
let verified: string;
let example: string;
let inactive: string;

async function insertProvider(fields: Record<string, unknown>) {
  const row = { category_key: 'tentsChairs', name: 'Tentes Akanda', city: 'Libreville', ...fields };
  const cols = Object.keys(row);
  const { rows } = await asAdmin(db, admin, () =>
    db.query<{ id: string }>(
      `insert into provider (${cols.join(', ')})
       values (${cols.map((_, i) => `$${i + 1}`).join(', ')}) returning id`,
      Object.values(row),
    ),
  );
  return rows[0]!.id;
}

const requestQuote = (userId: string, providerId: string) =>
  asUser(db, userId, () =>
    db.query<{ id: string; created_by: string | null }>(
      `insert into quote_request (dossier_id, provider_id, step_id, message, created_by)
       values ($1, $2, 'vigil-setup', 'Bonjour, une tente pour samedi.', $3)
       returning id, created_by`,
      [dossierId, providerId, owner],
    ),
  );

beforeAll(async () => {
  db = await createTestDb();
  admin = await createUser(db, 'admin@test.local');
  owner = await createUser(db, 'owner@test.local');
  coordinator = await createUser(db, 'coordinator@test.local');
  contributor = await createUser(db, 'contributor@test.local');
  stranger = await createUser(db, 'stranger@test.local');
  const { rows } = await asUser(db, owner, () =>
    db.query<{ id: string }>(
      `select public.create_dossier_with_person('death', 'Jean', 'Ndong', 'GA', 'Libreville', '') as id`,
    ),
  );
  dossierId = rows[0]!.id;
  for (const [user, role] of [
    [coordinator, 'coordinator'],
    [contributor, 'contributor'],
  ] as const) {
    await db.query(`insert into dossier_member (dossier_id, user_id, role) values ($1, $2, $3)`, [
      dossierId,
      user,
      role,
    ]);
  }
  verified = await insertProvider({ whatsapp: '+24177123456', verified_at: new Date() });
  example = await insertProvider({ name: 'Tentes de test', is_example: true });
  inactive = await insertProvider({ whatsapp: '+24166123456', active: false });
});

afterAll(async () => {
  await db?.close();
});

describe('provider_category', () => {
  it('liste les sept catégories dans l’ordre', async () => {
    const { rows } = await asUser(db, contributor, () =>
      db.query<{ key: string }>('select key from provider_category order by position'),
    );
    expect(rows.map((r) => r.key)).toEqual([
      'funeralHome',
      'tentsChairs',
      'sound',
      'lighting',
      'catering',
      'drinks',
      'printing',
    ]);
  });

  it('refuse toute écriture par l’API, même à un administrateur', async () => {
    await expect(
      asAdmin(db, admin, () =>
        db.query(`insert into provider_category (key, position) values ('flowers', 50)`),
      ),
    ).rejects.toMatchObject(DENIED);
  });
});

describe('provider', () => {
  it('contient dix prestataires d’exemple sans numéro ni vérification', async () => {
    const { rows } = await db.query<{ n: number; reachable: number }>(
      `select count(*)::int as n,
              count(*) filter (where whatsapp is not null or verified_at is not null)::int as reachable
       from provider where is_example and name like '%(exemple)'`,
    );
    expect(rows[0]).toEqual({ n: 10, reachable: 0 });
  });

  it('refuse un exemple avec un numéro ou une vérification', async () => {
    const check = { code: '23514' };
    await expect(
      insertProvider({ is_example: true, whatsapp: '+24177000000' }),
    ).rejects.toMatchObject(check);
    await expect(
      insertProvider({ is_example: true, verified_at: new Date() }),
    ).rejects.toMatchObject(check);
  });

  it('refuse un numéro qui n’est pas au format international', async () => {
    await expect(insertProvider({ whatsapp: '077123456' })).rejects.toMatchObject({
      code: '23514',
    });
  });

  it('montre à un connecté les seuls prestataires actifs', async () => {
    const { rows } = await asUser(db, contributor, () =>
      db.query<{ id: string }>('select id from provider where id = any($1)', [
        [verified, inactive],
      ]),
    );
    expect(rows.map((r) => r.id)).toEqual([verified]);
  });

  it('laisse un administrateur modifier un prestataire inactif', async () => {
    const { rows } = await asAdmin(db, admin, () =>
      db.query<{ name: string }>(
        `update provider set name = 'Tentes Owendo' where id = $1 returning name`,
        [inactive],
      ),
    );
    expect(rows).toEqual([{ name: 'Tentes Owendo' }]);
  });

  it('refuse l’écriture à un non-administrateur', async () => {
    await expect(
      asUser(db, owner, () =>
        db.query(
          `insert into provider (category_key, name, city) values ('sound', 'X', 'Libreville')`,
        ),
      ),
    ).rejects.toMatchObject(DENIED);
    const { rows } = await asUser(db, owner, () =>
      db.query(`update provider set name = 'Piraté' where id = $1 returning id`, [verified]),
    );
    expect(rows).toHaveLength(0);
  });

  it('interdit la suppression, même à un administrateur', async () => {
    await expect(
      asAdmin(db, admin, () => db.query('delete from provider where id = $1', [inactive])),
    ).rejects.toMatchObject(DENIED);
  });

  it('refuse tout accès anonyme', async () => {
    await expect(
      asRole(db, 'anon', null, () => db.query('select id from provider')),
    ).rejects.toMatchObject(DENIED);
  });
});

describe('quote_request', () => {
  it('laisse un coordinateur demander un devis et impose l’auteur', async () => {
    const { rows } = await requestQuote(coordinator, verified);
    expect(rows[0]!.created_by).toBe(coordinator);
  });

  it('refuse un prestataire d’exemple ou inactif (TL010)', async () => {
    for (const provider of [example, inactive]) {
      await expect(requestQuote(owner, provider)).rejects.toMatchObject({ code: 'TL010' });
    }
  });

  it('refuse un contributeur et un non-membre avant d’examiner le prestataire', async () => {
    for (const user of [contributor, stranger]) {
      await expect(requestQuote(user, example)).rejects.toMatchObject(DENIED);
    }
  });

  it('montre les demandes aux seuls membres du dossier', async () => {
    const count = (user: string) =>
      asUser(db, user, () =>
        db.query<{ n: number }>('select count(*)::int as n from quote_request'),
      ).then(({ rows }) => rows[0]!.n);
    expect(await count(contributor)).toBeGreaterThan(0);
    expect(await count(stranger)).toBe(0);
  });

  it('interdit la modification et la suppression', async () => {
    await expect(
      asUser(db, owner, () => db.query(`update quote_request set message = 'x'`)),
    ).rejects.toMatchObject(DENIED);
    await expect(
      asUser(db, owner, () => db.query('delete from quote_request')),
    ).rejects.toMatchObject(DENIED);
  });
});

describe('is_admin', () => {
  it('fixe le search_path sans changer la règle', async () => {
    const { rows } = await db.query<{ config: string[] }>(
      `select proconfig as config from pg_proc where proname = 'is_admin'`,
    );
    expect(rows[0]!.config).toContain('search_path=""');
    const isAdmin = (run: typeof asUser) =>
      run(db, admin, () => db.query<{ ok: boolean }>('select public.is_admin() as ok')).then(
        ({ rows: r }) => r[0]!.ok,
      );
    expect(await isAdmin(asAdmin)).toBe(true);
    expect(await isAdmin(asUser)).toBe(false);
  });
});
