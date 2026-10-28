import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';

/**
 * Banc de test SQL : un Postgres embarqué (PGlite, en mémoire) avec les objets
 * Supabase dont dépendent nos migrations (rôles, schémas `auth` et `storage`,
 * privilèges par défaut), puis toutes les migrations rejouées dans l'ordre.
 *
 * WHY: ni Docker ni la CLI Supabase ne sont requis, donc le test tourne partout
 * (poste de dev et CI) en quelques secondes.
 *
 * @example
 *   const db = await createTestDb();
 *   await asUser(db, userId, () => db.query('select * from "Memorial"'));
 */

const MIGRATIONS_DIR = join(import.meta.dirname, '..', '..', 'migrations');

// WHY: reproduit les grants que Supabase pose sur le schéma public. Sans eux,
// un test RLS passerait « par accident » faute de privilège de table.
const SUPABASE_STUBS = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;

  create schema auth;
  create table auth.users (
    id uuid primary key,
    email text,
    raw_user_meta_data jsonb not null default '{}',
    raw_app_meta_data jsonb not null default '{}',
    created_at timestamptz not null default now()
  );
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
  create function auth.jwt() returns jsonb language sql stable as $$
    select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb
  $$;
  create function auth.role() returns text language sql stable as $$
    select coalesce(auth.jwt() ->> 'role', 'anon')
  $$;

  create schema storage;
  create table storage.buckets (
    id text primary key,
    name text not null,
    owner uuid,
    public boolean default false,
    file_size_limit bigint,
    allowed_mime_types text[],
    created_at timestamptz default now(),
    updated_at timestamptz default now()
  );
  create table storage.objects (
    id uuid primary key default gen_random_uuid(),
    bucket_id text references storage.buckets (id),
    name text,
    owner uuid,
    metadata jsonb,
    archived_at timestamptz,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
  );
  -- WHY: comme Supabase (index bucketid_objname) : un chemin n'existe qu'une fois par bucket.
  create unique index on storage.objects (bucket_id, name);
  alter table storage.objects enable row level security;
  create function storage.foldername(name text) returns text[] language sql immutable as $$
    select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1]
  $$;

  grant usage on schema public, auth, storage to anon, authenticated, service_role;
  grant execute on all functions in schema auth to anon, authenticated, service_role;
  grant all on all tables in schema storage to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
  alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
`;

/** Liste triée des fichiers de migration (ordre = préfixe horodaté). */
export function listMigrations(): string[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();
}

/** Applique les migrations dont le nom satisfait `filter`, dans l'ordre. */
export async function applyMigrations(
  db: PGlite,
  filter: (file: string) => boolean = () => true,
): Promise<void> {
  for (const file of listMigrations().filter(filter)) {
    const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf8');
    try {
      await db.exec(sql);
    } catch (err) {
      throw new Error(`Migration ${file} en échec : ${(err as Error).message}`);
    }
  }
}

/**
 * Démarre une base vierge et applique toutes les migrations, ou seulement
 * celles antérieures à `before` (préfixe horodaté exclu).
 *
 * WHY: `before` permet de tester un backfill en insérant des données entre
 * deux migrations, puis en appliquant la suite avec `applyMigrations`.
 */
export async function createTestDb(options: { before?: string } = {}): Promise<PGlite> {
  const db = new PGlite();
  await db.exec(SUPABASE_STUBS);
  const { before } = options;
  await applyMigrations(db, (file) => before === undefined || file < before);
  return db;
}

/** Crée un utilisateur `auth.users` et renvoie son id. */
export async function createUser(db: PGlite, email: string): Promise<string> {
  const { rows } = await db.query<{ id: string }>(
    'insert into auth.users (id, email) values (gen_random_uuid(), $1) returning id',
    [email],
  );
  const id = rows[0]?.id;
  if (!id) throw new Error('insertion auth.users impossible');
  return id;
}

/**
 * Exécute `fn` avec les droits d'un rôle Supabase, comme le ferait PostgREST
 * avec le JWT de la requête. `userId` absent = visiteur anonyme ; `extraClaims`
 * s'ajoute au JWT (par exemple `app_metadata`) mais ne remplace jamais `sub` ni `role`, et
 * il est ignoré pour un visiteur anonyme.
 */
export async function asRole<T>(
  db: PGlite,
  role: 'anon' | 'authenticated',
  userId: string | null,
  fn: () => Promise<T>,
  extraClaims: Record<string, unknown> = {},
): Promise<T> {
  const claims = JSON.stringify(userId ? { ...extraClaims, sub: userId, role } : { role });
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [userId ?? '']);
  await db.query("select set_config('request.jwt.claims', $1, false)", [claims]);
  await db.exec(`set role ${role}`);
  try {
    return await fn();
  } finally {
    await db.exec('reset role');
    await db.query("select set_config('request.jwt.claim.sub', '', false)");
    await db.query("select set_config('request.jwt.claims', '', false)");
  }
}

/** Raccourci : exécute `fn` en tant qu'utilisateur connecté. */
export function asUser<T>(db: PGlite, userId: string, fn: () => Promise<T>): Promise<T> {
  return asRole(db, 'authenticated', userId, fn);
}

/**
 * Exécute `fn` en tant qu'administrateur de la plateforme : `app_metadata.role = 'Admin'`,
 * comme le lit `is_admin()`.
 */
export function asAdmin<T>(db: PGlite, userId: string, fn: () => Promise<T>): Promise<T> {
  return asRole(db, 'authenticated', userId, fn, { app_metadata: { role: 'Admin' } });
}
