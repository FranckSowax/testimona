import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { asRole, asUser } from './helpers/db';
import {
  createDossierPhotoFixture,
  DENIED,
  type DossierPhotoFixture,
  type DossierPhotoRow,
} from './helpers/dossier-photos';

let f: DossierPhotoFixture;

beforeAll(async () => {
  f = await createDossierPhotoFixture();
});

afterAll(async () => {
  await f?.db.close();
});

/** Nombre de photos courantes (activées, non archivées) d'un dossier, hors RLS. */
async function currentCount(dossierId: string) {
  const { rows } = await f.db.query<{ n: number }>(
    `select count(*)::int as n from dossier_photo
      where dossier_id = $1 and activated_at is not null and archived_at is null`,
    [dossierId],
  );
  return rows[0]!.n;
}

/** Un dossier neuf tenu par owner, avec un membre de chaque rôle du banc. */
async function freshDossier() {
  const dossier = await f.createDossier(f.owner);
  await f.addMember(f.coordinator, 'coordinator', dossier);
  await f.addMember(f.treasurer, 'treasurer', dossier);
  await f.addMember(f.contributor, 'contributor', dossier);
  await f.addMember(f.viewer, 'viewer', dossier);
  return dossier;
}

describe('dossier_photo : préparation', () => {
  it('impose le chemin, l’auteur et les dates, quoi qu’envoie le client', async () => {
    const before = Date.now();
    const { rows } = await asUser(f.db, f.coordinator, () =>
      f.db.query<DossierPhotoRow>(
        `insert into dossier_photo (dossier_id, path, created_by, created_at, activated_at, archived_at)
         values ($1, 'ailleurs/photo.jpg', $2, now() - interval '3 days', now(), now())
         returning id, dossier_id, path, created_by, created_at, activated_at, archived_at`,
        [f.dossierId, f.owner],
      ),
    );
    const row = rows[0]!;
    expect(row.path).toBe(`${f.dossierId}/${row.id}.jpg`);
    expect(row.created_by).toBe(f.coordinator);
    expect(Math.abs(new Date(row.created_at).getTime() - before)).toBeLessThan(60_000);
    expect(row.activated_at).toBeNull();
    expect(row.archived_at).toBeNull();
  });

  it('laisse préparer le propriétaire et le coordinateur', async () => {
    expect((await f.prepare(f.owner)).created_by).toBe(f.owner);
    expect((await f.prepare(f.coordinator)).created_by).toBe(f.coordinator);
  });

  it('refuse un trésorier, un contributeur, un lecteur et un non-membre', async () => {
    for (const user of [f.treasurer, f.contributor, f.viewer, f.stranger]) {
      await expect(f.prepare(user)).rejects.toMatchObject(DENIED);
    }
  });
});

