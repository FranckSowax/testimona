import { createHash } from 'node:crypto';
import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { asRole, asUser, createTestDb, createUser } from './helpers/db';

let db: PGlite;
let owner: string;
let coordinator: string;
let treasurer: string;
let contributor: string;
let viewer: string;
let guest: string;
let other: string;
let otherOwner: string;
let dossierId: string;
let otherDossierId: string;

const RLS_DENIED = { code: '42501' };
const INVALID = { code: 'TI001' };
const hash = (token: string) => createHash('sha256').update(token, 'utf8').digest('hex');

async function invite(by: string, token: string, role: string, dossier = dossierId) {
  return asUser(db, by, () =>
    db.query(`insert into dossier_invitation (dossier_id, role, token_hash) values ($1, $2, $3)`, [
      dossier,
      role,
      hash(token),
    ]),
  );
}

function accept(userId: string, token: string) {
  return asUser(db, userId, () =>
    db.query<{ id: string }>('select public.accept_dossier_invitation($1) as id', [token]),
  );
}

function selectInvitation(userId: string, token: string) {
  return asUser(db, userId, () =>
    db.query('select * from dossier_invitation where token_hash = $1', [hash(token)]),
  );
}

async function invitationExists(token: string) {
  const { rows } = await db.query('select 1 from dossier_invitation where token_hash = $1', [
    hash(token),
  ]);
  return rows.length === 1;
}

async function roleOf(userId: string) {
  const { rows } = await db.query<{ role: string }>(
    'select role from dossier_member where dossier_id = $1 and user_id = $2',
    [dossierId, userId],
  );
  return rows[0]?.role;
}

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

beforeAll(async () => {
  db = await createTestDb();
  owner = await createUser(db, 'owner@test.local');
  coordinator = await createUser(db, 'coordinator@test.local');
  treasurer = await createUser(db, 'treasurer@test.local');
  contributor = await createUser(db, 'contributor@test.local');
  viewer = await createUser(db, 'viewer@test.local');
  guest = await createUser(db, 'guest@test.local');
  other = await createUser(db, 'other@test.local');
  otherOwner = await createUser(db, 'other-owner@test.local');
  dossierId = await createDossier(owner);
  otherDossierId = await createDossier(otherOwner);
  await addMember(coordinator, 'coordinator');
  await addMember(treasurer, 'treasurer');
  await addMember(contributor, 'contributor');
  await addMember(viewer, 'viewer');
});

afterAll(async () => {
  await db?.close();
});

