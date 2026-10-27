import { createHash } from 'node:crypto';
import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { asRole, asUser, createTestDb, createUser } from './helpers/db';

let db: PGlite;
let owner: string;
let viewer: string;
let guest: string;
let other: string;
let dossierId: string;

const RLS_DENIED = { code: '42501' };
const hash = (token: string) => createHash('sha256').update(token, 'utf8').digest('hex');

async function invite(by: string, token: string, role: string) {
  return asUser(db, by, () =>
    db.query(`insert into dossier_invitation (dossier_id, role, token_hash) values ($1, $2, $3)`, [
      dossierId,
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

beforeAll(async () => {
  db = await createTestDb();
  owner = await createUser(db, 'owner@test.local');
  viewer = await createUser(db, 'viewer@test.local');
  guest = await createUser(db, 'guest@test.local');
  other = await createUser(db, 'other@test.local');
  const { rows } = await asUser(db, owner, () =>
    db.query<{ id: string }>(
      `select public.create_dossier_with_person('death', 'Jean', 'Ndong', 'GA', 'Libreville', '') as id`,
    ),
  );
  dossierId = rows[0]!.id;
  await asUser(db, owner, () =>
    db.query(`insert into dossier_member (dossier_id, user_id, role) values ($1, $2, 'viewer')`, [
      dossierId,
      viewer,
    ]),
  );
});

afterAll(async () => {
  await db?.close();
});

describe('dossier_invitation : RLS', () => {
  it('laisse le propriétaire créer et lire une invitation', async () => {
    await invite(owner, 'token-lecture-0000000000', 'contributor');
    const { rows } = await asUser(db, owner, () => db.query('select * from dossier_invitation'));
    expect(rows).toHaveLength(1);
  });

  it('interdit à un lecteur de créer ou de lire une invitation', async () => {
    await expect(invite(viewer, 'token-viewer-00000000000', 'viewer')).rejects.toMatchObject(
      RLS_DENIED,
    );
    const { rows } = await asUser(db, viewer, () => db.query('select * from dossier_invitation'));
    expect(rows).toEqual([]);
  });

  it('refuse une invitation au rôle de propriétaire', async () => {
    await expect(invite(owner, 'token-owner-000000000000', 'owner')).rejects.toMatchObject({
      code: '23514',
    });
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
    expect(member.rows[0]).toEqual({ role: 'contributor', display_name: 'guest' });
  });

  it('refuse une invitation déjà utilisée', async () => {
    await expect(accept(other, 'token-valide-000000000000')).rejects.toMatchObject({
      code: 'TI003',
    });
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
    await expect(accept(other, 'token-inconnu-00000000000')).rejects.toMatchObject({
      code: 'TI001',
    });
  });

  it('ne rétrograde pas un membre qui a déjà un rôle supérieur', async () => {
    await invite(owner, 'token-retro-0000000000000', 'viewer');
    await accept(owner, 'token-retro-0000000000000');
    const { rows } = await db.query<{ role: string }>(
      'select role from dossier_member where dossier_id = $1 and user_id = $2',
      [dossierId, owner],
    );
    expect(rows[0]?.role).toBe('owner');
  });

  it("refuse l'exécution aux visiteurs anonymes", async () => {
    const attempt = asRole(db, 'anon', null, () =>
      db.query(`select public.accept_dossier_invitation('token-valide-000000000000')`),
    );
    await expect(attempt).rejects.toMatchObject(RLS_DENIED);
  });
});
