import { randomUUID } from 'node:crypto';
import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { asUser, createTestDb, createUser } from './helpers/db';

let db: PGlite;
let owner: string;
let treasurer: string;
let contributor: string;
let viewer: string;
let stranger: string;
let dossierId: string;
let otherDossierId: string;

const DENIED = { code: '42501' };
const MAX_BYTES = 5 * 1024 * 1024;

interface ReceiptRow {
  id: string;
  storage_path: string;
  entry_id: string | null;
  created_by: string | null;
}

async function createDossier(userId: string) {
  const { rows } = await asUser(db, userId, () =>
    db.query<{ id: string }>(
      `select public.create_dossier_with_person('death', 'Jean', 'Ndong', 'GA', 'Libreville', '') as id`,
    ),
  );
  return rows[0]!.id;
}

async function addMember(userId: string, role: string, dossier = dossierId) {
  await db.query(`insert into dossier_member (dossier_id, user_id, role) values ($1, $2, $3)`, [
    dossier,
    userId,
    role,
  ]);
}

async function prepare(
  userId: string,
  fields: { dossier?: string; mime?: string; size?: number } = {},
) {
  const { rows } = await asUser(db, userId, () =>
    db.query<ReceiptRow>(
      `insert into receipt (dossier_id, mime_type, size_bytes) values ($1, $2, $3)
       returning id, storage_path, entry_id, created_by`,
      [fields.dossier ?? dossierId, fields.mime ?? 'image/jpeg', fields.size ?? 120_000],
    ),
  );
  return rows[0]!;
}

async function addEntry(
  userId: string,
  kind: 'expense' | 'receipt' = 'expense',
  dossier = dossierId,
) {
  const { rows } = await asUser(db, userId, () =>
    db.query<{ id: string }>(
      `insert into ledger_entry (dossier_id, kind, amount, method, party_name, idempotency_key)
       values ($1, $2, 25000, 'cash', 'Pompes funèbres', $3) returning id`,
      [dossier, kind, randomUUID()],
    ),
  );
  return rows[0]!.id;
}

const attach = (userId: string, receiptId: string, entryId: string | null) =>
  asUser(db, userId, () =>
    db.query<{ id: string }>('update receipt set entry_id = $2 where id = $1 returning id', [
      receiptId,
      entryId,
    ]),
  );

const visibleReceipts = async (userId: string, receiptId: string) =>
  (await asUser(db, userId, () => db.query('select id from receipt where id = $1', [receiptId])))
    .rows.length;

const upload = (userId: string, name: string) =>
  asUser(db, userId, () =>
    db.query(`insert into storage.objects (bucket_id, name) values ('receipts', $1)`, [name]),
  );

const visibleObjects = async (userId: string, name: string) =>
  (
    await asUser(db, userId, () =>
      db.query(`select id from storage.objects where bucket_id = 'receipts' and name = $1`, [name]),
    )
  ).rows.length;

beforeAll(async () => {
  db = await createTestDb();
  owner = await createUser(db, 'owner@test.local');
  treasurer = await createUser(db, 'treasurer@test.local');
  contributor = await createUser(db, 'contributor@test.local');
  viewer = await createUser(db, 'viewer@test.local');
  stranger = await createUser(db, 'stranger@test.local');
  dossierId = await createDossier(owner);
  otherDossierId = await createDossier(stranger);
  await addMember(treasurer, 'treasurer');
  await addMember(contributor, 'contributor');
  await addMember(viewer, 'viewer');
});

afterAll(async () => {
  await db?.close();
});

describe('receipt : préparation', () => {
  it('impose le chemin, l’auteur et l’absence de rattachement', async () => {
    const expense = await addEntry(treasurer);
    const { rows } = await asUser(db, treasurer, () =>
      db.query<ReceiptRow>(
        `insert into receipt (dossier_id, entry_id, storage_path, mime_type, size_bytes, created_by)
         values ($1, $2, 'ailleurs/photo.jpg', 'image/png', 1000, $3)
         returning id, storage_path, entry_id, created_by`,
        [dossierId, expense, owner],
      ),
    );
    const row = rows[0]!;
    expect(row.storage_path).toBe(`${dossierId}/${row.id}.png`);
    expect(row.entry_id).toBeNull();
    expect(row.created_by).toBe(treasurer);
  });

  it('donne au chemin l’extension du type', async () => {
    expect((await prepare(treasurer, { mime: 'image/jpeg' })).storage_path).toMatch(/\.jpg$/);
    expect((await prepare(treasurer, { mime: 'image/webp' })).storage_path).toMatch(/\.webp$/);
  });

  it('refuse un contributeur, un lecteur et un non-membre', async () => {
    for (const user of [contributor, viewer, stranger]) {
      await expect(prepare(user)).rejects.toMatchObject(DENIED);
    }
  });

  it('refuse un type ou une taille hors bornes', async () => {
    await expect(prepare(treasurer, { mime: 'image/gif' })).rejects.toMatchObject({
      code: '23514',
    });
    await expect(prepare(treasurer, { size: 0 })).rejects.toMatchObject({ code: '23514' });
    await expect(prepare(treasurer, { size: MAX_BYTES + 1 })).rejects.toMatchObject({
      code: '23514',
    });
    expect((await prepare(treasurer, { size: MAX_BYTES })).id).toBeTruthy();
  });

  it('limite le nombre de reçus par dossier', async () => {
    const fresh = await createDossier(owner);
    await addMember(treasurer, 'treasurer', fresh);
    await asUser(db, treasurer, () =>
      db.query(
        `insert into receipt (dossier_id, mime_type, size_bytes)
         select $1, 'image/jpeg', 1000 from generate_series(1, 200)`,
        [fresh],
      ),
    );
    await expect(prepare(treasurer, { dossier: fresh })).rejects.toMatchObject({ code: 'TL007' });
    // WHY: un non-membre reçoit 42501, pas TL007 : il ne peut pas sonder le nombre de reçus.
    await expect(prepare(stranger, { dossier: fresh })).rejects.toMatchObject(DENIED);
  });
});

