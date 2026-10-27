import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { asRole, asUser, createTestDb, createUser } from './helpers/db';

let db: PGlite;
let owner: string;
let contributor: string;
let viewer: string;
let other: string;
let dossierId: string;
let otherDossierId: string;

const RLS_DENIED = { code: '42501' };

async function createDossier(userId: string) {
  const { rows } = await asUser(db, userId, () =>
    db.query<{ id: string }>(
      `select public.create_dossier_with_person('death', 'Jean', 'Ndong', 'GA', 'Libreville', '') as id`,
    ),
  );
  return rows[0]!.id;
}

async function addMember(userId: string, role: string) {
  await asUser(db, owner, () =>
    db.query(`insert into dossier_member (dossier_id, user_id, role) values ($1, $2, $3)`, [
      dossierId,
      userId,
      role,
    ]),
  );
}

async function consume(userId: string, dossier = dossierId, limit?: number) {
  const { rows } = await asUser(db, userId, () =>
    limit === undefined
      ? db.query<{ ok: boolean }>('select public.consume_ai_quota($1) as ok', [dossier])
      : db.query<{ ok: boolean }>('select public.consume_ai_quota($1, $2) as ok', [dossier, limit]),
  );
  return rows[0]!.ok;
}

async function countOf(dossier: string) {
  const { rows } = await db.query<{ count: number }>(
    'select count from ai_usage where dossier_id = $1',
    [dossier],
  );
  return rows[0]?.count ?? 0;
}

beforeAll(async () => {
  db = await createTestDb();
  owner = await createUser(db, 'owner@test.local');
  contributor = await createUser(db, 'contributor@test.local');
  viewer = await createUser(db, 'viewer@test.local');
  other = await createUser(db, 'other@test.local');
  dossierId = await createDossier(owner);
  otherDossierId = await createDossier(other);
  await addMember(contributor, 'contributor');
  await addMember(viewer, 'viewer');
});

afterAll(async () => {
  await db?.close();
});

describe('ai_usage : accès direct', () => {
  it('refuse la lecture et l’écriture directes à un membre connecté', async () => {
    await expect(asUser(db, owner, () => db.query('select * from ai_usage'))).rejects.toMatchObject(
      RLS_DENIED,
    );
    await expect(
      asUser(db, owner, () =>
        db.query(`insert into ai_usage (dossier_id, day, count) values ($1, current_date, 0)`, [
          dossierId,
        ]),
      ),
    ).rejects.toMatchObject(RLS_DENIED);
  });

  it('refuse la modification et la suppression directes', async () => {
    await consume(owner);
    await expect(
      asUser(db, owner, () => db.query('update ai_usage set count = 0')),
    ).rejects.toMatchObject(RLS_DENIED);
    await expect(asUser(db, owner, () => db.query('delete from ai_usage'))).rejects.toMatchObject(
      RLS_DENIED,
    );
  });

  it('refuse l’exécution de consume_ai_quota à un visiteur anonyme', async () => {
    await expect(
      asRole(db, 'anon', null, () => db.query('select public.consume_ai_quota($1)', [dossierId])),
    ).rejects.toMatchObject(RLS_DENIED);
  });
});

describe('consume_ai_quota : entrées invalides', () => {
  it('refuse un dossier nul ou inexistant', async () => {
    await expect(
      asUser(db, owner, () => db.query('select public.consume_ai_quota(null)')),
    ).rejects.toMatchObject(RLS_DENIED);
    await expect(
      asUser(db, owner, () =>
        db.query(`select public.consume_ai_quota('00000000-0000-0000-0000-000000000000')`),
      ),
    ).rejects.toMatchObject(RLS_DENIED);
  });

  it('refuse un rôle authenticated sans utilisateur (28000)', async () => {
    await expect(
      asRole(db, 'authenticated', null, () =>
        db.query('select public.consume_ai_quota($1)', [dossierId]),
      ),
    ).rejects.toMatchObject({ code: '28000' });
  });
});

describe('consume_ai_quota : rôles', () => {
  it('accepte un coordinateur et un trésorier', async () => {
    const coordinator = await createUser(db, 'coordinator@test.local');
    const treasurer = await createUser(db, 'treasurer@test.local');
    await addMember(coordinator, 'coordinator');
    await addMember(treasurer, 'treasurer');
    expect(await consume(coordinator)).toBe(true);
    expect(await consume(treasurer)).toBe(true);
  });

  it('laisse un contributeur consommer et compte l’appel', async () => {
    const before = await countOf(dossierId);
    expect(await consume(contributor)).toBe(true);
    expect(await countOf(dossierId)).toBe(before + 1);
  });

  it('refuse un lecteur et un non-membre', async () => {
    await expect(consume(viewer)).rejects.toMatchObject(RLS_DENIED);
    await expect(consume(other)).rejects.toMatchObject(RLS_DENIED);
  });
});

describe('consume_ai_quota : plafond', () => {
  it('accepte 20 appels par jour puis renvoie false sans dépasser 20', async () => {
    const fresh = await createDossier(owner);
    for (let i = 0; i < 20; i += 1) expect(await consume(owner, fresh)).toBe(true);
    expect(await consume(owner, fresh)).toBe(false);
    expect(await countOf(fresh)).toBe(20);
  });

  it('ne laisse pas une limite fournie par le client lever le plafond', async () => {
    const fresh = await createDossier(owner);
    for (let i = 0; i < 20; i += 1) expect(await consume(owner, fresh, 1000)).toBe(true);
    expect(await consume(owner, fresh, 1000)).toBe(false);
  });

  it('applique une limite plus basse et refuse une limite nulle ou négative', async () => {
    const fresh = await createDossier(owner);
    expect(await consume(owner, fresh, 1)).toBe(true);
    expect(await consume(owner, fresh, 1)).toBe(false);
    expect(await consume(owner, fresh, 0)).toBe(false);
    expect(await consume(owner, fresh, -5)).toBe(false);
  });

  it('repart de zéro le jour suivant (jour UTC)', async () => {
    const fresh = await createDossier(owner);
    await db.query(
      `insert into ai_usage (dossier_id, day, count)
       values ($1, (now() at time zone 'utc')::date - 1, 20)`,
      [fresh],
    );
    expect(await consume(owner, fresh)).toBe(true);
    const { rows } = await db.query<{ count: number }>(
      `select count from ai_usage where dossier_id = $1 and day = (now() at time zone 'utc')::date`,
      [fresh],
    );
    expect(rows[0]?.count).toBe(1);
  });

  it('traite une limite explicitement nulle comme zéro', async () => {
    const fresh = await createDossier(owner);
    const { rows } = await asUser(db, owner, () =>
      db.query<{ ok: boolean }>('select public.consume_ai_quota($1, null) as ok', [fresh]),
    );
    expect(rows[0]!.ok).toBe(false);
  });

  it('compte chaque dossier séparément', async () => {
    const before = await countOf(otherDossierId);
    expect(await consume(other, otherDossierId)).toBe(true);
    expect(await countOf(otherDossierId)).toBe(before + 1);
  });
});
