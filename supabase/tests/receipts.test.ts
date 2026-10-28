import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { asRole, asUser } from './helpers/db';
import {
  createReceiptFixture,
  DENIED,
  MAX_BYTES,
  type ReceiptFixture,
  type ReceiptRow,
} from './helpers/receipts';

let f: ReceiptFixture;

beforeAll(async () => {
  f = await createReceiptFixture();
});

afterAll(async () => {
  await f?.db.close();
});

describe('receipt : préparation', () => {
  it('impose le chemin, l’auteur et l’absence de rattachement', async () => {
    const expense = await f.addEntry(f.treasurer);
    const { rows } = await asUser(f.db, f.treasurer, () =>
      f.db.query<ReceiptRow>(
        `insert into receipt (dossier_id, entry_id, storage_path, mime_type, size_bytes, created_by)
         values ($1, $2, 'ailleurs/photo.jpg', 'image/png', 1000, $3)
         returning id, storage_path, entry_id, created_by`,
        [f.dossierId, expense, f.owner],
      ),
    );
    const row = rows[0]!;
    expect(row.storage_path).toBe(`${f.dossierId}/${row.id}.png`);
    expect(row.entry_id).toBeNull();
    expect(row.created_by).toBe(f.treasurer);
  });

  it('donne au chemin l’extension du type', async () => {
    expect((await f.prepare(f.treasurer, { mime: 'image/jpeg' })).storage_path).toMatch(/\.jpg$/);
    expect((await f.prepare(f.treasurer, { mime: 'image/webp' })).storage_path).toMatch(/\.webp$/);
  });

  it('refuse un contributeur, un lecteur et un non-membre', async () => {
    for (const user of [f.contributor, f.viewer, f.stranger]) {
      await expect(f.prepare(user)).rejects.toMatchObject(DENIED);
    }
  });

  it('laisse un coordinateur préparer et rattacher', async () => {
    const receipt = await f.prepareWithPhoto(f.coordinator);
    expect(receipt.created_by).toBe(f.coordinator);
    const expense = await f.addEntry(f.coordinator);
    expect((await f.attach(f.coordinator, receipt.id, expense)).rows).toHaveLength(1);
  });

  it('refuse un type ou une taille hors bornes', async () => {
    await expect(f.prepare(f.treasurer, { mime: 'image/gif' })).rejects.toMatchObject({
      code: '23514',
    });
    await expect(f.prepare(f.treasurer, { size: 0 })).rejects.toMatchObject({ code: '23514' });
    await expect(f.prepare(f.treasurer, { size: MAX_BYTES + 1 })).rejects.toMatchObject({
      code: '23514',
    });
    expect((await f.prepare(f.treasurer, { size: MAX_BYTES })).id).toBeTruthy();
  });
});

describe('receipt : limite par dossier', () => {
  const prepareMany = (dossier: string) =>
    asUser(f.db, f.treasurer, () =>
      f.db.query(
        `insert into receipt (dossier_id, mime_type, size_bytes)
         select $1, 'image/jpeg', 1000 from generate_series(1, 200)`,
        [dossier],
      ),
    );

  // WHY: la sérialisation de deux préparations concurrentes (verrou sur le dossier) n'est pas
  // testable sous PGlite, qui n'a qu'une connexion ; seul le comptage est vérifié ici.
  it('limite le nombre de reçus récents ou rattachés', async () => {
    const fresh = await f.createDossier(f.owner);
    await f.addMember(f.treasurer, 'treasurer', fresh);
    await prepareMany(fresh);
    await expect(f.prepare(f.treasurer, { dossier: fresh })).rejects.toMatchObject({
      code: 'TL007',
    });
    // WHY: un non-membre reçoit 42501, pas TL007 : il ne peut pas sonder le nombre de reçus.
    await expect(f.prepare(f.stranger, { dossier: fresh })).rejects.toMatchObject(DENIED);
  });

  it('ne compte pas les préparations abandonnées depuis plus de 24 heures', async () => {
    const fresh = await f.createDossier(f.owner);
    await f.addMember(f.treasurer, 'treasurer', fresh);
    await prepareMany(fresh);
    // WHY: le trigger fige created_at ; le mode « replica » (superutilisateur du banc) le
    // contourne pour vieillir les préparations.
    await f.db.exec('set session_replication_role = replica');
    try {
      await f.db.query(
        `update receipt set created_at = now() - interval '25 hours' where dossier_id = $1`,
        [fresh],
      );
    } finally {
      await f.db.exec('set session_replication_role = origin');
    }
    expect((await f.prepare(f.treasurer, { dossier: fresh })).id).toBeTruthy();
  });
});

