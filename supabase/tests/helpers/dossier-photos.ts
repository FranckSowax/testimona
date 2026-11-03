import type { PGlite } from '@electric-sql/pglite';
import { asUser, createTestDb, createUser } from './db';

/**
 * Banc commun des tests de photos de dossier : une base migrée, un dossier avec un membre de
 * chaque rôle, un second dossier tenu par un non-membre, et les raccourcis préparer, envoyer,
 * désigner comme photo courante, compter les lignes et objets visibles.
 *
 * WHY: les tests de photos tiennent en deux fichiers (table et RPC d'un côté, stockage de
 * l'autre) qui partagent ce banc, comme pour les reçus.
 *
 * @example
 *   const f = await createDossierPhotoFixture();
 *   const photo = await f.prepareWithPhoto(f.coordinator);
 *   await f.setCurrent(f.coordinator, photo.id);
 */

export const DENIED = { code: '42501' };
export const MAX_BYTES = 5 * 1024 * 1024;
export const BUCKET = 'dossier-photos';

export interface DossierPhotoRow {
  id: string;
  dossier_id: string;
  path: string;
  created_by: string | null;
  created_at: string | Date;
  activated_at: string | Date | null;
  archived_at: string | Date | null;
}

const RETURNING = 'id, dossier_id, path, created_by, created_at, activated_at, archived_at';

export async function createDossierPhotoFixture() {
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

  /** Prépare une photo (ligne seule, sans fichier) dans le dossier donné. */
  async function prepare(userId: string, dossier = dossierId) {
    const { rows } = await asUser(db, userId, () =>
      db.query<DossierPhotoRow>(
        `insert into dossier_photo (dossier_id) values ($1) returning ${RETURNING}`,
        [dossier],
      ),
    );
    return rows[0]!;
  }

  const upload = (userId: string, name: string) =>
    asUser(db, userId, () =>
      db.query(`insert into storage.objects (bucket_id, name) values ($1, $2)`, [BUCKET, name]),
    );

  const setCurrent = (userId: string, photoId: string) =>
    asUser(db, userId, () => db.query('select public.set_dossier_photo($1)', [photoId]));

  const visibleRows = async (userId: string, photoId: string) =>
    (
      await asUser(db, userId, () =>
        db.query('select id from dossier_photo where id = $1', [photoId]),
      )
    ).rows.length;

  const visibleObjects = async (userId: string, name: string) =>
    (
      await asUser(db, userId, () =>
        db.query(`select id from storage.objects where bucket_id = $1 and name = $2`, [
          BUCKET,
          name,
        ]),
      )
    ).rows.length;

  /** Relit une photo en superutilisateur du banc, hors RLS. */
  async function read(photoId: string) {
    const { rows } = await db.query<DossierPhotoRow>(
      `select ${RETURNING} from dossier_photo where id = $1`,
      [photoId],
    );
    return rows[0]!;
  }

  /** Prépare une photo et envoie son fichier, comme le navigateur avant la désignation. */
  async function prepareWithPhoto(userId: string, dossier = dossierId) {
    const photo = await prepare(userId, dossier);
    await upload(userId, photo.path);
    return photo;
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
    upload,
    setCurrent,
    visibleRows,
    visibleObjects,
    read,
  };
}

export type DossierPhotoFixture = Awaited<ReturnType<typeof createDossierPhotoFixture>>;