describe('dossier_invitation : RLS', () => {
  it('laisse le propriétaire créer et lire une invitation', async () => {
    await invite(owner, 'token-lecture-0000000000', 'contributor');
    const { rows } = await selectInvitation(owner, 'token-lecture-0000000000');
    expect(rows).toHaveLength(1);
  });

  it('laisse un coordinateur créer, lire et supprimer une invitation', async () => {
    await invite(coordinator, 'token-coord-000000000000', 'viewer');
    expect((await selectInvitation(coordinator, 'token-coord-000000000000')).rows).toHaveLength(1);
    const result = await asUser(db, coordinator, () =>
      db.query('delete from dossier_invitation where token_hash = $1', [
        hash('token-coord-000000000000'),
      ]),
    );
    expect(result.affectedRows).toBe(1);
    expect(await invitationExists('token-coord-000000000000')).toBe(false);
  });

  it('interdit à un lecteur de créer ou de lire une invitation', async () => {
    await expect(invite(viewer, 'token-viewer-00000000000', 'viewer')).rejects.toMatchObject(
      RLS_DENIED,
    );
    const { rows } = await asUser(db, viewer, () => db.query('select * from dossier_invitation'));
    expect(rows).toEqual([]);
  });

  it('interdit au trésorier et au contributeur de créer une invitation', async () => {
    await expect(invite(treasurer, 'token-treso-000000000000', 'viewer')).rejects.toMatchObject(
      RLS_DENIED,
    );
    await expect(invite(contributor, 'token-contrib-0000000000', 'viewer')).rejects.toMatchObject(
      RLS_DENIED,
    );
  });

  it('interdit à un lecteur de supprimer une invitation', async () => {
    await invite(owner, 'token-del-viewer-00000000', 'viewer');
    const result = await asUser(db, viewer, () =>
      db.query('delete from dossier_invitation where token_hash = $1', [
        hash('token-del-viewer-00000000'),
      ]),
    );
    expect(result.affectedRows).toBe(0);
    expect(await invitationExists('token-del-viewer-00000000')).toBe(true);
  });

  it('interdit toute modification côté client, même au propriétaire', async () => {
    await invite(owner, 'token-update-00000000000', 'viewer');
    const result = await asUser(db, owner, () =>
      db.query(
        `update dossier_invitation set role = 'coordinator', expires_at = 'infinity' where token_hash = $1`,
        [hash('token-update-00000000000')],
      ),
    );
    expect(result.affectedRows).toBe(0);
    const { rows } = await db.query<{ role: string }>(
      'select role from dossier_invitation where token_hash = $1',
      [hash('token-update-00000000000')],
    );
    expect(rows[0]?.role).toBe('viewer');
  });

  it('refuse une invitation au rôle de propriétaire', async () => {
    await expect(invite(owner, 'token-owner-000000000000', 'owner')).rejects.toMatchObject({
      code: '23514',
    });
  });

  it('refuse une expiration au-delà de 7 jours', async () => {
    const attempt = asUser(db, owner, () =>
      db.query(
        `insert into dossier_invitation (dossier_id, role, token_hash, expires_at) values ($1, 'viewer', $2, 'infinity')`,
        [dossierId, hash('token-infini-00000000000')],
      ),
    );
    await expect(attempt).rejects.toMatchObject(RLS_DENIED);
  });

  it('refuse une invitation créée comme déjà utilisée', async () => {
    const attempt = asUser(db, owner, () =>
      db.query(
        `insert into dossier_invitation (dossier_id, role, token_hash, used_at, used_by) values ($1, 'viewer', $2, now(), $3)`,
        [dossierId, hash('token-deja-0000000000000'), owner],
      ),
    );
    await expect(attempt).rejects.toMatchObject(RLS_DENIED);
  });

  it('refuse un auteur usurpé', async () => {
    const attempt = asUser(db, owner, () =>
      db.query(
        `insert into dossier_invitation (dossier_id, role, token_hash, created_by) values ($1, 'viewer', $2, $3)`,
        [dossierId, hash('token-usurpe-00000000000'), coordinator],
      ),
    );
    await expect(attempt).rejects.toMatchObject(RLS_DENIED);
  });

  it("isole les invitations d'un dossier à l'autre", async () => {
    await invite(otherOwner, 'token-autre-000000000000', 'viewer', otherDossierId);
    expect((await selectInvitation(owner, 'token-autre-000000000000')).rows).toEqual([]);
    await expect(
      invite(owner, 'token-intrus-00000000000', 'viewer', otherDossierId),
    ).rejects.toMatchObject(RLS_DENIED);
  });

  it('retire truncate, trigger et references aux utilisateurs connectés', async () => {
    for (const privilege of ['TRUNCATE', 'TRIGGER', 'REFERENCES']) {
      const { rows } = await db.query<{ granted: boolean }>(
        'select has_table_privilege($1, $2, $3) as granted',
        ['authenticated', 'public.dossier_invitation', privilege],
      );
      expect(rows[0]?.granted, privilege).toBe(false);
    }
  });

  it("refuse l'accès aux visiteurs anonymes", async () => {
    const attempt = asRole(db, 'anon', null, () => db.query('select * from dossier_invitation'));
    await expect(attempt).rejects.toMatchObject(RLS_DENIED);
  });
});