describe('set_dossier_photo : désignation de la photo courante', () => {
  it('active la photo, archive la précédente et garde une seule photo courante', async () => {
    const dossier = await freshDossier();
    const first = await f.prepareWithPhoto(f.coordinator, dossier);
    await f.setCurrent(f.coordinator, first.id);
    expect((await f.read(first.id)).activated_at).not.toBeNull();
    expect(await currentCount(dossier)).toBe(1);

    const second = await f.prepareWithPhoto(f.owner, dossier);
    await f.setCurrent(f.owner, second.id);
    const [a, b] = [await f.read(first.id), await f.read(second.id)];
    expect(a.archived_at).not.toBeNull();
    expect(b.activated_at).not.toBeNull();
    expect(b.archived_at).toBeNull();
    expect(await currentCount(dossier)).toBe(1);
  });

  it('refuse sans utilisateur connecté (28000)', async () => {
    const photo = await f.prepareWithPhoto(f.coordinator);
    await expect(
      asRole(f.db, 'authenticated', null, () =>
        f.db.query('select public.set_dossier_photo($1)', [photo.id]),
      ),
    ).rejects.toMatchObject({ code: '28000' });
  });

  it('refuse un rôle insuffisant et la photo d’un autre dossier (42501)', async () => {
    const photo = await f.prepareWithPhoto(f.coordinator);
    for (const user of [f.treasurer, f.contributor, f.viewer, f.stranger]) {
      await expect(f.setCurrent(user, photo.id)).rejects.toMatchObject(DENIED);
    }
    const foreign = await f.prepareWithPhoto(f.stranger, f.otherDossierId);
    await expect(f.setCurrent(f.coordinator, foreign.id)).rejects.toMatchObject(DENIED);
    expect((await f.read(photo.id)).activated_at).toBeNull();
    expect((await f.read(foreign.id)).activated_at).toBeNull();
  });

  // WHY: un identifiant inconnu ne révèle rien, même à un coordinateur : 42501 et non TL012.
  it('répond 42501 pour un identifiant inexistant', async () => {
    for (const user of [f.coordinator, f.owner, f.stranger]) {
      await expect(f.setCurrent(user, randomUUID())).rejects.toMatchObject(DENIED);
    }
  });

  it('refuse une photo déjà activée ou archivée (TL012)', async () => {
    const dossier = await freshDossier();
    const first = await f.prepareWithPhoto(f.coordinator, dossier);
    await f.setCurrent(f.coordinator, first.id);
    await expect(f.setCurrent(f.coordinator, first.id)).rejects.toMatchObject({ code: 'TL012' });
    const second = await f.prepareWithPhoto(f.coordinator, dossier);
    await f.setCurrent(f.coordinator, second.id);
    expect((await f.read(first.id)).archived_at).not.toBeNull();
    await expect(f.setCurrent(f.coordinator, first.id)).rejects.toMatchObject({ code: 'TL012' });
    expect(await currentCount(dossier)).toBe(1);
  });

  it('refuse tant que le fichier manque au stockage (TL006), puis accepte', async () => {
    const photo = await f.prepare(f.coordinator);
    await expect(f.setCurrent(f.coordinator, photo.id)).rejects.toMatchObject({ code: 'TL006' });
    expect((await f.read(photo.id)).activated_at).toBeNull();
    await f.upload(f.coordinator, photo.path);
    await f.setCurrent(f.coordinator, photo.id);
    expect((await f.read(photo.id)).activated_at).not.toBeNull();
  });

  it('refuse quand la seule version du fichier est archivée (TL006)', async () => {
    const photo = await f.prepareWithPhoto(f.coordinator);
    await f.db.query(
      `update storage.objects set archived_at = now() where bucket_id = 'dossier-photos' and name = $1`,
      [photo.path],
    );
    await expect(f.setCurrent(f.coordinator, photo.id)).rejects.toMatchObject({ code: 'TL006' });
  });

  it('refuse quand le fichier de même nom n’existe que dans un autre bucket (TL006)', async () => {
    const photo = await f.prepare(f.coordinator);
    // WHY: superutilisateur du banc ; un objet au même chemin dans le bucket receipts ne doit pas
    // compter : le filtre bucket_id de la RPC est nécessaire.
    await f.db.query(`insert into storage.objects (bucket_id, name) values ('receipts', $1)`, [
      photo.path,
    ]);
    await expect(f.setCurrent(f.coordinator, photo.id)).rejects.toMatchObject({ code: 'TL006' });
  });

  it('garantit une seule photo courante par dossier et refuse un archivage sans activation', async () => {
    const dossier = await freshDossier();
    const first = await f.prepareWithPhoto(f.coordinator, dossier);
    await f.setCurrent(f.coordinator, first.id);
    const second = await f.prepare(f.coordinator, dossier);
    // WHY: superutilisateur du banc, pour contourner la RPC et vérifier les contraintes seules.
    await expect(
      f.db.query('update dossier_photo set activated_at = now() where id = $1', [second.id]),
    ).rejects.toMatchObject({ code: '23505' });
    await expect(
      f.db.query('update dossier_photo set archived_at = now() where id = $1', [second.id]),
    ).rejects.toMatchObject({ code: '23514' });
  });
});

