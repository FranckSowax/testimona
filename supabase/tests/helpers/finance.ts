import { randomUUID } from 'node:crypto';
import type { PGlite } from '@electric-sql/pglite';
import { asUser, createTestDb, createUser } from './db';

/**
 * Banc commun des tests de clôture : une base migrée, un utilisateur par rôle, des dossiers neufs
 * et les raccourcis clôturer, rouvrir, écrire dans le registre, les postes et les reçus.
 *
 * WHY: les tests de clôture tiennent en deux fichiers (300 lignes au plus chacun) qui partagent
 * ce banc.
 *
 * @example
 *   const f = await createClosingFixture();
 *   const id = await f.freshDossier();
 *   await f.close(f.treasurer, id);
 *   await expect(f.addLine(f.treasurer, id)).rejects.toMatchObject(CLOSED);
 */

export const DENIED = { code: '42501' };
export const CLOSED = { code: 'TL009' };

export async function createClosingFixture() {
  const db: PGlite = await createTestDb();
  const owner = await createUser(db, 'owner@test.local');
  const coordinator = await createUser(db, 'coordinator@test.local');
  const treasurer = await createUser(db, 'treasurer@test.local');
  const contributor = await createUser(db, 'contributor@test.local');
  const viewer = await createUser(db, 'viewer@test.local');
  const stranger = await createUser(db, 'stranger@test.local');

  async function addMember(dossier: string, userId: string, role: string) {
    await db.query(`insert into dossier_member (dossier_id, user_id, role) values ($1, $2, $3)`, [
      dossier,
      userId,
      role,
    ]);
  }

  /** Dossier neuf du propriétaire, avec un membre de chaque rôle. */
  async function freshDossier() {
    const { rows } = await asUser(db, owner, () =>
      db.query<{ id: string }>(
        `select public.create_dossier_with_person('death', 'Jean', 'Ndong', 'GA', 'Libreville', '') as id`,
      ),
    );
    const id = rows[0]!.id;
    await addMember(id, coordinator, 'coordinator');
    await addMember(id, treasurer, 'treasurer');
    await addMember(id, contributor, 'contributor');
    await addMember(id, viewer, 'viewer');
    return id;
  }

  const close = (userId: string, dossier: string) =>
    asUser(db, userId, () =>
      db.query<{ closed_at: Date }>('select public.close_ledger($1) as closed_at', [dossier]),
    );

  const reopen = (userId: string, dossier: string) =>
    asUser(db, userId, () => db.query('select public.reopen_ledger($1)', [dossier]));

  async function closure(dossier: string) {
    const { rows } = await db.query<{ closed_at: Date | null; closed_by: string | null }>(
      'select closed_at, closed_by from dossier_finance where dossier_id = $1',
      [dossier],
    );
    return rows[0] ?? { closed_at: null, closed_by: null };
  }

  async function events(dossier: string) {
    const { rows } = await db.query<{ action: string; actor_id: string | null }>(
      `select action, actor_id from ledger_closure_event where dossier_id = $1
        order by created_at, action`,
      [dossier],
    );
    return rows;
  }

  async function addEntry(
    userId: string,
    dossier: string,
    kind: 'pledge' | 'receipt' | 'expense' = 'receipt',
    key: string = randomUUID(),
  ) {
    const { rows } = await asUser(db, userId, () =>
      db.query<{ id: string }>(
        `insert into ledger_entry (dossier_id, kind, amount, method, party_name, member_id, idempotency_key)
         values ($1, $2, 10000, $3, 'Oncle Paul', $4, $5) returning id`,
        [dossier, kind, kind === 'pledge' ? null : 'cash', kind === 'pledge' ? userId : null, key],
      ),
    );
    return rows[0]!.id;
  }

  const reverse = (userId: string, dossier: string, entryId: string) =>
    asUser(db, userId, () =>
      db.query(
        `insert into ledger_entry (dossier_id, kind, amount, party_name, reverses_id, idempotency_key)
         values ($1, 'reversal', 1, '-', $2, $3)`,
        [dossier, entryId, randomUUID()],
      ),
    );

  async function addLine(userId: string, dossier: string) {
    const { rows } = await asUser(db, userId, () =>
      db.query<{ id: string }>(
        `insert into budget_line (dossier_id, label) values ($1, 'Fleurs') returning id`,
        [dossier],
      ),
    );
    return rows[0]!.id;
  }

  async function prepareReceipt(userId: string, dossier: string) {
    const { rows } = await asUser(db, userId, () =>
      db.query<{ id: string; storage_path: string }>(
        `insert into receipt (dossier_id, mime_type, size_bytes) values ($1, 'image/jpeg', 1000)
         returning id, storage_path`,
        [dossier],
      ),
    );
    return rows[0]!;
  }

  /** Dépose la photo d'un reçu au stockage, comme le navigateur avant le rattachement. */
  const upload = (storagePath: string) =>
    db.query(`insert into storage.objects (bucket_id, name) values ('receipts', $1)`, [
      storagePath,
    ]);

  const attach = (userId: string, receiptId: string, entryId: string) =>
    asUser(db, userId, () =>
      db.query('update receipt set entry_id = $2 where id = $1', [receiptId, entryId]),
    );

  return {
    db,
    owner,
    coordinator,
    treasurer,
    contributor,
    viewer,
    stranger,
    addMember,
    freshDossier,
    close,
    reopen,
    closure,
    events,
    addEntry,
    reverse,
    addLine,
    prepareReceipt,
    upload,
    attach,
  };
}

export type ClosingFixture = Awaited<ReturnType<typeof createClosingFixture>>;
