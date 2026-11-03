import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { asRole, asUser } from './helpers/db';
import {
  BUCKET,
  createDossierPhotoFixture,
  DENIED,
  type DossierPhotoFixture,
  MAX_BYTES,
} from './helpers/dossier-photos';

let f: DossierPhotoFixture;

beforeAll(async () => {
  f = await createDossierPhotoFixture();
});

afterAll(async () => {
  await f?.db.close();
});

describe('bucket dossier-photos', () => {
  it('est privé, limité à 5 Mo et aux images JPEG', async () => {
    const { rows } = await f.db.query<{
      public: boolean;
      file_size_limit: number | string;
      allowed_mime_types: string[];
    }>(`select public, file_size_limit, allowed_mime_types from storage.buckets where id = $1`, [
      BUCKET,
    ]);
    expect(rows[0]!.public).toBe(false);
    expect(Number(rows[0]!.file_size_limit)).toBe(MAX_BYTES);
    expect(rows[0]!.allowed_mime_types).toEqual(['image/jpeg']);
  });

  it('n’accepte un envoi que sur le chemin d’une photo préparée, par un coordinateur et plus', async () => {
    const photo = await f.prepare(f.coordinator);
    for (const user of [f.treasurer, f.contributor, f.viewer, f.stranger]) {
      await expect(f.upload(user, photo.path)).rejects.toMatchObject(DENIED);
    }
    await expect(
      f.upload(f.coordinator, `${f.dossierId}/${randomUUID()}.jpg`),
    ).rejects.toMatchObject(DENIED);
    await f.upload(f.coordinator, photo.path);
    await f.upload(f.owner, (await f.prepare(f.owner)).path);
  });

  it('refuse tout envoi sur le chemin d’une photo activée ou archivée', async () => {
    const archived = await f.prepareWithPhoto(f.coordinator);
    await f.setCurrent(f.coordinator, archived.id);
    const current = await f.prepareWithPhoto(f.coordinator);
    await f.setCurrent(f.coordinator, current.id);
    // WHY: les fichiers existent déjà ; on supprime les objets (superutilisateur du banc) pour
    // vérifier que la policy, et pas seulement l'unicité du chemin, refuse un nouvel envoi.
    for (const photo of [archived, current]) {
      await f.db.query(`delete from storage.objects where bucket_id = $1 and name = $2`, [
        BUCKET,
        photo.path,
      ]);
      for (const user of [f.owner, f.coordinator]) {
        await expect(f.upload(user, photo.path)).rejects.toMatchObject(DENIED);
      }
    }
  });

  it('interdit d’envoyer deux fois, de remplacer ou de supprimer un fichier', async () => {
    const photo = await f.prepareWithPhoto(f.coordinator);
    // WHY: un second envoi sur le même chemin bute sur l'unicité (bucket, chemin) du stockage.
    await expect(f.upload(f.coordinator, photo.path)).rejects.toMatchObject({ code: '23505' });
    const updated = await asUser(f.db, f.owner, () =>
      f.db.query(`update storage.objects set name = 'x' where bucket_id = $1 and name = $2`, [
        BUCKET,
        photo.path,
      ]),
    );
    expect(updated.affectedRows ?? 0).toBe(0);
    const deleted = await asUser(f.db, f.owner, () =>
      f.db.query(`delete from storage.objects where bucket_id = $1 and name = $2`, [
        BUCKET,
        photo.path,
      ]),
    );
    expect(deleted.affectedRows ?? 0).toBe(0);
  });

  it('ouvre le fichier courant à tout membre, le reste au coordinateur et plus', async () => {
    const archived = await f.prepareWithPhoto(f.coordinator);
    await f.setCurrent(f.coordinator, archived.id);
    const current = await f.prepareWithPhoto(f.coordinator);
    await f.setCurrent(f.coordinator, current.id);
    const prepared = await f.prepareWithPhoto(f.coordinator);
    for (const user of [f.owner, f.coordinator, f.treasurer, f.contributor, f.viewer]) {
      expect(await f.visibleObjects(user, current.path)).toBe(1);
    }
    expect(await f.visibleObjects(f.stranger, current.path)).toBe(0);
    for (const photo of [prepared, archived]) {
      expect(await f.visibleObjects(f.owner, photo.path)).toBe(1);
      expect(await f.visibleObjects(f.coordinator, photo.path)).toBe(1);
      for (const user of [f.treasurer, f.contributor, f.viewer, f.stranger]) {
        expect(await f.visibleObjects(user, photo.path)).toBe(0);
      }
    }
  });

  it('refuse lecture et envoi à un visiteur anonyme', async () => {
    const photo = await f.prepareWithPhoto(f.coordinator);
    await f.setCurrent(f.coordinator, photo.id);
    const prepared = await f.prepare(f.coordinator);
    const asAnon = (sql: string, params: unknown[]) =>
      asRole(f.db, 'anon', null, () => f.db.query(sql, params));
    const { rows } = await asAnon(
      `select id from storage.objects where bucket_id = $1 and name = $2`,
      [BUCKET, photo.path],
    );
    expect(rows).toHaveLength(0);
    await expect(
      asAnon(`insert into storage.objects (bucket_id, name) values ($1, $2)`, [
        BUCKET,
        prepared.path,
      ]),
    ).rejects.toMatchObject(DENIED);
  });
});
