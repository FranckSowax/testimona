import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { asRole, asUser } from './helpers/db';
import { createReceiptFixture, DENIED, MAX_BYTES, type ReceiptFixture } from './helpers/receipts';

let f: ReceiptFixture;

beforeAll(async () => {
  f = await createReceiptFixture();
});

afterAll(async () => {
  await f?.db.close();
});

describe('bucket receipts', () => {
  it('est privé, limité à 5 Mo et aux images JPEG, PNG et WebP', async () => {
    const { rows } = await f.db.query<{
      public: boolean;
      file_size_limit: number | string;
      allowed_mime_types: string[];
    }>(
      `select public, file_size_limit, allowed_mime_types from storage.buckets where id = 'receipts'`,
    );
    expect(rows[0]!.public).toBe(false);
    expect(Number(rows[0]!.file_size_limit)).toBe(MAX_BYTES);
    expect(rows[0]!.allowed_mime_types).toEqual(['image/jpeg', 'image/png', 'image/webp']);
  });

  it('n’accepte un envoi que sur le chemin d’un reçu préparé, non rattaché, par un trésorier', async () => {
    const receipt = await f.prepare(f.treasurer);
    await expect(f.upload(f.contributor, receipt.storage_path)).rejects.toMatchObject(DENIED);
    await expect(f.upload(f.stranger, receipt.storage_path)).rejects.toMatchObject(DENIED);
    await expect(f.upload(f.treasurer, `${f.dossierId}/${randomUUID()}.jpg`)).rejects.toMatchObject(
      DENIED,
    );
    await f.upload(f.treasurer, receipt.storage_path);
  });

  it('refuse tout envoi après le rattachement', async () => {
    const attached = await f.prepareWithPhoto(f.treasurer);
    await f.attach(f.treasurer, attached.id, await f.addEntry(f.treasurer));
    // WHY: la photo existe déjà ; on supprime l'objet (superutilisateur du banc) pour vérifier
    // que la policy, et pas seulement l'unicité du chemin, refuse un nouvel envoi.
    await f.db.query(`delete from storage.objects where bucket_id = 'receipts' and name = $1`, [
      attached.storage_path,
    ]);
    for (const user of [f.treasurer, f.contributor, f.stranger]) {
      await expect(f.upload(user, attached.storage_path)).rejects.toMatchObject(DENIED);
    }
  });

  it('ouvre la photo comme le reçu : trésorier avant rattachement, tout membre après', async () => {
    const receipt = await f.prepareWithPhoto(f.treasurer);
    expect(await f.visibleObjects(f.treasurer, receipt.storage_path)).toBe(1);
    expect(await f.visibleObjects(f.contributor, receipt.storage_path)).toBe(0);
    expect(await f.visibleObjects(f.viewer, receipt.storage_path)).toBe(0);
    await f.attach(f.treasurer, receipt.id, await f.addEntry(f.treasurer));
    expect(await f.visibleObjects(f.viewer, receipt.storage_path)).toBe(1);
    expect(await f.visibleObjects(f.stranger, receipt.storage_path)).toBe(0);
  });

  it('interdit de remplacer ou de supprimer une photo', async () => {
    const receipt = await f.prepareWithPhoto(f.treasurer);
    // WHY: un second envoi sur le même chemin bute sur l'unicité (bucket, chemin) du stockage.
    await expect(f.upload(f.treasurer, receipt.storage_path)).rejects.toMatchObject({
      code: '23505',
    });
    const updated = await asUser(f.db, f.treasurer, () =>
      f.db.query(
        `update storage.objects set name = 'x' where bucket_id = 'receipts' and name = $1`,
        [receipt.storage_path],
      ),
    );
    expect(updated.affectedRows ?? 0).toBe(0);
    const deleted = await asUser(f.db, f.treasurer, () =>
      f.db.query(`delete from storage.objects where bucket_id = 'receipts' and name = $1`, [
        receipt.storage_path,
      ]),
    );
    expect(deleted.affectedRows ?? 0).toBe(0);
  });

  it('refuse lecture et envoi à un visiteur anonyme', async () => {
    const receipt = await f.prepareWithPhoto(f.treasurer);
    const unattached = await f.prepare(f.treasurer);
    const asAnon = (sql: string, params: unknown[]) =>
      asRole(f.db, 'anon', null, () => f.db.query(sql, params));
    const { rows } = await asAnon(
      `select id from storage.objects where bucket_id = 'receipts' and name = $1`,
      [receipt.storage_path],
    );
    expect(rows).toHaveLength(0);
    await expect(
      asAnon(`insert into storage.objects (bucket_id, name) values ('receipts', $1)`, [
        unattached.storage_path,
      ]),
    ).rejects.toMatchObject(DENIED);
  });
});