describe('receipt : lecture', () => {
  it('réserve un reçu non rattaché au trésorier, puis l’ouvre à tout membre', async () => {
    const receipt = await f.prepareWithPhoto(f.treasurer);
    expect(await f.visibleReceipts(f.treasurer, receipt.id)).toBe(1);
    expect(await f.visibleReceipts(f.owner, receipt.id)).toBe(1);
    expect(await f.visibleReceipts(f.contributor, receipt.id)).toBe(0);
    expect(await f.visibleReceipts(f.viewer, receipt.id)).toBe(0);
    await f.attach(f.treasurer, receipt.id, await f.addEntry(f.treasurer));
    expect(await f.visibleReceipts(f.viewer, receipt.id)).toBe(1);
    expect(await f.visibleReceipts(f.contributor, receipt.id)).toBe(1);
    expect(await f.visibleReceipts(f.stranger, receipt.id)).toBe(0);
  });

  it('refuse tout accès à un visiteur anonyme', async () => {
    const receipt = await f.prepareWithPhoto(f.treasurer);
    const asAnon = (sql: string, params: unknown[]) =>
      asRole(f.db, 'anon', null, () => f.db.query(sql, params));
    await expect(
      asAnon('select id from receipt where id = $1', [receipt.id]),
    ).rejects.toMatchObject(DENIED);
    await expect(
      asAnon(
        `insert into receipt (dossier_id, mime_type, size_bytes) values ($1, 'image/jpeg', 1)`,
        [f.dossierId],
      ),
    ).rejects.toMatchObject(DENIED);
    await expect(
      asAnon('update receipt set entry_id = null where id = $1', [receipt.id]),
    ).rejects.toMatchObject(DENIED);
  });
});

describe('receipt : rattachement', () => {
  it('rattache un reçu à une dépense du dossier, une seule fois', async () => {
    const receipt = await f.prepareWithPhoto(f.treasurer);
    const expense = await f.addEntry(f.treasurer);
    expect((await f.attach(f.treasurer, receipt.id, expense)).rows).toHaveLength(1);
    // WHY: un second envoi du même formulaire rattache de nouveau la même dépense : sans effet.
    expect((await f.attach(f.treasurer, receipt.id, expense)).rows).toHaveLength(1);
    await expect(
      f.attach(f.treasurer, receipt.id, await f.addEntry(f.treasurer)),
    ).rejects.toMatchObject({ code: 'TL006' });
    await expect(f.attach(f.treasurer, receipt.id, null)).rejects.toMatchObject({ code: 'TL006' });
  });

  it('refuse le rattachement d’un reçu dont la photo n’a pas été envoyée', async () => {
    const receipt = await f.prepare(f.treasurer);
    await expect(
      f.attach(f.treasurer, receipt.id, await f.addEntry(f.treasurer)),
    ).rejects.toMatchObject({ code: 'TL006' });
  });

  it('refuse une ligne qui n’est pas une dépense ou une dépense d’un autre dossier', async () => {
    const receipt = await f.prepareWithPhoto(f.treasurer);
    await expect(
      f.attach(f.treasurer, receipt.id, await f.addEntry(f.treasurer, 'receipt')),
    ).rejects.toMatchObject({ code: 'TL006' });
    await expect(
      f.attach(f.treasurer, receipt.id, await f.addEntry(f.stranger, 'expense', f.otherDossierId)),
    ).rejects.toMatchObject({ code: 'TL006' });
  });

  it('garde un seul reçu par dépense', async () => {
    const expense = await f.addEntry(f.treasurer);
    await f.attach(f.treasurer, (await f.prepareWithPhoto(f.treasurer)).id, expense);
    await expect(
      f.attach(f.treasurer, (await f.prepareWithPhoto(f.treasurer)).id, expense),
    ).rejects.toMatchObject({ code: '23505' });
  });

  it('ne laisse modifier que le rattachement, par le trésorier, et jamais supprimer', async () => {
    const receipt = await f.prepareWithPhoto(f.treasurer);
    const expense = await f.addEntry(f.treasurer);
    expect((await f.attach(f.contributor, receipt.id, expense)).rows).toHaveLength(0);
    expect((await f.attach(f.viewer, receipt.id, expense)).rows).toHaveLength(0);
    const { rows } = await f.db.query<ReceiptRow>('select entry_id from receipt where id = $1', [
      receipt.id,
    ]);
    expect(rows[0]!.entry_id).toBeNull();
    await expect(
      asUser(f.db, f.treasurer, () =>
        f.db.query(`update receipt set mime_type = 'image/png' where id = $1`, [receipt.id]),
      ),
    ).rejects.toMatchObject(DENIED);
    await expect(
      asUser(f.db, f.treasurer, () =>
        f.db.query('delete from receipt where id = $1', [receipt.id]),
      ),
    ).rejects.toMatchObject(DENIED);
  });
});