describe('accept_dossier_invitation', () => {
  it('ajoute le membre avec le rôle prévu et renvoie le dossier', async () => {
    await invite(owner, 'token-valide-000000000000', 'contributor');
    const { rows } = await accept(guest, 'token-valide-000000000000');
    expect(rows[0]?.id).toBe(dossierId);
    const member = await db.query<{ role: string; display_name: string }>(
      'select role, display_name from dossier_member where dossier_id = $1 and user_id = $2',
      [dossierId, guest],
    );
    expect(member.rows[0]).toEqual({ role: 'contributor', display_name: null });
  });

  it('refuse une invitation déjà utilisée par un autre utilisateur', async () => {
    await expect(accept(other, 'token-valide-000000000000')).rejects.toMatchObject({
      code: 'TI003',
    });
  });

  it('renvoie le dossier au même invité sans toucher à son rôle', async () => {
    const again = await createUser(db, 'again@test.local');
    await invite(owner, 'token-rejoue-000000000000', 'contributor');
    await accept(again, 'token-rejoue-000000000000');
    await asUser(db, owner, () =>
      db.query(`update dossier_member set role = 'viewer' where dossier_id = $1 and user_id = $2`, [
        dossierId,
        again,
      ]),
    );
    const { rows } = await accept(again, 'token-rejoue-000000000000');
    expect(rows[0]?.id).toBe(dossierId);
    expect(await roleOf(again)).toBe('viewer');
  });

  it('renvoie le dossier au même invité même après expiration du lien', async () => {
    const late = await createUser(db, 'late@test.local');
    await invite(owner, 'token-tardif-000000000000', 'contributor');
    await accept(late, 'token-tardif-000000000000');
    await db.query(
      `update dossier_invitation set expires_at = now() - interval '1 day' where token_hash = $1`,
      [hash('token-tardif-000000000000')],
    );
    const { rows } = await accept(late, 'token-tardif-000000000000');
    expect(rows[0]?.id).toBe(dossierId);
    expect(await roleOf(late)).toBe('contributor');
    await expect(accept(other, 'token-tardif-000000000000')).rejects.toMatchObject({
      code: 'TI003',
    });
  });

  it('interdit de supprimer une invitation déjà utilisée', async () => {
    const result = await asUser(db, owner, () =>
      db.query('delete from dossier_invitation where token_hash = $1', [
        hash('token-valide-000000000000'),
      ]),
    );
    expect(result.affectedRows).toBe(0);
    expect(await invitationExists('token-valide-000000000000')).toBe(true);
  });

  it('refuse une invitation expirée', async () => {
    await db.query(
      `insert into dossier_invitation (dossier_id, role, token_hash, created_by, expires_at)
       values ($1, 'viewer', $2, $3, now() - interval '1 day')`,
      [dossierId, hash('token-expire-000000000000'), owner],
    );
    await expect(accept(other, 'token-expire-000000000000')).rejects.toMatchObject({
      code: 'TI002',
    });
  });

  it('refuse un jeton inconnu', async () => {
    await expect(accept(other, 'token-inconnu-00000000000')).rejects.toMatchObject(INVALID);
  });

  it('refuse une invitation révoquée par le propriétaire', async () => {
    await invite(owner, 'token-revoque-00000000000', 'viewer');
    await asUser(db, owner, () =>
      db.query('delete from dossier_invitation where token_hash = $1', [
        hash('token-revoque-00000000000'),
      ]),
    );
    await expect(accept(other, 'token-revoque-00000000000')).rejects.toMatchObject(INVALID);
  });

  it("refuse l'invitation d'un coordinateur rétrogradé depuis", async () => {
    const demoted = await createUser(db, 'demoted@test.local');
    await addMember(demoted, 'coordinator');
    await invite(demoted, 'token-retrograde-00000000', 'contributor');
    await asUser(db, owner, () =>
      db.query(`update dossier_member set role = 'viewer' where dossier_id = $1 and user_id = $2`, [
        dossierId,
        demoted,
      ]),
    );
    await expect(accept(other, 'token-retrograde-00000000')).rejects.toMatchObject(INVALID);
    expect(await roleOf(other)).toBeUndefined();
  });

  it('promeut un lecteur existant au rôle de contributeur', async () => {
    const promoted = await createUser(db, 'promoted@test.local');
    await addMember(promoted, 'viewer');
    await invite(owner, 'token-promo-0000000000000', 'contributor');
    await accept(promoted, 'token-promo-0000000000000');
    expect(await roleOf(promoted)).toBe('contributor');
  });

  it('ne rétrograde pas un membre qui a déjà un rôle supérieur', async () => {
    await invite(owner, 'token-retro-0000000000000', 'viewer');
    await accept(owner, 'token-retro-0000000000000');
    expect(await roleOf(owner)).toBe('owner');
  });

  it('refuse un appel authentifié sans utilisateur', async () => {
    await invite(owner, 'token-sans-uid-0000000000', 'viewer');
    const attempt = asRole(db, 'authenticated', null, () =>
      db.query(`select public.accept_dossier_invitation('token-sans-uid-0000000000')`),
    );
    await expect(attempt).rejects.toMatchObject({ code: '28000' });
  });

  it("refuse l'exécution aux visiteurs anonymes", async () => {
    const attempt = asRole(db, 'anon', null, () =>
      db.query(`select public.accept_dossier_invitation('token-valide-000000000000')`),
    );
    await expect(attempt).rejects.toMatchObject(RLS_DENIED);
  });
});