describe('receipt : lecture', () => {
  it('réserve un reçu non rattaché au trésorier, puis l’ouvre à tout membre', async () => {
    const receipt = await prepare(treasurer);
    expect(await visibleReceipts(treasurer, receipt.id)).toBe(1);
    expect(await visibleReceipts(owner, receipt.id)).toBe(1);
    expect(await visibleReceipts(contributor, receipt.id)).toBe(0);
    expect(await visibleReceipts(viewer, receipt.id)).toBe(0);
    await attach(treasurer, receipt.id, await addEntry(treasurer));
    expect(await visibleReceipts(viewer, receipt.id)).toBe(1);
    expect(await visibleReceipts(contributor, receipt.id)).toBe(1);
    expect(await visibleReceipts(stranger, receipt.id)).toBe(0);
  });
});

describe('receipt : rattachement', () => {
  it('rattache un reçu à une dépense du dossier, une seule fois', async () => {
    const receipt = await prepare(treasurer);
    const expense = await addEntry(treasurer);
    expect((await attach(treasurer, receipt.id, expense)).rows).toHaveLength(1);
    // WHY: un second envoi du même formulaire rattache de nouveau la même dépense : sans effet.
    expect((await attach(treasurer, receipt.id, expense)).rows).toHaveLength(1);
    await expect(attach(treasurer, receipt.id, await addEntry(treasurer))).rejects.toMatchObject({
      code: 'TL006',
    });
    await expect(attach(treasurer, receipt.id, null)).rejects.toMatchObject({ code: 'TL006' });
  });

  it('refuse une ligne qui n’est pas une dépense ou une dépense d’un autre dossier', async () => {
    const receipt = await prepare(treasurer);
    await expect(
      attach(treasurer, receipt.id, await addEntry(treasurer, 'receipt')),
    ).rejects.toMatchObject({ code: 'TL006' });
    await expect(
      attach(treasurer, receipt.id, await addEntry(stranger, 'expense', otherDossierId)),
    ).rejects.toMatchObject({ code: 'TL006' });
  });

  it('garde un seul reçu par dépense', async () => {
    const expense = await addEntry(treasurer);
    await attach(treasurer, (await prepare(treasurer)).id, expense);
    await expect(attach(treasurer, (await prepare(treasurer)).id, expense)).rejects.toMatchObject({
      code: '23505',
    });
  });

  it('ne laisse modifier que le rattachement, par le trésorier, et jamais supprimer', async () => {
    const receipt = await prepare(treasurer);
    const expense = await addEntry(treasurer);
    expect((await attach(contributor, receipt.id, expense)).rows).toHaveLength(0);
    await expect(
      asUser(db, treasurer, () =>
        db.query(`update receipt set mime_type = 'image/png' where id = $1`, [receipt.id]),
      ),
    ).rejects.toMatchObject(DENIED);
    await expect(
      asUser(db, treasurer, () => db.query('delete from receipt where id = $1', [receipt.id])),
    ).rejects.toMatchObject(DENIED);
  });
});

describe('bucket receipts', () => {
  it('est privé, limité à 5 Mo et aux images JPEG, PNG et WebP', async () => {
    const { rows } = await db.query<{
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
    const receipt = await prepare(treasurer);
    await expect(upload(contributor, receipt.storage_path)).rejects.toMatchObject(DENIED);
    await expect(upload(stranger, receipt.storage_path)).rejects.toMatchObject(DENIED);
    await expect(upload(treasurer, `${dossierId}/${randomUUID()}.jpg`)).rejects.toMatchObject(
      DENIED,
    );
    await upload(treasurer, receipt.storage_path);
    const attached = await prepare(treasurer);
    await attach(treasurer, attached.id, await addEntry(treasurer));
    await expect(upload(treasurer, attached.storage_path)).rejects.toMatchObject(DENIED);
  });

  it('ouvre la photo comme le reçu : trésorier avant rattachement, tout membre après', async () => {
    const receipt = await prepare(treasurer);
    await upload(treasurer, receipt.storage_path);
    expect(await visibleObjects(treasurer, receipt.storage_path)).toBe(1);
    expect(await visibleObjects(viewer, receipt.storage_path)).toBe(0);
    await attach(treasurer, receipt.id, await addEntry(treasurer));
    expect(await visibleObjects(viewer, receipt.storage_path)).toBe(1);
    expect(await visibleObjects(stranger, receipt.storage_path)).toBe(0);
  });

  it('interdit de remplacer ou de supprimer une photo', async () => {
    const receipt = await prepare(treasurer);
    await upload(treasurer, receipt.storage_path);
    const updated = await asUser(db, treasurer, () =>
      db.query(`update storage.objects set name = 'x' where bucket_id = 'receipts' and name = $1`, [
        receipt.storage_path,
      ]),
    );
    expect(updated.affectedRows ?? 0).toBe(0);
    const deleted = await asUser(db, treasurer, () =>
      db.query(`delete from storage.objects where bucket_id = 'receipts' and name = $1`, [
        receipt.storage_path,
      ]),
    );
    expect(deleted.affectedRows ?? 0).toBe(0);
  });
});
