import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { asRole, asUser, createTestDb, createUser } from './helpers/db';

let db: PGlite;
let owner: string;
let coordinator: string;
let viewer: string;
let outsider: string;
let dossierId: string;

const RLS_DENIED = { code: '42501' };

async function createDossier(userId: string, title = 'Papa Jean'): Promise<string> {
  const { rows } = await asUser(db, userId, () =>
    db.query<{ id: string }>(
      `insert into dossier (title, country_code, city, entry_point)
       values ($1, 'GA', 'Libreville', 'death') returning id`,
      [title],
    ),
  );
  const id = rows[0]?.id;
  if (!id) throw new Error('dossier non créé');
  return id;
}

async function addMember(by: string, userId: string, role: string) {
  return asUser(db, by, () =>
    db.query('insert into dossier_member (dossier_id, user_id, role) values ($1, $2, $3)', [
      dossierId,
      userId,
      role,
    ]),
  );
}

function visibleDossiers(userId: string) {
  return asUser(db, userId, () => db.query<{ id: string }>('select id from dossier'));
}

beforeAll(async () => {
  db = await createTestDb();
  owner = await createUser(db, 'owner@test.local');
  coordinator = await createUser(db, 'coordinator@test.local');
  viewer = await createUser(db, 'viewer@test.local');
  outsider = await createUser(db, 'outsider@test.local');
  dossierId = await createDossier(owner);
  await addMember(owner, coordinator, 'coordinator');
  await addMember(coordinator, viewer, 'viewer');
});

afterAll(async () => {
  await db?.close();
});

describe('dossier : appartenance', () => {
  it('fait du créateur le propriétaire', async () => {
    const { rows } = await asUser(db, owner, () =>
      db.query<{ role: string }>(
        'select role from dossier_member where dossier_id = $1 and user_id = $2',
        [dossierId, owner],
      ),
    );
    expect(rows).toEqual([{ role: 'owner' }]);
  });

  it("refuse de créer un dossier au nom de quelqu'un d'autre", async () => {
    const attempt = asUser(db, outsider, () =>
      db.query(
        `insert into dossier (created_by, title, country_code, city, entry_point)
         values ($1, 'Usurpé', 'GA', 'Libreville', 'death')`,
        [owner],
      ),
    );
    await expect(attempt).rejects.toMatchObject(RLS_DENIED);
  });

  it("fige created_by lors d'une mise à jour", async () => {
    await asUser(db, owner, () =>
      db.query('update dossier set created_by = $1 where id = $2', [coordinator, dossierId]),
    );
    const { rows } = await db.query<{ created_by: string }>(
      'select created_by from dossier where id = $1',
      [dossierId],
    );
    expect(rows[0]?.created_by).toBe(owner);
  });
});

describe('dossier : lecture', () => {
  it('montre le dossier à ses membres', async () => {
    expect((await visibleDossiers(viewer)).rows.map((r) => r.id)).toContain(dossierId);
  });

  it('cache le dossier et ses membres aux non-membres', async () => {
    expect((await visibleDossiers(outsider)).rows).toEqual([]);
    const members = await asUser(db, outsider, () => db.query('select * from dossier_member'));
    expect(members.rows).toEqual([]);
  });

  it('refuse tout accès aux visiteurs anonymes', async () => {
    const attempt = asRole(db, 'anon', null, () => db.query('select * from dossier'));
    await expect(attempt).rejects.toMatchObject(RLS_DENIED);
  });
});

describe('dossier : écriture', () => {
  it('interdit à un lecteur de modifier le dossier', async () => {
    const { affectedRows } = await asUser(db, viewer, () =>
      db.query("update dossier set title = 'Modifié' where id = $1", [dossierId]),
    );
    expect(affectedRows).toBe(0);
  });

  it('laisse un coordinateur modifier le dossier', async () => {
    const { affectedRows } = await asUser(db, coordinator, () =>
      db.query("update dossier set title = 'Papa Jean Ndong' where id = $1", [dossierId]),
    );
    expect(affectedRows).toBe(1);
  });

  it("interdit à un lecteur d'ajouter un membre", async () => {
    await expect(addMember(viewer, outsider, 'viewer')).rejects.toMatchObject(RLS_DENIED);
  });

  it('interdit à un coordinateur de nommer un propriétaire', async () => {
    await expect(addMember(coordinator, outsider, 'owner')).rejects.toMatchObject(RLS_DENIED);
  });

  it('interdit à un coordinateur de se promouvoir propriétaire', async () => {
    await expect(
      asUser(db, coordinator, () =>
        db.query(
          "update dossier_member set role = 'owner' where dossier_id = $1 and user_id = $2",
          [dossierId, coordinator],
        ),
      ),
    ).rejects.toMatchObject(RLS_DENIED);
  });

  it('interdit à un non-propriétaire de supprimer le dossier', async () => {
    const { affectedRows } = await asUser(db, coordinator, () =>
      db.query('delete from dossier where id = $1', [dossierId]),
    );
    expect(affectedRows).toBe(0);
  });
});

describe('dossier : propriétaire', () => {
  it('empêche de retirer le dernier propriétaire', async () => {
    await expect(
      asUser(db, owner, () =>
        db.query('delete from dossier_member where dossier_id = $1 and user_id = $2', [
          dossierId,
          owner,
        ]),
      ),
    ).rejects.toMatchObject({ code: '23514' });
  });

  it('permet au propriétaire de supprimer tout le dossier', async () => {
    const other = await createDossier(owner, 'Dossier à supprimer');
    const { affectedRows } = await asUser(db, owner, () =>
      db.query('delete from dossier where id = $1', [other]),
    );
    expect(affectedRows).toBe(1);
  });
});