describe('dossier_photo : lecture', () => {
  it('montre la photo courante à tout membre, jamais à un non-membre', async () => {
    const dossier = await freshDossier();
    const photo = await f.prepareWithPhoto(f.coordinator, dossier);
    await f.setCurrent(f.coordinator, photo.id);
    for (const user of [f.owner, f.coordinator, f.treasurer, f.contributor, f.viewer]) {
      expect(await f.visibleRows(user, photo.id)).toBe(1);
    }
    expect(await f.visibleRows(f.stranger, photo.id)).toBe(0);
  });

  it('réserve une photo préparée ou archivée au coordinateur et plus', async () => {
    const dossier = await freshDossier();
    const prepared = await f.prepareWithPhoto(f.coordinator, dossier);
    const archived = await f.prepareWithPhoto(f.coordinator, dossier);
    await f.setCurrent(f.coordinator, archived.id);
    await f.setCurrent(f.coordinator, (await f.prepareWithPhoto(f.coordinator, dossier)).id);
    for (const photo of [prepared, archived]) {
      expect(await f.visibleRows(f.owner, photo.id)).toBe(1);
      expect(await f.visibleRows(f.coordinator, photo.id)).toBe(1);
      for (const user of [f.treasurer, f.contributor, f.viewer, f.stranger]) {
        expect(await f.visibleRows(user, photo.id)).toBe(0);
      }
    }
  });
});

describe('dossier_photo : droits', () => {
  const tablePrivilege = async (role: string, privilege: string) =>
    (
      await f.db.query<{ ok: boolean }>(
        `select has_table_privilege($1, 'public.dossier_photo', $2) as ok`,
        [role, privilege],
      )
    ).rows[0]!.ok;

  const functionPrivilege = async (role: string, fn: string) =>
    (
      await f.db.query<{ ok: boolean }>(`select has_function_privilege($1, $2, 'execute') as ok`, [
        role,
        fn,
      ])
    ).rows[0]!.ok;

  it('ne donne ni update ni delete aux connectés, et aucun droit aux anonymes', async () => {
    expect(await tablePrivilege('authenticated', 'select')).toBe(true);
    expect(await tablePrivilege('authenticated', 'insert')).toBe(true);
    for (const privilege of ['update', 'delete', 'truncate']) {
      expect(await tablePrivilege('authenticated', privilege), privilege).toBe(false);
    }
    for (const privilege of ['select', 'insert', 'update', 'delete']) {
      expect(await tablePrivilege('anon', privilege), privilege).toBe(false);
    }
    const photo = await f.prepare(f.coordinator);
    await expect(
      asUser(f.db, f.owner, () =>
        f.db.query('update dossier_photo set archived_at = now() where id = $1', [photo.id]),
      ),
    ).rejects.toMatchObject(DENIED);
    await expect(
      asUser(f.db, f.owner, () =>
        f.db.query('delete from dossier_photo where id = $1', [photo.id]),
      ),
    ).rejects.toMatchObject(DENIED);
  });

  it('garde la fonction de trigger hors de portée et ouvre la RPC aux seuls connectés', async () => {
    for (const role of ['public', 'anon', 'authenticated']) {
      expect(await functionPrivilege(role, 'public.dossier_photo_before_insert()'), role).toBe(
        false,
      );
    }
    expect(await functionPrivilege('public', 'public.set_dossier_photo(uuid)')).toBe(false);
    expect(await functionPrivilege('anon', 'public.set_dossier_photo(uuid)')).toBe(false);
    expect(await functionPrivilege('authenticated', 'public.set_dossier_photo(uuid)')).toBe(true);
  });
});
