import { randomUUID } from 'node:crypto';
import type { PGlite } from '@electric-sql/pglite';
import { asUser, createTestDb, createUser } from './db';

/**
 * Banc commun des tests de reçus : une base migrée, un dossier avec un membre de chaque rôle,
 * un second dossier tenu par un non-membre, et les raccourcis préparer, envoyer, rattacher.
 *
 * WHY: les tests de reçus tiennent en deux fichiers (300 lignes au plus chacun) qui partagent
 * ce banc.
 *
 * @example
 *   const f = await createReceiptFixture();
 *   const receipt = await f.prepareWithPhoto(f.treasurer);
 *   await f.attach(f.treasurer, receipt.id, await f.addEntry(f.treasurer));
 */

export const DENIED = { code: '42501' };
export const MAX_BYTES = 5 * 1024 * 1024;

export interface ReceiptRow {
  id: string;
  storage_path: string;
  entry_id: string | null;
  created_by: string | null;
}

export async function createReceiptFixture() {
  const db: PGlite = await createTestDb();

  async function createDossier(userId: string) {
    const { rows } = await asUser(db, userId, () =>
      db.query<{ id: string }>(
        `select public.create_dossier_with_person('death', 'Jean', 'Ndong', 'GA', 'Libreville', '') as id`,
      ),
    );
    return rows[0]!.id;
  }

  const owner = await createUser(db, 'owner@test.local');
  const coordinator = await createUser(db, 'coordinator@test.local');
  const treasurer = await createUser(db, 'treasurer@test.local');
  const contributor = await createUser(db, 'contributor@test.local');
  const viewer = await createUser(db, 'viewer@test.local');
  const stranger = await createUser(db, 'stranger@test.local');
  const dossierId = await createDossier(owner);
  const otherDossierId = await createDossier(stranger);

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
        db.query(`select id from storage.objects where bucket_id = 'receipts' and name = $1`, [
          name,
        ]),
      )
    ).rows.length;

  /** Prépare un reçu et envoie sa photo, comme le navigateur avant l'enregistrement. */
  async function prepareWithPhoto(userId: string) {
    const receipt = await prepare(userId);
    await upload(userId, receipt.storage_path);
    return receipt;
  }

  await addMember(coordinator, 'coordinator');
  await addMember(treasurer, 'treasurer');
  await addMember(contributor, 'contributor');
  await addMember(viewer, 'viewer');

  return {
    db,
    owner,
    coordinator,
    treasurer,
    contributor,
    viewer,
    stranger,
    dossierId,
    otherDossierId,
    createDossier,
    addMember,
    prepare,
    prepareWithPhoto,
    addEntry,
    attach,
    visibleReceipts,
    upload,
    visibleObjects,
  };
}

export type ReceiptFixture = Awaited<ReturnType<typeof createReceiptFixture>>;
