import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { asAdmin, asRole, asUser } from './helpers/db';
import { DENIED, createProviderFixture, type ProviderFixture } from './helpers/providers';

let f: ProviderFixture;
let verified: string;
let inactive: string;

beforeAll(async () => {
  f = await createProviderFixture();
  verified = await f.insertProvider({ whatsapp: '+24177123456', verified_at: new Date() });
  inactive = await f.insertProvider({ whatsapp: '+24166123456', active: false });
});

afterAll(async () => {
  await f?.db.close();
});

describe('provider_category', () => {
  it('liste les sept catégories dans l’ordre', async () => {
    const { rows } = await asUser(f.db, f.contributor, () =>
      f.db.query<{ key: string }>('select key from provider_category order by position'),
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
      asAdmin(f.db, f.admin, () =>
        f.db.query(`insert into provider_category (key, position) values ('flowers', 50)`),
      ),
    ).rejects.toMatchObject(DENIED);
  });
});

describe('provider', () => {
  it('contient dix prestataires d’exemple sans numéro ni vérification', async () => {
    const { rows } = await f.db.query<{ n: number; reachable: number }>(
      `select count(*)::int as n,
              count(*) filter (where whatsapp is not null or verified_at is not null)::int as reachable
       from provider where is_example and name like '%(exemple)'`,
    );
    expect(rows[0]).toEqual({ n: 10, reachable: 0 });
  });

  it('refuse un exemple avec un numéro ou une vérification', async () => {
    const check = { code: '23514' };
    await expect(
      f.insertProvider({ is_example: true, whatsapp: '+24177000000' }),
    ).rejects.toMatchObject(check);
    await expect(
      f.insertProvider({ is_example: true, verified_at: new Date() }),
    ).rejects.toMatchObject(check);
  });

  it('refuse un numéro qui n’est pas au format international', async () => {
    await expect(f.insertProvider({ whatsapp: '077123456' })).rejects.toMatchObject({
      code: '23514',
    });
  });

  it('montre à un connecté les seuls prestataires actifs', async () => {
    const { rows } = await asUser(f.db, f.contributor, () =>
      f.db.query<{ id: string }>('select id from provider where id = any($1)', [
        [verified, inactive],
      ]),
    );
    expect(rows.map((r) => r.id)).toEqual([verified]);
  });

  it('montre les prestataires inactifs à un administrateur', async () => {
    const { rows } = await asAdmin(f.db, f.admin, () =>
      f.db.query<{ id: string }>('select id from provider where id = $1', [inactive]),
    );
    expect(rows).toHaveLength(1);
  });

  it('laisse un administrateur modifier un prestataire inactif', async () => {
    const id = await f.insertProvider({ active: false });
    const { rows } = await asAdmin(f.db, f.admin, () =>
      f.db.query<{ name: string }>(
        `update provider set name = 'Tentes Owendo' where id = $1 returning name`,
        [id],
      ),
    );
    expect(rows).toEqual([{ name: 'Tentes Owendo' }]);
  });

  it('refuse l’écriture à un non-administrateur', async () => {
    await expect(
      asUser(f.db, f.owner, () =>
        f.db.query(
          `insert into provider (category_key, name, city) values ('sound', 'X', 'Libreville')`,
        ),
      ),
    ).rejects.toMatchObject(DENIED);
    const { rows } = await asUser(f.db, f.owner, () =>
      f.db.query(`update provider set name = 'Piraté' where id = $1 returning id`, [verified]),
    );
    expect(rows).toHaveLength(0);
  });

  it('interdit la suppression, même à un administrateur', async () => {
    await expect(
      asAdmin(f.db, f.admin, () => f.db.query('delete from provider where id = $1', [inactive])),
    ).rejects.toMatchObject(DENIED);
  });

  it('refuse tout accès anonyme', async () => {
    await expect(
      asRole(f.db, 'anon', null, () => f.db.query('select id from provider')),
    ).rejects.toMatchObject(DENIED);
  });

  it('fige id et created_at à la modification et met updated_at à jour', async () => {
    const id = await f.insertProvider({ name: 'Sono Glass' });
    const read = () =>
      f.db.query<{ id: string; created_at: string; updated_at: string }>(
        'select id, created_at::text, updated_at::text from provider where name = $1',
        ['Sono Glass'],
      );
    const before = (await read()).rows[0]!;
    await asAdmin(f.db, f.admin, () =>
      f.db.query(
        `update provider
         set id = gen_random_uuid(), created_at = '2000-01-01T00:00:00Z', updated_at = '2000-01-01T00:00:00Z'
         where id = $1`,
        [id],
      ),
    );
    const after = (await read()).rows[0]!;
    expect(after.id).toBe(id);
    expect(after.created_at).toBe(before.created_at);
    // WHY: comparaison en SQL, à la microseconde ; une Date JS n'a que la milliseconde.
    const { rows } = await f.db.query<{ moved: boolean }>(
      'select $1::timestamptz > $2::timestamptz as moved',
      [after.updated_at, before.updated_at],
    );
    expect(rows[0]!.moved).toBe(true);
  });

  it('impose les dates du serveur à l’insertion', async () => {
    const id = await f.insertProvider({
      created_at: '2000-01-01T00:00:00Z',
      updated_at: '2000-01-01T00:00:00Z',
    });
    const { rows } = await f.db.query<{ recent: boolean }>(
      `select created_at > now() - interval '1 hour' and updated_at > now() - interval '1 hour' as recent
       from provider where id = $1`,
      [id],
    );
    expect(rows[0]!.recent).toBe(true);
  });
});

describe('is_admin', () => {
  it('fixe le search_path sans changer la règle', async () => {
    const { rows } = await f.db.query<{ config: string[] }>(
      `select proconfig as config from pg_proc where proname = 'is_admin'`,
    );
    expect(rows[0]!.config).toContain('search_path=""');
    const isAdmin = (run: typeof asUser) =>
      run(f.db, f.admin, () => f.db.query<{ ok: boolean }>('select public.is_admin() as ok')).then(
        ({ rows: r }) => r[0]!.ok,
      );
    expect(await isAdmin(asAdmin)).toBe(true);
    expect(await isAdmin(asUser)).toBe(false);
  });

  it('ignore user_metadata, que l’utilisateur peut modifier', async () => {
    const forged = { user_metadata: { role: 'Admin' } };
    const { rows } = await asRole(
      f.db,
      'authenticated',
      f.owner,
      () => f.db.query<{ ok: boolean }>('select public.is_admin() as ok'),
      forged,
    );
    expect(rows[0]!.ok).toBe(false);
    await expect(
      asRole(
        f.db,
        'authenticated',
        f.owner,
        () =>
          f.db.query(
            `insert into provider (category_key, name, city) values ('sound', 'X', 'Libreville')`,
          ),
        forged,
      ),
    ).rejects.toMatchObject(DENIED);
  });
});
