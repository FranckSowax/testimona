import type { PGlite } from '@electric-sql/pglite';
import { asAdmin, asUser, createTestDb, createUser } from './db';

export const DENIED = { code: '42501' };

/**
 * Banc commun des tests de prestataires : une base migrée, un administrateur, un dossier avec un
 * membre de chaque rôle utile, un non-membre et un raccourci pour créer un prestataire.
 *
 * WHY: les tests des prestataires et des demandes de devis tiennent en deux fichiers
 * (300 lignes au plus chacun) qui partagent ce banc.
 *
 * @example
 *   const f = await createProviderFixture();
 *   const id = await f.insertProvider({ whatsapp: '+24177123456', verified_at: new Date() });
 */
export async function createProviderFixture() {
  const db: PGlite = await createTestDb();
  const admin = await createUser(db, 'admin@test.local');
  const owner = await createUser(db, 'owner@test.local');
  const coordinator = await createUser(db, 'coordinator@test.local');
  const contributor = await createUser(db, 'contributor@test.local');
  const viewer = await createUser(db, 'viewer@test.local');
  const stranger = await createUser(db, 'stranger@test.local');
  const { rows } = await asUser(db, owner, () =>
    db.query<{ id: string }>(
      `select public.create_dossier_with_person('death', 'Jean', 'Ndong', 'GA', 'Libreville', '') as id`,
    ),
  );
  const dossierId = rows[0]!.id;
  for (const [user, role] of [
    [coordinator, 'coordinator'],
    [contributor, 'contributor'],
    [viewer, 'viewer'],
  ] as const) {
    await db.query(`insert into dossier_member (dossier_id, user_id, role) values ($1, $2, $3)`, [
      dossierId,
      user,
      role,
    ]);
  }

  /** Crée un prestataire en tant qu'administrateur et renvoie son identifiant. */
  async function insertProvider(fields: Record<string, unknown> = {}) {
    const row = {
      category_key: 'tentsChairs',
      name: 'Tentes Akanda',
      city: 'Libreville',
      ...fields,
    };
    const cols = Object.keys(row);
    const { rows: created } = await asAdmin(db, admin, () =>
      db.query<{ id: string }>(
        `insert into provider (${cols.join(', ')})
         values (${cols.map((_, i) => `$${i + 1}`).join(', ')}) returning id`,
        Object.values(row),
      ),
    );
    return created[0]!.id;
  }

  return {
    db,
    admin,
    owner,
    coordinator,
    contributor,
    viewer,
    stranger,
    dossierId,
    insertProvider,
  };
}

export type ProviderFixture = Awaited<ReturnType<typeof createProviderFixture>>;
