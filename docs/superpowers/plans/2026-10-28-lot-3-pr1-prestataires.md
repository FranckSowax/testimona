# Lot 3 · PR 1 — Prestataires : plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** l'équipe Testimona gère les prestataires (création, modification, vérification, désactivation) depuis `/admin/providers` ; la base contient les catégories, une dizaine de prestataires d'exemple jamais contactables et la table des demandes de devis, prête pour les PR 2 et 3.

**Architecture:** une migration crée `provider_category`, `provider` et `quote_request` avec leur RLS, fixe le `search_path` de `is_admin()` et insère les exemples. Un module `apps/web/src/modules/providers/` (catégories, schéma Zod, dépôt, service, actions, écrans) suit le découpage des modules du lot 2 ; l'écran d'administration vit dans l'espace `(admin)` existant et passe par le client utilisateur, la RLS vérifiant `is_admin()`.

**Tech Stack:** Supabase (Postgres 17, RLS, PGlite pour les tests SQL), Next.js 15 (Server Components, server actions), React 19, next-intl 3, Zod 3, Vitest (+ jsdom pour les composants).

Spec : `docs/superpowers/specs/2026-10-28-lot-3-funerailles-design.md` (§ 1 « `provider_category` », « `provider` », « `quote_request` » ; § 3 « Écran d'administration » ; § 6 point 1).

---

## Décisions de ce plan (à valider dans la PR)

- **Pas de client service-role.** L'espace admin historique utilise `getSupabaseAdminClient()` ; les règles ESLint du lot 0 l'interdisent dans tout nouveau fichier. Le module passe donc par `getSupabaseServer()` (client utilisateur) et la RLS de `provider` vérifie `is_admin()`. Le service vérifie aussi le rôle avec `isPlatformAdmin()` (nouveau, `lib/auth/platform-admin.ts`), qui lit `app_metadata.role` comme `requireAdmin()` et `is_admin()`.
- **Garde de page.** Le layout `(admin)/admin/layout.tsx` appelle déjà `requireAdmin()` pour toutes les pages ; les nouvelles pages n'importent pas `lib/supabase/admin`.
- **`quote_request` dès cette PR.** La table, sa RLS et son trigger (TL010) sont créés ici pour garder une seule migration de prestataires ; aucun code web ne l'utilise avant la PR 3.
- **Contrôle du rôle avant TL010.** Le trigger d'insertion de `quote_request` vérifie d'abord le rôle (coordinateur et plus, sinon `42501`), puis le prestataire : un non-membre ne peut pas sonder l'état d'un prestataire, comme pour les reçus.
- **Date de vérification.** Le formulaire envoie une case « Vérifié ». Le service garde la date existante si la case reste cochée, met la date du jour si elle vient d'être cochée, `null` si elle est décochée.
- **Liste admin bornée** à 200 prestataires, triés par ville puis nom ; les filtres réduisent la liste.
- **Types générés.** Le dépôt type ses lignes localement (`.returns<Row[]>()`), comme le lot 2 ; `packages/shared/src/database.types.ts` sera régénéré après application en production, hors de cette PR.

Hors PR : encadré prestataires dans les étapes (PR 2), demande de devis côté web (PR 3), photo et documents (PR 5).

## Structure des fichiers

| Fichier                                                               | Rôle                                                                     |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `supabase/migrations/20261028000300_providers.sql`                    | `is_admin()`, `provider_category`, `provider`, `quote_request`, exemples |
| `supabase/tests/helpers/db.ts`                                        | `asRole` accepte des claims ; nouveau `asAdmin`                          |
| `supabase/tests/providers.test.ts`                                    | Catégories, prestataires, demandes de devis, `is_admin()`                |
| `supabase/tests/migrations.test.ts`                                   | Fonctions de trigger `provider%`, `quote_request%` non exécutables       |
| `supabase/README.md`                                                  | Ligne de la migration                                                    |
| `apps/web/src/lib/auth/platform-admin.ts`                             | `isPlatformAdmin()`                                                      |
| `apps/web/src/modules/providers/categories.ts`                        | `PROVIDER_CATEGORIES`, type `ProviderCategory`                           |
| `apps/web/src/modules/providers/schema.ts`                            | Schémas Zod, type `Provider`                                             |
| `apps/web/src/modules/providers/repo.ts`                              | Seul accès base des prestataires                                         |
| `apps/web/src/modules/providers/service.ts`                           | Lister, lire, créer, modifier ; erreurs typées                           |
| `apps/web/src/modules/providers/actions.ts`                           | Server actions de l'écran admin                                          |
| `apps/web/src/modules/providers/ui/ProviderForm.tsx`                  | Formulaire de création et de modification                                |
| `apps/web/src/modules/providers/ui/ProvidersTable.tsx`                | Tableau de la liste admin                                                |
| `apps/web/src/app/[locale]/(admin)/admin/providers/page.tsx`          | Liste filtrable                                                          |
| `apps/web/src/app/[locale]/(admin)/admin/providers/new/page.tsx`      | Création                                                                 |
| `apps/web/src/app/[locale]/(admin)/admin/providers/[id]/page.tsx`     | Modification                                                             |
| `apps/web/src/components/admin/AdminSidebarNav.tsx`, `AdminShell.tsx` | Entrée « Prestataires »                                                  |
| `apps/web/messages/{fr,en}.json`                                      | `admin.nav.providers`, espace `providers.*`                              |

Règles : accès base uniquement dans `repo.ts` (client utilisateur, jamais service-role), 300 lignes au plus par fichier (tests compris), `pnpm exec prettier --write <fichier>` sur chaque fichier modifié (un chemin par commande en zsh). Commits conventionnels en anglais terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Commentaires et JSDoc en français, `// WHY:` pour les choix. Couleurs : `text-foreground` pour le texte, `text-secondary font-semibold underline` pour les liens, `buttonClasses({ variant: 'secondary' })` pour les boutons, `text-destructive` avec `role="alert"` pour les erreurs ; jamais `text-primary`, `text-muted-foreground` pour un texte à lire, ni `bg-accent`. Formulaires client : `onSubmit` + `startTransition(() => formAction(data))`, jamais `<form action>` (un formulaire GET de filtre reste permis). Un fichier `'use server'` n'exporte que des fonctions async et des types. Journaux : codes et contexte seulement. Ne jamais utiliser `git checkout --`, `git restore`, `git reset --hard`, `git stash`, `git add -A`, `git push`, et ne jamais écrire un fichier par Bash pour contourner un hook.

---

### Tâche 1 : migration des prestataires

**Files:**

- Modify: `supabase/tests/helpers/db.ts`
- Create: `supabase/tests/providers.test.ts`
- Create: `supabase/migrations/20261028000300_providers.sql`
- Modify: `supabase/tests/migrations.test.ts`
- Modify: `supabase/README.md`

- [ ] **Étape 1 : permettre des claims supplémentaires dans le banc de test**

Dans `supabase/tests/helpers/db.ts`, remplacer `asRole` et ajouter `asAdmin` juste après `asUser` :

```ts
/**
 * Exécute `fn` avec les droits d'un rôle Supabase, comme le ferait PostgREST
 * avec le JWT de la requête. `userId` absent = visiteur anonyme ; `extraClaims`
 * s'ajoute au JWT (par exemple `app_metadata`).
 */
export async function asRole<T>(
  db: PGlite,
  role: 'anon' | 'authenticated',
  userId: string | null,
  fn: () => Promise<T>,
  extraClaims: Record<string, unknown> = {},
): Promise<T> {
  const claims = JSON.stringify(userId ? { sub: userId, role, ...extraClaims } : { role });
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
```

```ts
/**
 * Exécute `fn` en tant qu'administrateur de la plateforme : `app_metadata.role = 'Admin'`,
 * comme le lit `is_admin()`.
 */
export function asAdmin<T>(db: PGlite, userId: string, fn: () => Promise<T>): Promise<T> {
  return asRole(db, 'authenticated', userId, fn, { app_metadata: { role: 'Admin' } });
}
```

- [ ] **Étape 2 : écrire le test SQL (il échoue)**

`supabase/tests/providers.test.ts` :

```ts
import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { asAdmin, asRole, asUser, createTestDb, createUser } from './helpers/db';

const DENIED = { code: '42501' };

let db: PGlite;
let admin: string;
let owner: string;
let coordinator: string;
let contributor: string;
let stranger: string;
let dossierId: string;
let verified: string;
let example: string;
let inactive: string;

async function insertProvider(fields: Record<string, unknown>) {
  const row = { category_key: 'tentsChairs', name: 'Tentes Akanda', city: 'Libreville', ...fields };
  const cols = Object.keys(row);
  const { rows } = await asAdmin(db, admin, () =>
    db.query<{ id: string }>(
      `insert into provider (${cols.join(', ')})
       values (${cols.map((_, i) => `$${i + 1}`).join(', ')}) returning id`,
      Object.values(row),
    ),
  );
  return rows[0]!.id;
}

const requestQuote = (userId: string, providerId: string) =>
  asUser(db, userId, () =>
    db.query<{ id: string; created_by: string | null }>(
      `insert into quote_request (dossier_id, provider_id, step_id, message, created_by)
       values ($1, $2, 'vigil-setup', 'Bonjour, une tente pour samedi.', $3)
       returning id, created_by`,
      [dossierId, providerId, owner],
    ),
  );

beforeAll(async () => {
  db = await createTestDb();
  admin = await createUser(db, 'admin@test.local');
  owner = await createUser(db, 'owner@test.local');
  coordinator = await createUser(db, 'coordinator@test.local');
  contributor = await createUser(db, 'contributor@test.local');
  stranger = await createUser(db, 'stranger@test.local');
  const { rows } = await asUser(db, owner, () =>
    db.query<{ id: string }>(
      `select public.create_dossier_with_person('death', 'Jean', 'Ndong', 'GA', 'Libreville', '') as id`,
    ),
  );
  dossierId = rows[0]!.id;
  for (const [user, role] of [
    [coordinator, 'coordinator'],
    [contributor, 'contributor'],
  ] as const) {
    await db.query(`insert into dossier_member (dossier_id, user_id, role) values ($1, $2, $3)`, [
      dossierId,
      user,
      role,
    ]);
  }
  verified = await insertProvider({ whatsapp: '+24177123456', verified_at: new Date() });
  example = await insertProvider({ name: 'Tentes de test', is_example: true });
  inactive = await insertProvider({ whatsapp: '+24166123456', active: false });
});

afterAll(async () => {
  await db?.close();
});

describe('provider_category', () => {
  it('liste les sept catégories dans l’ordre', async () => {
    const { rows } = await asUser(db, contributor, () =>
      db.query<{ key: string }>('select key from provider_category order by position'),
    );
    expect(rows.map((r) => r.key)).toEqual([
      'funeralHome',
      'tentsChairs',
      'sound',
      'lighting',
      'catering',
      'drinks',
      'printing',
    ]);
  });

  it('refuse toute écriture par l’API, même à un administrateur', async () => {
    await expect(
      asAdmin(db, admin, () =>
        db.query(`insert into provider_category (key, position) values ('flowers', 50)`),
      ),
    ).rejects.toMatchObject(DENIED);
  });
});

describe('provider', () => {
  it('contient dix prestataires d’exemple sans numéro ni vérification', async () => {
    const { rows } = await db.query<{ n: number; reachable: number }>(
      `select count(*)::int as n,
              count(*) filter (where whatsapp is not null or verified_at is not null)::int as reachable
       from provider where is_example and name like '%(exemple)'`,
    );
    expect(rows[0]).toEqual({ n: 10, reachable: 0 });
  });

  it('refuse un exemple avec un numéro ou une vérification', async () => {
    const check = { code: '23514' };
    await expect(
      insertProvider({ is_example: true, whatsapp: '+24177000000' }),
    ).rejects.toMatchObject(check);
    await expect(
      insertProvider({ is_example: true, verified_at: new Date() }),
    ).rejects.toMatchObject(check);
  });

  it('refuse un numéro qui n’est pas au format international', async () => {
    await expect(insertProvider({ whatsapp: '077123456' })).rejects.toMatchObject({
      code: '23514',
    });
  });

  it('montre à un connecté les seuls prestataires actifs', async () => {
    const { rows } = await asUser(db, contributor, () =>
      db.query<{ id: string }>('select id from provider where id = any($1)', [
        [verified, inactive],
      ]),
    );
    expect(rows.map((r) => r.id)).toEqual([verified]);
  });

  it('laisse un administrateur modifier un prestataire inactif', async () => {
    const { rows } = await asAdmin(db, admin, () =>
      db.query<{ name: string }>(
        `update provider set name = 'Tentes Owendo' where id = $1 returning name`,
        [inactive],
      ),
    );
    expect(rows).toEqual([{ name: 'Tentes Owendo' }]);
  });

  it('refuse l’écriture à un non-administrateur', async () => {
    await expect(
      asUser(db, owner, () =>
        db.query(
          `insert into provider (category_key, name, city) values ('sound', 'X', 'Libreville')`,
        ),
      ),
    ).rejects.toMatchObject(DENIED);
    const { rows } = await asUser(db, owner, () =>
      db.query(`update provider set name = 'Piraté' where id = $1 returning id`, [verified]),
    );
    expect(rows).toHaveLength(0);
  });

  it('interdit la suppression, même à un administrateur', async () => {
    await expect(
      asAdmin(db, admin, () => db.query('delete from provider where id = $1', [inactive])),
    ).rejects.toMatchObject(DENIED);
  });

  it('refuse tout accès anonyme', async () => {
    await expect(
      asRole(db, 'anon', null, () => db.query('select id from provider')),
    ).rejects.toMatchObject(DENIED);
  });
});

describe('quote_request', () => {
  it('laisse un coordinateur demander un devis et impose l’auteur', async () => {
    const { rows } = await requestQuote(coordinator, verified);
    expect(rows[0]!.created_by).toBe(coordinator);
  });

  it('refuse un prestataire d’exemple ou inactif (TL010)', async () => {
    for (const provider of [example, inactive]) {
      await expect(requestQuote(owner, provider)).rejects.toMatchObject({ code: 'TL010' });
    }
  });

  it('refuse un contributeur et un non-membre avant d’examiner le prestataire', async () => {
    for (const user of [contributor, stranger]) {
      await expect(requestQuote(user, example)).rejects.toMatchObject(DENIED);
    }
  });

  it('montre les demandes aux seuls membres du dossier', async () => {
    const count = (user: string) =>
      asUser(db, user, () =>
        db.query<{ n: number }>('select count(*)::int as n from quote_request'),
      ).then(({ rows }) => rows[0]!.n);
    expect(await count(contributor)).toBeGreaterThan(0);
    expect(await count(stranger)).toBe(0);
  });

  it('interdit la modification et la suppression', async () => {
    await expect(
      asUser(db, owner, () => db.query(`update quote_request set message = 'x'`)),
    ).rejects.toMatchObject(DENIED);
    await expect(
      asUser(db, owner, () => db.query('delete from quote_request')),
    ).rejects.toMatchObject(DENIED);
  });
});

describe('is_admin', () => {
  it('fixe le search_path sans changer la règle', async () => {
    const { rows } = await db.query<{ config: string[] }>(
      `select proconfig as config from pg_proc where proname = 'is_admin'`,
    );
    expect(rows[0]!.config).toContain('search_path=""');
    const isAdmin = (run: typeof asUser) =>
      run(db, admin, () => db.query<{ ok: boolean }>('select public.is_admin() as ok')).then(
        ({ rows: r }) => r[0]!.ok,
      );
    expect(await isAdmin(asAdmin)).toBe(true);
    expect(await isAdmin(asUser)).toBe(false);
  });
});
```

- [ ] **Étape 3 : vérifier que le test échoue**

Run: `pnpm --filter @testimona/supabase test -- providers`
Expected: FAIL, `relation "provider" does not exist` (ou `provider_category`).

- [ ] **Étape 4 : écrire la migration**

`supabase/migrations/20261028000300_providers.sql` :

```sql
-- Lot 3, PR 1 : prestataires vérifiés, catégories et demandes de devis.
-- Spec : docs/superpowers/specs/2026-10-28-lot-3-funerailles-design.md, § 1.

-- ---------------------------------------------------------------------------
-- is_admin : search_path fixé (alerte 0011 de l'advisor), logique inchangée.
-- WHY: le rôle vient de app_metadata, que l'utilisateur ne peut pas modifier.
-- `create or replace` garde les droits d'exécution existants.
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'Admin', false);
$$;

-- ---------------------------------------------------------------------------
-- Catégories : référence fixe, libellés dans les textes FR/EN.
-- ---------------------------------------------------------------------------
create table public.provider_category (
  key text primary key check (key ~ '^[a-z][a-zA-Z]{1,39}$'),
  position smallint not null unique check (position between 0 and 100)
);

alter table public.provider_category enable row level security;
revoke all on public.provider_category from anon, authenticated;
grant select on public.provider_category to authenticated;

create policy provider_category_select on public.provider_category
  for select to authenticated using (true);

insert into public.provider_category (key, position) values
  ('funeralHome', 0),
  ('tentsChairs', 1),
  ('sound', 2),
  ('lighting', 3),
  ('catering', 4),
  ('drinks', 5),
  ('printing', 6);

-- ---------------------------------------------------------------------------
-- Prestataires : écrits par l'équipe Testimona seulement, jamais supprimés.
-- ---------------------------------------------------------------------------
create table public.provider (
  id uuid primary key default gen_random_uuid(),
  category_key text not null references public.provider_category (key),
  name text not null check (char_length(name) between 1 and 120),
  city text not null check (char_length(city) between 1 and 120),
  district text check (district is null or char_length(district) between 1 and 120),
  whatsapp text check (whatsapp is null or whatsapp ~ '^\+[1-9][0-9]{7,14}$'),
  price_note text check (price_note is null or char_length(price_note) between 1 and 200),
  is_example boolean not null default false,
  verified_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- WHY: un prestataire d'exemple ne doit jamais pouvoir être contacté par une famille.
  constraint provider_example_unreachable
    check (not is_example or (whatsapp is null and verified_at is null))
);

create index provider_city_category_idx on public.provider (city, category_key) where active;
create index provider_category_key_idx on public.provider (category_key);

-- WHY: l'identifiant et la date de création sont figés ; la date de modification est imposée.
create function public.provider_before_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.id := old.id;
  new.created_at := old.created_at;
  new.updated_at := now();
  return new;
end;
$$;

revoke execute on function public.provider_before_update() from public, anon, authenticated;

create trigger provider_before_update
  before update on public.provider
  for each row execute function public.provider_before_update();

alter table public.provider enable row level security;
revoke all on public.provider from anon, authenticated;
grant select, insert, update on public.provider to authenticated;

create policy provider_select on public.provider
  for select to authenticated using (active or public.is_admin());
create policy provider_insert on public.provider
  for insert to authenticated with check (public.is_admin());
create policy provider_update on public.provider
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- WHY: prestataires fictifs du pilote, sans numéro ni vérification (contrainte ci-dessus).
insert into public.provider (category_key, name, city, district, price_note, is_example) values
  ('funeralHome', 'Pompes funèbres du Centre (exemple)', 'Libreville', 'Centre-ville', 'Prix à demander', true),
  ('funeralHome', 'Services funéraires de l''Estuaire (exemple)', 'Libreville', 'Louis', 'Prix à demander', true),
  ('tentsChairs', 'Location Akanda (exemple)', 'Libreville', 'Akanda', 'Tente 5×10 m, prix indicatif', true),
  ('tentsChairs', 'Chaises et bâches Nzeng-Ayong (exemple)', 'Libreville', 'Nzeng-Ayong', 'Lot de 50 chaises, prix indicatif', true),
  ('sound', 'Sono Owendo (exemple)', 'Libreville', 'Owendo', 'Soirée de veillée, prix indicatif', true),
  ('lighting', 'Éclairage Glass (exemple)', 'Libreville', 'Glass', 'Jeu de lumières, prix indicatif', true),
  ('catering', 'Traiteur Mont-Bouët (exemple)', 'Libreville', 'Mont-Bouët', 'Repas par personne, prix indicatif', true),
  ('catering', 'Cuisine de la veillée (exemple)', 'Libreville', 'PK8', 'Collation par personne, prix indicatif', true),
  ('drinks', 'Boissons Lalala (exemple)', 'Libreville', 'Lalala', 'Packs d''eau et sodas, prix indicatif', true),
  ('printing', 'Imprimerie Batterie IV (exemple)', 'Libreville', 'Batterie IV', 'Livrets et affiches, prix indicatif', true);

-- ---------------------------------------------------------------------------
-- Demandes de devis : trace en ajout seul, utilisée à la PR 3.
-- ---------------------------------------------------------------------------
create table public.quote_request (
  id uuid primary key default gen_random_uuid(),
  dossier_id uuid not null references public.dossier (id) on delete cascade,
  provider_id uuid not null references public.provider (id),
  step_id text not null check (step_id in ('vigil-setup', 'vigil-catering', 'ceremony-program')),
  message text not null check (char_length(message) between 1 and 2000),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index quote_request_dossier_idx on public.quote_request (dossier_id, created_at desc);
create index quote_request_provider_idx on public.quote_request (provider_id);
create index quote_request_created_by_idx on public.quote_request (created_by);

-- WHY: security definer pour lire un prestataire inactif, que la RLS cache aux familles. Le rôle
-- est vérifié en premier : un non-membre reçoit 42501, jamais TL010, et ne peut pas sonder l'état
-- d'un prestataire.
create function public.quote_request_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_dossier_member(new.dossier_id, 'coordinator') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.provider p
    where p.id = new.provider_id and p.active and not p.is_example and p.whatsapp is not null
  ) then
    raise exception 'provider not reachable' using errcode = 'TL010';
  end if;
  new.created_by := auth.uid();
  new.created_at := now();
  return new;
end;
$$;

revoke execute on function public.quote_request_before_insert() from public, anon, authenticated;

create trigger quote_request_before_insert
  before insert on public.quote_request
  for each row execute function public.quote_request_before_insert();

alter table public.quote_request enable row level security;
revoke all on public.quote_request from anon, authenticated;
grant select, insert on public.quote_request to authenticated;

create policy quote_request_select on public.quote_request
  for select to authenticated using (public.is_dossier_member(dossier_id, 'viewer'));
create policy quote_request_insert on public.quote_request
  for insert to authenticated with check (public.is_dossier_member(dossier_id, 'coordinator'));
```

- [ ] **Étape 5 : vérifier que le test passe**

Run: `pnpm --filter @testimona/supabase test -- providers`
Expected: PASS (15 tests).

- [ ] **Étape 6 : étendre le contrôle des fonctions de trigger**

Dans `supabase/tests/migrations.test.ts`, test « n'expose aucune fonction de trigger du dossier aux rôles de l'API », ajouter deux lignes à la condition, après `or p.proname like 'receipt%'` :

```sql
          or p.proname like 'provider%'
          or p.proname like 'quote_request%'
```

Run: `pnpm --filter @testimona/supabase test`
Expected: PASS, toute la suite (dont « active la RLS sur 100 % des tables du schéma public »).

- [ ] **Étape 7 : documenter la migration**

Dans `supabase/README.md`, tableau des migrations, après la ligne `20261028000200_closing.sql` :

```markdown
| `20261028000300_providers.sql` | Lot 3 : prestataires, catégories, demandes de devis, `search_path` de `is_admin()` |
```

Puis `pnpm exec prettier --write supabase/README.md`.

- [ ] **Étape 8 : commit**

```bash
git add supabase/migrations/20261028000300_providers.sql supabase/tests/providers.test.ts supabase/tests/helpers/db.ts supabase/tests/migrations.test.ts supabase/README.md
git commit -m "feat(db): add providers, categories and quote requests

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tâche 2 : catégories, schéma et contrôle administrateur

**Files:**

- Create: `apps/web/src/modules/providers/categories.ts`
- Create: `apps/web/src/modules/providers/schema.ts`
- Create: `apps/web/src/modules/providers/schema.test.ts`
- Create: `apps/web/src/lib/auth/platform-admin.ts`
- Create: `apps/web/src/lib/auth/platform-admin.test.ts`

- [ ] **Étape 1 : écrire les tests (ils échouent)**

`apps/web/src/modules/providers/schema.test.ts` :

```ts
import { describe, expect, it } from 'vitest';
import { ProviderFiltersSchema, ProviderSchema, ProviderUpdateSchema } from './schema';

const PROVIDER = '66666666-6666-4666-8666-666666666666';
const base = {
  categoryKey: 'tentsChairs',
  name: 'Tentes Akanda',
  city: 'Libreville',
  district: '',
  whatsapp: '',
  priceNote: '',
  isExample: false,
  verified: false,
  active: true,
};

const messages = (input: unknown) => {
  const res = ProviderSchema.safeParse(input);
  return res.success ? {} : Object.fromEntries(res.error.issues.map((i) => [i.path[0], i.message]));
};

describe('ProviderSchema', () => {
  it('normalise le numéro et vide les champs facultatifs', () => {
    const data = ProviderSchema.parse({
      ...base,
      whatsapp: '+241 77 12-34-56',
      district: '  Akanda ',
    });
    expect(data).toMatchObject({ whatsapp: '+24177123456', district: 'Akanda', priceNote: null });
  });

  it('refuse un numéro sans indicatif international', () => {
    expect(messages({ ...base, whatsapp: '077123456' })).toEqual({ whatsapp: 'invalid phone' });
  });

  it('refuse un exemple avec un numéro ou une vérification', () => {
    expect(messages({ ...base, isExample: true, whatsapp: '+24177123456' })).toEqual({
      isExample: 'example with contact',
    });
    expect(messages({ ...base, isExample: true, verified: true })).toEqual({
      isExample: 'example with contact',
    });
  });

  it('exige un nom et une ville', () => {
    expect(messages({ ...base, name: ' ', city: '' })).toEqual({
      name: 'required',
      city: 'required',
    });
  });

  it('compte les caractères comme la base', () => {
    expect(messages({ ...base, name: 'é'.repeat(120) })).toEqual({});
    expect(messages({ ...base, name: 'é'.repeat(121) })).toEqual({ name: 'too long' });
    expect(messages({ ...base, priceNote: 'x'.repeat(201) })).toEqual({ priceNote: 'too long' });
  });

  it('refuse une catégorie inconnue et le caractère NUL', () => {
    expect(ProviderSchema.safeParse({ ...base, categoryKey: 'flowers' }).success).toBe(false);
    expect(messages({ ...base, name: 'a\u0000b' })).toEqual({ name: 'invalid character' });
  });
});

describe('ProviderUpdateSchema', () => {
  it('exige l’identifiant du prestataire', () => {
    expect(ProviderUpdateSchema.safeParse(base).success).toBe(false);
    expect(ProviderUpdateSchema.parse({ ...base, providerId: PROVIDER }).providerId).toBe(PROVIDER);
  });
});

describe('ProviderFiltersSchema', () => {
  it('ignore un filtre vide ou une catégorie inconnue', () => {
    expect(ProviderFiltersSchema.parse({ city: '  ', category: 'flowers' })).toEqual({
      city: undefined,
      category: undefined,
    });
    expect(ProviderFiltersSchema.parse({ city: 'Libreville', category: 'sound' })).toEqual({
      city: 'Libreville',
      category: 'sound',
    });
  });
});
```

`apps/web/src/lib/auth/platform-admin.test.ts` :

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { server } = vi.hoisted(() => ({ server: { getCurrentUser: vi.fn() } }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase/server', () => server);

const { isPlatformAdmin } = await import('./platform-admin');

describe('isPlatformAdmin', () => {
  beforeEach(() => server.getCurrentUser.mockReset());

  it('reconnaît le rôle Admin de app_metadata', async () => {
    server.getCurrentUser.mockResolvedValue({ app_metadata: { role: 'Admin' } });
    expect(await isPlatformAdmin()).toBe(true);
  });

  it('ignore user_metadata, modifiable par l’utilisateur', async () => {
    server.getCurrentUser.mockResolvedValue({
      app_metadata: {},
      user_metadata: { role: 'Admin' },
    });
    expect(await isPlatformAdmin()).toBe(false);
  });

  it('refuse un visiteur non connecté', async () => {
    server.getCurrentUser.mockResolvedValue(null);
    expect(await isPlatformAdmin()).toBe(false);
  });
});
```

- [ ] **Étape 2 : vérifier qu'ils échouent**

Run: `pnpm --filter @testimona/web test -- src/modules/providers/schema src/lib/auth/platform-admin`
Expected: FAIL, modules introuvables.

- [ ] **Étape 3 : écrire le code**

`apps/web/src/modules/providers/categories.ts` :

```ts
/**
 * Catégories de prestataires, dans l'ordre d'affichage ; mêmes clés et même ordre que
 * `provider_category` en base. Libellés : `providers.category.<clé>`.
 *
 * @example
 * PROVIDER_CATEGORIES.map((key) => t(`providers.category.${key}`));
 */
export const PROVIDER_CATEGORIES = [
  'funeralHome',
  'tentsChairs',
  'sound',
  'lighting',
  'catering',
  'drinks',
  'printing',
] as const;

export type ProviderCategory = (typeof PROVIDER_CATEGORIES)[number];
```

`apps/web/src/modules/providers/schema.ts` :

```ts
import { z } from 'zod';
import { PROVIDER_CATEGORIES, type ProviderCategory } from './categories';

// WHY: text refuse le caractère NUL ; on le refuse avant la base.
const noNul = (s: string) => !s.includes('\u0000');
// WHY: compter en caractères comme char_length en base, pas en unités UTF-16.
const maxChars = (n: number) => (s: string) => [...s].length <= n;
/** Même motif que la contrainte de `provider.whatsapp`. */
const PHONE = /^\+[1-9][0-9]{7,14}$/;

const text = (max: number) =>
  z
    .string()
    .trim()
    .min(1, 'required')
    .refine(maxChars(max), 'too long')
    .refine(noNul, 'invalid character');

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .transform((s) => (s === '' ? null : s))
    .pipe(
      z.union([
        z.null(),
        z.string().refine(maxChars(max), 'too long').refine(noNul, 'invalid character'),
      ]),
    );

// WHY: un numéro se saisit avec des espaces, tirets, points ou parenthèses ; on ne garde que
// l'indicatif et les chiffres.
const whatsapp = z
  .string()
  .transform((s) => s.replace(/[\s().-]/g, ''))
  .transform((s) => (s === '' ? null : s))
  .pipe(z.union([z.null(), z.string().regex(PHONE, 'invalid phone')]));

const fields = z.object({
  categoryKey: z.enum(PROVIDER_CATEGORIES),
  name: text(120),
  city: text(120),
  district: optionalText(120),
  whatsapp,
  priceNote: optionalText(200),
  isExample: z.boolean(),
  verified: z.boolean(),
  active: z.boolean(),
});

/** WHY: miroir de la contrainte `provider_example_unreachable`, pour un message lisible. */
function exampleUnreachable(p: z.infer<typeof fields>, ctx: z.RefinementCtx) {
  if (p.isExample && (p.whatsapp !== null || p.verified)) {
    ctx.addIssue({ code: 'custom', path: ['isExample'], message: 'example with contact' });
  }
}

/** Nouveau prestataire saisi par l'équipe Testimona. */
export const ProviderSchema = fields.superRefine(exampleUnreachable);

/** Modification d'un prestataire existant. */
export const ProviderUpdateSchema = fields
  .extend({ providerId: z.string().uuid() })
  .superRefine(exampleUnreachable);

export type ProviderInput = z.infer<typeof ProviderSchema>;

/** Filtres de la liste admin ; une valeur vide ou inconnue est ignorée. */
export const ProviderFiltersSchema = z.object({
  city: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((v) => v || undefined),
  category: z.enum(PROVIDER_CATEGORIES).optional().catch(undefined),
});

export type ProviderFilters = z.infer<typeof ProviderFiltersSchema>;

/** Prestataire lu en base. */
export interface Provider {
  id: string;
  categoryKey: ProviderCategory;
  name: string;
  city: string;
  district: string | null;
  whatsapp: string | null;
  priceNote: string | null;
  isExample: boolean;
  verifiedAt: string | null;
  active: boolean;
}
```

`apps/web/src/lib/auth/platform-admin.ts` :

```ts
import 'server-only';
import { getCurrentUser } from '@/lib/supabase/server';

/**
 * Vrai si l'utilisateur connecté administre la plateforme Testimona.
 * WHY: même règle que `requireAdmin()` et que `is_admin()` en base : le rôle vient de
 * `app_metadata`, que l'utilisateur ne peut pas modifier (jamais de `user_metadata`). Ce fichier
 * n'importe pas le client service-role.
 *
 * @example
 * if (!(await isPlatformAdmin())) return { ok: false, error: 'forbidden' };
 */
export async function isPlatformAdmin(): Promise<boolean> {
  const user = await getCurrentUser();
  return (user?.app_metadata as { role?: string } | undefined)?.role === 'Admin';
}
```

- [ ] **Étape 4 : vérifier qu'ils passent**

Run: `pnpm --filter @testimona/web test -- src/modules/providers/schema src/lib/auth/platform-admin`
Expected: PASS (11 tests).

- [ ] **Étape 5 : formater et commiter**

```bash
pnpm exec prettier --write apps/web/src/modules/providers/categories.ts
pnpm exec prettier --write apps/web/src/modules/providers/schema.ts
pnpm exec prettier --write apps/web/src/modules/providers/schema.test.ts
pnpm exec prettier --write apps/web/src/lib/auth/platform-admin.ts
pnpm exec prettier --write apps/web/src/lib/auth/platform-admin.test.ts
git add apps/web/src/modules/providers/categories.ts apps/web/src/modules/providers/schema.ts apps/web/src/modules/providers/schema.test.ts apps/web/src/lib/auth/platform-admin.ts apps/web/src/lib/auth/platform-admin.test.ts
git commit -m "feat(providers): add categories, schemas and the admin check

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tâche 3 : dépôt et service

**Files:**

- Create: `apps/web/src/modules/providers/repo.ts`
- Create: `apps/web/src/modules/providers/service.ts`
- Create: `apps/web/src/modules/providers/service.test.ts`

- [ ] **Étape 1 : écrire le test du service (il échoue)**

`apps/web/src/modules/providers/service.test.ts` :

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { repo, admin } = vi.hoisted(() => ({
  repo: {
    listProviders: vi.fn(),
    getProvider: vi.fn(),
    insertProvider: vi.fn(),
    updateProvider: vi.fn(),
  },
  admin: { isPlatformAdmin: vi.fn() },
}));

vi.mock('server-only', () => ({}));
vi.mock('./repo', () => repo);
vi.mock('@/lib/auth/platform-admin', () => admin);

const { createProvider, getProvider, listProviders, updateProvider } = await import('./service');

const PROVIDER = '66666666-6666-4666-8666-666666666666';
const NOW = '2026-10-28T12:00:00.000Z';
const OLD = '2026-10-01T09:00:00.000Z';
const input = {
  categoryKey: 'tentsChairs',
  name: 'Tentes Akanda',
  city: 'Libreville',
  district: '',
  whatsapp: '+241 77 12 34 56',
  priceNote: '',
  isExample: false,
  verified: true,
  active: true,
};
const stored = { id: PROVIDER, verifiedAt: OLD };
const fail = (code: string) => ({ data: null, error: { code, message: code } });

beforeEach(() => {
  for (const fn of Object.values(repo)) fn.mockReset();
  admin.isPlatformAdmin.mockResolvedValue(true);
  vi.useFakeTimers();
  vi.setSystemTime(new Date(NOW));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('contrôle administrateur', () => {
  it('refuse un non-administrateur sans toucher la base', async () => {
    admin.isPlatformAdmin.mockResolvedValue(false);
    expect(await listProviders({})).toEqual({ ok: false, error: 'forbidden' });
    expect(await createProvider(input)).toEqual({ ok: false, error: 'forbidden' });
    expect(await updateProvider({ ...input, providerId: PROVIDER })).toEqual({
      ok: false,
      error: 'forbidden',
    });
    for (const fn of Object.values(repo)) expect(fn).not.toHaveBeenCalled();
  });
});

describe('createProvider', () => {
  it('crée un prestataire vérifié à la date du jour', async () => {
    repo.insertProvider.mockResolvedValue({ data: { id: PROVIDER }, error: null });
    expect(await createProvider(input)).toEqual({ ok: true, data: { id: PROVIDER } });
    expect(repo.insertProvider).toHaveBeenCalledWith(
      expect.objectContaining({ whatsapp: '+24177123456', verifiedAt: NOW, district: null }),
    );
  });

  it('renvoie les erreurs de champ sans écrire', async () => {
    expect(await createProvider({ ...input, whatsapp: 'abc' })).toEqual({
      ok: false,
      error: 'validation',
      fieldErrors: { whatsapp: 'invalid phone' },
    });
    expect(repo.insertProvider).not.toHaveBeenCalled();
  });

  it('traduit un refus de la base', async () => {
    repo.insertProvider.mockResolvedValue(fail('42501'));
    expect(await createProvider(input)).toEqual({ ok: false, error: 'forbidden' });
    repo.insertProvider.mockResolvedValue(fail('XX000'));
    expect(await createProvider(input)).toEqual({ ok: false, error: 'unknown' });
  });
});

describe('updateProvider', () => {
  it('garde la date de vérification existante', async () => {
    repo.getProvider.mockResolvedValue({ data: stored, error: null });
    repo.updateProvider.mockResolvedValue({ data: true, error: null });
    expect(await updateProvider({ ...input, providerId: PROVIDER })).toEqual({
      ok: true,
      data: true,
    });
    expect(repo.updateProvider).toHaveBeenCalledWith(
      PROVIDER,
      expect.objectContaining({ verifiedAt: OLD }),
    );
  });

  it('date la vérification quand la case vient d’être cochée', async () => {
    repo.getProvider.mockResolvedValue({ data: { ...stored, verifiedAt: null }, error: null });
    repo.updateProvider.mockResolvedValue({ data: true, error: null });
    await updateProvider({ ...input, providerId: PROVIDER });
    expect(repo.updateProvider).toHaveBeenCalledWith(
      PROVIDER,
      expect.objectContaining({ verifiedAt: NOW }),
    );
  });

  it('efface la vérification quand la case est décochée', async () => {
    repo.getProvider.mockResolvedValue({ data: stored, error: null });
    repo.updateProvider.mockResolvedValue({ data: true, error: null });
    await updateProvider({ ...input, verified: false, providerId: PROVIDER });
    expect(repo.updateProvider).toHaveBeenCalledWith(
      PROVIDER,
      expect.objectContaining({ verifiedAt: null }),
    );
  });

  it('signale un prestataire introuvable', async () => {
    repo.getProvider.mockResolvedValue(fail('no_rows'));
    expect(await updateProvider({ ...input, providerId: PROVIDER })).toEqual({
      ok: false,
      error: 'not_found',
    });
    expect(repo.updateProvider).not.toHaveBeenCalled();
  });
});

describe('lecture', () => {
  it('passe les filtres validés au dépôt', async () => {
    repo.listProviders.mockResolvedValue({ data: [], error: null });
    expect(await listProviders({ city: ' Libreville ', category: 'flowers' })).toEqual({
      ok: true,
      data: [],
    });
    expect(repo.listProviders).toHaveBeenCalledWith({ city: 'Libreville', category: undefined });
  });

  it('traite un identifiant invalide comme introuvable', async () => {
    expect(await getProvider('pas-un-uuid')).toEqual({ ok: false, error: 'not_found' });
    expect(repo.getProvider).not.toHaveBeenCalled();
  });
});
```

- [ ] **Étape 2 : vérifier qu'il échoue**

Run: `pnpm --filter @testimona/web test -- src/modules/providers/service`
Expected: FAIL, `./service` introuvable.

- [ ] **Étape 3 : écrire le dépôt**

`apps/web/src/modules/providers/repo.ts` :

```ts
import 'server-only';
import { getSupabaseServer } from '@/lib/supabase/server';
import type { RepoResult } from '@/modules/dossier/repo';
import type { ProviderCategory } from './categories';
import type { Provider, ProviderFilters, ProviderInput } from './schema';

const COLUMNS =
  'id, category_key, name, city, district, whatsapp, price_note, is_example, verified_at, active';
/** WHY: l'écran admin liste au plus 200 prestataires ; les filtres réduisent la liste. */
const LIST_LIMIT = 200;

interface ProviderRow {
  id: string;
  category_key: ProviderCategory;
  name: string;
  city: string;
  district: string | null;
  whatsapp: string | null;
  price_note: string | null;
  is_example: boolean;
  verified_at: string | null;
  active: boolean;
}

/** Données écrites : la saisie, avec la date de vérification calculée par le service. */
export type ProviderWrite = Omit<ProviderInput, 'verified'> & { verifiedAt: string | null };

const toProvider = (r: ProviderRow): Provider => ({
  id: r.id,
  categoryKey: r.category_key,
  name: r.name,
  city: r.city,
  district: r.district,
  whatsapp: r.whatsapp,
  priceNote: r.price_note,
  isExample: r.is_example,
  verifiedAt: r.verified_at,
  active: r.active,
});

const toRow = (p: ProviderWrite) => ({
  category_key: p.categoryKey,
  name: p.name,
  city: p.city,
  district: p.district,
  whatsapp: p.whatsapp,
  price_note: p.priceNote,
  is_example: p.isExample,
  verified_at: p.verifiedAt,
  active: p.active,
});

function fail(error: { code?: string; message?: string }) {
  return {
    data: null,
    error: { code: error.code || 'unknown', message: error.message || 'providers error' },
  };
}

const NO_ROWS = { data: null, error: { code: 'no_rows', message: 'no row matched' } };

/** Prestataires visibles (RLS : tous pour un administrateur), triés par ville puis nom. */
export async function listProviders(filters: ProviderFilters): Promise<RepoResult<Provider[]>> {
  const db = await getSupabaseServer();
  let query = db.from('provider').select(COLUMNS);
  if (filters.city) query = query.eq('city', filters.city);
  if (filters.category) query = query.eq('category_key', filters.category);
  const { data, error } = await query
    .order('city')
    .order('name')
    .limit(LIST_LIMIT)
    .returns<ProviderRow[]>();
  if (error) {
    console.error('[providers] listProviders impossible', { code: error.code });
    return fail(error);
  }
  return { data: (data ?? []).map(toProvider), error: null };
}

/** Un prestataire, ou `no_rows` s'il n'existe pas ou n'est pas visible. */
export async function getProvider(id: string): Promise<RepoResult<Provider>> {
  const db = await getSupabaseServer();
  const { data, error } = await db
    .from('provider')
    .select(COLUMNS)
    .eq('id', id)
    .returns<ProviderRow[]>()
    .maybeSingle();
  if (error) return fail(error);
  return data ? { data: toProvider(data), error: null } : NO_ROWS;
}

/** Crée un prestataire (RLS : administrateur seulement). */
export async function insertProvider(write: ProviderWrite): Promise<RepoResult<{ id: string }>> {
  const db = await getSupabaseServer();
  const { data, error } = await db.from('provider').insert(toRow(write)).select('id').single();
  if (error) return fail(error);
  return { data: { id: (data as { id: string }).id }, error: null };
}

/** Modifie un prestataire ; `no_rows` si la RLS filtre la ligne. */
export async function updateProvider(id: string, write: ProviderWrite): Promise<RepoResult<true>> {
  const db = await getSupabaseServer();
  const { data, error } = await db.from('provider').update(toRow(write)).eq('id', id).select('id');
  if (error) return fail(error);
  return data && data.length > 0 ? { data: true, error: null } : NO_ROWS;
}
```

- [ ] **Étape 4 : écrire le service**

`apps/web/src/modules/providers/service.ts` :

```ts
import 'server-only';
import { z } from 'zod';
import { isPlatformAdmin } from '@/lib/auth/platform-admin';
import { fieldErrors } from '@/modules/dossier/service';
import * as repo from './repo';
import {
  type Provider,
  ProviderFiltersSchema,
  ProviderSchema,
  ProviderUpdateSchema,
} from './schema';

export type ProvidersError =
  | 'validation'
  | 'forbidden'
  | 'not_found'
  | 'unauthenticated'
  | 'unknown';

export type ProvidersResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ProvidersError; fieldErrors?: Record<string, string> };

const CODES: Record<string, ProvidersError> = {
  '42501': 'forbidden',
  '28000': 'unauthenticated',
  '23514': 'validation',
  '23503': 'validation',
  '22P02': 'validation',
  no_rows: 'not_found',
};

const FORBIDDEN = { ok: false as const, error: 'forbidden' as const };
const NOT_FOUND = { ok: false as const, error: 'not_found' as const };

function fromRepo(error: { code: string }, scope: string): { ok: false; error: ProvidersError } {
  const mapped = CODES[error.code];
  if (!mapped) console.error(`[providers] ${scope} failed`, { code: error.code });
  return { ok: false, error: mapped ?? 'unknown' };
}

const invalid = (error: z.ZodError) => ({
  ok: false as const,
  error: 'validation' as const,
  fieldErrors: fieldErrors(error.issues),
});

/**
 * Date de vérification à écrire.
 * WHY: une case restée cochée garde la date d'origine ; cochée maintenant, elle prend la date
 * du jour ; décochée, la vérification disparaît.
 */
function verifiedAtFor(verified: boolean, previous: string | null): string | null {
  if (!verified) return null;
  return previous ?? new Date().toISOString();
}

/**
 * Prestataires de l'écran admin, filtrés par ville et catégorie.
 *
 * @example
 * const res = await listProviders({ city: 'Libreville' });
 */
export async function listProviders(raw: unknown): Promise<ProvidersResult<Provider[]>> {
  if (!(await isPlatformAdmin())) return FORBIDDEN;
  const filters = ProviderFiltersSchema.safeParse(raw);
  if (!filters.success) return invalid(filters.error);
  const res = await repo.listProviders(filters.data);
  return res.error ? fromRepo(res.error, 'listProviders') : { ok: true, data: res.data };
}

/** Un prestataire pour l'écran de modification. */
export async function getProvider(id: string): Promise<ProvidersResult<Provider>> {
  if (!(await isPlatformAdmin())) return FORBIDDEN;
  if (!z.string().uuid().safeParse(id).success) return NOT_FOUND;
  const res = await repo.getProvider(id);
  return res.error ? fromRepo(res.error, 'getProvider') : { ok: true, data: res.data };
}

/** Crée un prestataire. */
export async function createProvider(raw: unknown): Promise<ProvidersResult<{ id: string }>> {
  if (!(await isPlatformAdmin())) return FORBIDDEN;
  const parsed = ProviderSchema.safeParse(raw);
  if (!parsed.success) return invalid(parsed.error);
  const { verified, ...fields } = parsed.data;
  const res = await repo.insertProvider({ ...fields, verifiedAt: verifiedAtFor(verified, null) });
  return res.error ? fromRepo(res.error, 'createProvider') : { ok: true, data: res.data };
}

/** Modifie un prestataire existant. */
export async function updateProvider(raw: unknown): Promise<ProvidersResult<true>> {
  if (!(await isPlatformAdmin())) return FORBIDDEN;
  const parsed = ProviderUpdateSchema.safeParse(raw);
  if (!parsed.success) return invalid(parsed.error);
  const { providerId, verified, ...fields } = parsed.data;
  const current = await repo.getProvider(providerId);
  if (current.error) return fromRepo(current.error, 'updateProvider.read');
  const res = await repo.updateProvider(providerId, {
    ...fields,
    verifiedAt: verifiedAtFor(verified, current.data.verifiedAt),
  });
  return res.error ? fromRepo(res.error, 'updateProvider') : { ok: true, data: true };
}
```

- [ ] **Étape 5 : vérifier que le test passe**

Run: `pnpm --filter @testimona/web test -- src/modules/providers/service`
Expected: PASS (10 tests).

- [ ] **Étape 6 : formater et commiter**

```bash
pnpm exec prettier --write apps/web/src/modules/providers/repo.ts
pnpm exec prettier --write apps/web/src/modules/providers/service.ts
pnpm exec prettier --write apps/web/src/modules/providers/service.test.ts
git add apps/web/src/modules/providers/repo.ts apps/web/src/modules/providers/service.ts apps/web/src/modules/providers/service.test.ts
git commit -m "feat(providers): add the repository and the admin service

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tâche 4 : textes FR/EN

**Files:**

- Modify: `apps/web/messages/fr.json`
- Modify: `apps/web/messages/en.json`
- Create: `apps/web/src/modules/providers/messages.test.ts`

- [ ] **Étape 1 : écrire le test (il échoue)**

`apps/web/src/modules/providers/messages.test.ts` :

```ts
import { describe, expect, it } from 'vitest';
import en from '../../../messages/en.json';
import fr from '../../../messages/fr.json';
import { PROVIDER_CATEGORIES } from './categories';
import type { ProvidersError } from './service';

const get = (messages: unknown, path: string): unknown =>
  path
    .split('.')
    .reduce<unknown>(
      (node, part) =>
        node && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined,
      messages,
    );
const isFilled = (value: unknown) => typeof value === 'string' && value.trim() !== '';

// WHY: Record typé : ajouter une erreur au service sans texte fait échouer la compilation.
const ERRORS: Record<ProvidersError, true> = {
  validation: true,
  forbidden: true,
  not_found: true,
  unauthenticated: true,
  unknown: true,
};

const PATHS = [
  'admin.nav.providers',
  ...PROVIDER_CATEGORIES.map((k) => `providers.category.${k}`),
  ...[
    'title',
    'new',
    'edit',
    'filterCity',
    'filterCategory',
    'allCategories',
    'filter',
    'empty',
    'name',
    'category',
    'place',
    'whatsapp',
    'status',
    'example',
    'verifiedOn',
    'unverified',
    'inactive',
    'editLink',
    'back',
  ].map((k) => `providers.admin.${k}`),
  ...[
    'category',
    'name',
    'city',
    'district',
    'whatsapp',
    'whatsappHint',
    'priceNote',
    'priceNoteHint',
    'isExample',
    'isExampleHint',
    'verified',
    'active',
    'save',
    'saving',
    'saved',
  ].map((k) => `providers.form.${k}`),
  ...['required', 'tooLong', 'invalidCharacter', 'invalidPhone', 'exampleWithContact'].map(
    (k) => `providers.errors.${k}`,
  ),
  ...Object.keys(ERRORS).map((k) => `dossier.errors.${k}`),
];

describe('textes des prestataires', () => {
  it.each([
    ['fr', fr],
    ['en', en],
  ])('sont tous présents en %s', (_, messages) => {
    expect(PATHS.filter((path) => !isFilled(get(messages, path)))).toEqual([]);
  });

  it('gardent le paramètre de date de la vérification', () => {
    for (const messages of [fr, en]) {
      expect(get(messages, 'providers.admin.verifiedOn')).toContain('{date}');
    }
  });
});
```

- [ ] **Étape 2 : vérifier qu'il échoue**

Run: `pnpm --filter @testimona/web test -- src/modules/providers/messages`
Expected: FAIL, chemins `providers.*` et `admin.nav.providers` absents.

- [ ] **Étape 3 : ajouter les textes**

Dans `apps/web/messages/fr.json`, objet `admin.nav`, ajouter après `"ads"` : `"providers": "Prestataires",`. Puis ajouter l'espace de premier niveau `providers` (après `closing`) :

```json
"providers": {
  "category": {
    "funeralHome": "Pompes funèbres",
    "tentsChairs": "Tentes et chaises",
    "sound": "Sonorisation",
    "lighting": "Éclairage",
    "catering": "Traiteur",
    "drinks": "Boissons",
    "printing": "Imprimeur"
  },
  "admin": {
    "title": "Prestataires",
    "new": "Nouveau prestataire",
    "edit": "Modifier le prestataire",
    "filterCity": "Ville",
    "filterCategory": "Catégorie",
    "allCategories": "Toutes les catégories",
    "filter": "Filtrer",
    "empty": "Aucun prestataire pour ces critères.",
    "name": "Nom",
    "category": "Catégorie",
    "place": "Ville et quartier",
    "whatsapp": "WhatsApp",
    "status": "Statut",
    "example": "Exemple",
    "verifiedOn": "Vérifié le {date}",
    "unverified": "Non vérifié",
    "inactive": "Masqué",
    "editLink": "Modifier",
    "back": "Retour à la liste"
  },
  "form": {
    "category": "Catégorie",
    "name": "Nom",
    "city": "Ville",
    "district": "Quartier",
    "whatsapp": "Numéro WhatsApp",
    "whatsappHint": "Format international, par exemple +241 77 12 34 56.",
    "priceNote": "Prix indicatif",
    "priceNoteHint": "Texte libre, 200 caractères au plus. Il n'entre dans aucun calcul.",
    "isExample": "Prestataire d'exemple",
    "isExampleHint": "Un exemple n'a ni numéro ni vérification : aucune famille ne peut le contacter.",
    "verified": "Vérifié par l'équipe Testimona",
    "active": "Visible des familles",
    "save": "Enregistrer",
    "saving": "Enregistrement…",
    "saved": "Prestataire enregistré."
  },
  "errors": {
    "required": "Ce champ est obligatoire.",
    "tooLong": "Ce texte est trop long.",
    "invalidCharacter": "Ce texte contient un caractère non autorisé.",
    "invalidPhone": "Saisissez le numéro au format international, par exemple +241 77 12 34 56.",
    "exampleWithContact": "Un prestataire d'exemple ne peut avoir ni numéro ni vérification."
  }
}
```

Dans `apps/web/messages/en.json`, `admin.nav` : `"providers": "Providers",` ; puis :

```json
"providers": {
  "category": {
    "funeralHome": "Funeral home",
    "tentsChairs": "Tents and chairs",
    "sound": "Sound system",
    "lighting": "Lighting",
    "catering": "Catering",
    "drinks": "Drinks",
    "printing": "Printer"
  },
  "admin": {
    "title": "Providers",
    "new": "New provider",
    "edit": "Edit provider",
    "filterCity": "City",
    "filterCategory": "Category",
    "allCategories": "All categories",
    "filter": "Filter",
    "empty": "No provider matches these filters.",
    "name": "Name",
    "category": "Category",
    "place": "City and district",
    "whatsapp": "WhatsApp",
    "status": "Status",
    "example": "Example",
    "verifiedOn": "Verified on {date}",
    "unverified": "Not verified",
    "inactive": "Hidden",
    "editLink": "Edit",
    "back": "Back to the list"
  },
  "form": {
    "category": "Category",
    "name": "Name",
    "city": "City",
    "district": "District",
    "whatsapp": "WhatsApp number",
    "whatsappHint": "International format, for example +241 77 12 34 56.",
    "priceNote": "Indicative price",
    "priceNoteHint": "Free text, 200 characters at most. It is never used in a calculation.",
    "isExample": "Example provider",
    "isExampleHint": "An example has no number and no verification: no family can contact it.",
    "verified": "Verified by the Testimona team",
    "active": "Visible to families",
    "save": "Save",
    "saving": "Saving…",
    "saved": "Provider saved."
  },
  "errors": {
    "required": "This field is required.",
    "tooLong": "This text is too long.",
    "invalidCharacter": "This text contains a character that is not allowed.",
    "invalidPhone": "Enter the number in international format, for example +241 77 12 34 56.",
    "exampleWithContact": "An example provider cannot have a number or a verification."
  }
}
```

- [ ] **Étape 4 : vérifier que le test passe**

Run: `pnpm --filter @testimona/web test -- src/modules/providers/messages`
Expected: PASS (3 tests).

- [ ] **Étape 5 : formater et commiter**

```bash
pnpm exec prettier --write apps/web/messages/fr.json
pnpm exec prettier --write apps/web/messages/en.json
pnpm exec prettier --write apps/web/src/modules/providers/messages.test.ts
git add apps/web/messages/fr.json apps/web/messages/en.json apps/web/src/modules/providers/messages.test.ts
git commit -m "feat(providers): add French and English texts

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tâche 5 : actions, formulaire, tableau et pages admin

**Files:**

- Create: `apps/web/src/modules/providers/actions.ts`
- Create: `apps/web/src/modules/providers/ui/ProviderForm.tsx`
- Create: `apps/web/src/modules/providers/ui/ProviderForm.test.tsx`
- Create: `apps/web/src/modules/providers/ui/ProvidersTable.tsx`
- Create: `apps/web/src/app/[locale]/(admin)/admin/providers/page.tsx`
- Create: `apps/web/src/app/[locale]/(admin)/admin/providers/new/page.tsx`
- Create: `apps/web/src/app/[locale]/(admin)/admin/providers/[id]/page.tsx`
- Modify: `apps/web/src/components/admin/AdminSidebarNav.tsx`
- Modify: `apps/web/src/components/admin/AdminShell.tsx`

- [ ] **Étape 1 : écrire le test du formulaire (il échoue)**

`apps/web/src/modules/providers/ui/ProviderForm.test.tsx` :

```tsx
// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import messages from '../../../../messages/fr.json';
import type { Provider } from '../schema';
import { ProviderForm } from './ProviderForm';

const createProviderAction = vi.fn();
const updateProviderAction = vi.fn();
vi.mock('../actions', () => ({
  createProviderAction: (...args: unknown[]) => createProviderAction(...args),
  updateProviderAction: (...args: unknown[]) => updateProviderAction(...args),
}));

const VERIFIED = "Vérifié par l'équipe Testimona";
const PROVIDER: Provider = {
  id: '66666666-6666-4666-8666-666666666666',
  categoryKey: 'sound',
  name: 'Sono Owendo',
  city: 'Libreville',
  district: 'Owendo',
  whatsapp: '+24177123456',
  priceNote: null,
  isExample: false,
  verifiedAt: '2026-10-01T09:00:00.000Z',
  active: true,
};

const renderForm = (provider?: Provider) =>
  render(
    <NextIntlClientProvider locale="fr" messages={messages}>
      <ProviderForm provider={provider} />
    </NextIntlClientProvider>,
  );

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('ProviderForm', () => {
  it('préremplit un prestataire existant', () => {
    renderForm(PROVIDER);
    expect(screen.getByLabelText('Nom')).toHaveProperty('value', 'Sono Owendo');
    expect(screen.getByLabelText('Numéro WhatsApp')).toHaveProperty('value', '+24177123456');
    expect(screen.getByLabelText(VERIFIED)).toHaveProperty('checked', true);
  });

  it('désactive le numéro et la vérification pour un exemple', () => {
    renderForm(PROVIDER);
    fireEvent.click(screen.getByLabelText("Prestataire d'exemple"));
    expect(screen.getByLabelText('Numéro WhatsApp')).toHaveProperty('disabled', true);
    expect(screen.getByLabelText(VERIFIED)).toHaveProperty('disabled', true);
  });

  it('envoie la modification et affiche les erreurs de champ', async () => {
    updateProviderAction.mockResolvedValue({
      error: 'validation',
      fieldErrors: { whatsapp: 'invalid phone' },
    });
    renderForm(PROVIDER);
    fireEvent.submit(screen.getByRole('form'));
    await waitFor(() => expect(updateProviderAction).toHaveBeenCalledTimes(1));
    const data = updateProviderAction.mock.calls[0]![1] as FormData;
    expect(data.get('providerId')).toBe(PROVIDER.id);
    expect(data.get('verified')).toBe('on');
    expect(await screen.findByText(/au format international, par exemple/)).toBeTruthy();
  });

  it('crée un prestataire sans identifiant', async () => {
    createProviderAction.mockResolvedValue({ ok: true });
    renderForm();
    fireEvent.submit(screen.getByRole('form'));
    await waitFor(() => expect(createProviderAction).toHaveBeenCalledTimes(1));
    expect((createProviderAction.mock.calls[0]![1] as FormData).get('providerId')).toBeNull();
  });
});
```

- [ ] **Étape 2 : vérifier qu'il échoue**

Run: `pnpm --filter @testimona/web test -- src/modules/providers/ui`
Expected: FAIL, `./ProviderForm` introuvable.

- [ ] **Étape 3 : écrire les actions**

`apps/web/src/modules/providers/actions.ts` :

```ts
'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getLocale } from 'next-intl/server';
import { localizedPath } from '@/lib/auth/redirect-target';
import { getCurrentUser } from '@/lib/supabase/server';
import * as service from './service';
import type { ProvidersError } from './service';

export interface ProviderFormState {
  ok?: boolean;
  error?: ProvidersError;
  fieldErrors?: Record<string, string>;
}

const LIST = '/admin/providers';

const field = (formData: FormData, name: string) => String(formData.get(name) ?? '');
const checked = (formData: FormData, name: string) => formData.get(name) === 'on';

const providerFields = (formData: FormData) => ({
  categoryKey: field(formData, 'categoryKey'),
  name: field(formData, 'name'),
  city: field(formData, 'city'),
  district: field(formData, 'district'),
  whatsapp: field(formData, 'whatsapp'),
  priceNote: field(formData, 'priceNote'),
  isExample: checked(formData, 'isExample'),
  verified: checked(formData, 'verified'),
  active: checked(formData, 'active'),
});

/**
 * Crée un prestataire puis revient à la liste.
 * WHY: le service vérifie le rôle administrateur ; la RLS le vérifie encore en base.
 */
export async function createProviderAction(
  _prev: ProviderFormState | null,
  formData: FormData,
): Promise<ProviderFormState> {
  if (!(await getCurrentUser())) return { error: 'unauthenticated' };
  const res = await service.createProvider(providerFields(formData));
  if (!res.ok) return { error: res.error, fieldErrors: res.fieldErrors };
  const list = localizedPath(LIST, await getLocale());
  revalidatePath(list);
  redirect(list);
}

/** Modifie un prestataire et reste sur l'écran. */
export async function updateProviderAction(
  _prev: ProviderFormState | null,
  formData: FormData,
): Promise<ProviderFormState> {
  if (!(await getCurrentUser())) return { error: 'unauthenticated' };
  const providerId = field(formData, 'providerId');
  const res = await service.updateProvider({ ...providerFields(formData), providerId });
  if (!res.ok) return { error: res.error, fieldErrors: res.fieldErrors };
  const locale = await getLocale();
  revalidatePath(localizedPath(LIST, locale));
  revalidatePath(localizedPath(`${LIST}/${providerId}`, locale));
  return { ok: true };
}
```

- [ ] **Étape 4 : écrire le formulaire**

`apps/web/src/modules/providers/ui/ProviderForm.tsx` :

```tsx
'use client';

import { startTransition, useActionState, useEffect, useId, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { buttonClasses } from '@/components/ui/Button';
import { createProviderAction, type ProviderFormState, updateProviderAction } from '../actions';
import { PROVIDER_CATEGORIES } from '../categories';
import type { Provider } from '../schema';

const FIELD = 'border-border bg-background text-foreground w-full rounded-xl border px-3 py-2';

const FIELD_MESSAGES: Record<string, string> = {
  required: 'errors.required',
  'too long': 'errors.tooLong',
  'invalid character': 'errors.invalidCharacter',
  'invalid phone': 'errors.invalidPhone',
  'example with contact': 'errors.exampleWithContact',
};

type TextName = 'name' | 'city' | 'district' | 'whatsapp' | 'priceNote';
type CheckName = 'isExample' | 'verified' | 'active';

/**
 * Création ou modification d'un prestataire par l'équipe Testimona.
 * WHY: cocher « exemple » désactive le numéro et la vérification ; un champ désactivé n'est pas
 * envoyé, et la base refuse de toute façon un exemple contactable.
 *
 * @example
 * <ProviderForm provider={provider} />
 */
export function ProviderForm({ provider }: { provider?: Provider }) {
  const t = useTranslations('providers');
  const tErrors = useTranslations('dossier.errors');
  const [state, formAction, pending] = useActionState<ProviderFormState | null, FormData>(
    provider ? updateProviderAction : createProviderAction,
    null,
  );
  const [example, setExample] = useState(provider?.isExample ?? false);
  const [saved, setSaved] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const uid = useId();

  useEffect(() => {
    if (state?.ok) setSaved(true);
    else if (state?.fieldErrors) {
      formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
    }
  }, [state]);

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (pending) return;
    const data = new FormData(e.currentTarget);
    startTransition(() => formAction(data));
  };

  const errorOf = (name: string) => {
    const message = state?.fieldErrors?.[name];
    if (!message) return null;
    const key = FIELD_MESSAGES[message];
    return key ? t(key) : tErrors('validation');
  };

  const described = (name: string, hint?: string) => {
    const ids = [hint && `${uid}-${name}-hint`, errorOf(name) && `${uid}-${name}-error`];
    return ids.filter(Boolean).join(' ') || undefined;
  };

  const notes = (name: string, hint?: string): ReactNode => (
    <>
      {hint && (
        <p id={`${uid}-${name}-hint`} className="text-foreground text-sm">
          {hint}
        </p>
      )}
      {errorOf(name) && (
        <p id={`${uid}-${name}-error`} role="alert" className="text-destructive text-sm">
          {errorOf(name)}
        </p>
      )}
    </>
  );

  const textField = (
    name: TextName,
    defaultValue: string | null | undefined,
    options: { maxLength: number; hint?: string; disabled?: boolean; tel?: boolean },
  ) => (
    <div className="space-y-1">
      <label htmlFor={`${uid}-${name}`} className="text-foreground block text-sm">
        {t(`form.${name}`)}
      </label>
      <input
        id={`${uid}-${name}`}
        name={name}
        defaultValue={defaultValue ?? ''}
        maxLength={options.maxLength}
        disabled={options.disabled}
        type={options.tel ? 'tel' : 'text'}
        autoComplete="off"
        aria-invalid={errorOf(name) ? true : undefined}
        aria-describedby={described(name, options.hint)}
        className={FIELD}
      />
      {notes(name, options.hint)}
    </div>
  );

  const checkbox = (
    name: CheckName,
    defaultChecked: boolean,
    options: { hint?: string; disabled?: boolean; onChange?: (checked: boolean) => void } = {},
  ) => (
    <div className="space-y-1">
      <label className="text-foreground flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name={name}
          defaultChecked={defaultChecked}
          disabled={options.disabled}
          onChange={(e) => options.onChange?.(e.currentTarget.checked)}
          aria-invalid={errorOf(name) ? true : undefined}
          aria-describedby={described(name, options.hint)}
        />
        {t(`form.${name}`)}
      </label>
      {notes(name, options.hint)}
    </div>
  );

  const globalError = state?.error && !state.fieldErrors ? tErrors(state.error) : null;

  return (
    <form
      ref={formRef}
      aria-label={provider ? t('admin.edit') : t('admin.new')}
      onSubmit={onSubmit}
      onChange={() => setSaved(false)}
      noValidate
      className="grid max-w-2xl gap-4"
    >
      {provider && <input type="hidden" name="providerId" value={provider.id} />}
      <div className="space-y-1">
        <label htmlFor={`${uid}-categoryKey`} className="text-foreground block text-sm">
          {t('form.category')}
        </label>
        <select
          id={`${uid}-categoryKey`}
          name="categoryKey"
          defaultValue={provider?.categoryKey ?? PROVIDER_CATEGORIES[0]}
          className={FIELD}
        >
          {PROVIDER_CATEGORIES.map((key) => (
            <option key={key} value={key}>
              {t(`category.${key}`)}
            </option>
          ))}
        </select>
      </div>
      {textField('name', provider?.name, { maxLength: 120 })}
      {textField('city', provider?.city ?? 'Libreville', { maxLength: 120 })}
      {textField('district', provider?.district, { maxLength: 120 })}
      {checkbox('isExample', example, { hint: t('form.isExampleHint'), onChange: setExample })}
      {textField('whatsapp', provider?.whatsapp, {
        maxLength: 24,
        hint: t('form.whatsappHint'),
        disabled: example,
        tel: true,
      })}
      {textField('priceNote', provider?.priceNote, {
        maxLength: 200,
        hint: t('form.priceNoteHint'),
      })}
      {checkbox('verified', provider?.verifiedAt != null, { disabled: example })}
      {checkbox('active', provider?.active ?? true)}
      {globalError && (
        <p role="alert" className="text-destructive text-sm">
          {globalError}
        </p>
      )}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className={buttonClasses({ variant: 'secondary' })}
        >
          {pending ? t('form.saving') : t('form.save')}
        </button>
        {saved && (
          <p role="status" className="text-foreground text-sm">
            {t('form.saved')}
          </p>
        )}
      </div>
    </form>
  );
}
```

- [ ] **Étape 5 : vérifier que le test passe**

Run: `pnpm --filter @testimona/web test -- src/modules/providers/ui`
Expected: PASS (4 tests).

- [ ] **Étape 6 : écrire le tableau**

`apps/web/src/modules/providers/ui/ProvidersTable.tsx` :

```tsx
import { useFormatter, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import type { Provider } from '../schema';

/**
 * Liste admin des prestataires : catégorie, lieu, numéro et statut (exemple, vérifié, masqué).
 *
 * @example
 * <ProvidersTable providers={res.data} />
 */
export function ProvidersTable({ providers }: { providers: readonly Provider[] }) {
  const t = useTranslations('providers');
  const format = useFormatter();
  if (providers.length === 0) {
    return <p className="text-foreground">{t('admin.empty')}</p>;
  }
  const status = (p: Provider) =>
    [
      p.isExample
        ? t('admin.example')
        : p.verifiedAt
          ? t('admin.verifiedOn', {
              date: format.dateTime(new Date(p.verifiedAt), { dateStyle: 'medium' }),
            })
          : t('admin.unverified'),
      p.active ? null : t('admin.inactive'),
    ]
      .filter(Boolean)
      .join(' · ');
  return (
    <div className="overflow-x-auto">
      <table className="text-foreground w-full text-left text-sm">
        <caption className="sr-only">{t('admin.title')}</caption>
        <thead>
          <tr className="border-border border-b">
            {(['name', 'category', 'place', 'whatsapp', 'status'] as const).map((key) => (
              <th key={key} scope="col" className="py-2 pr-4 font-semibold">
                {t(`admin.${key}`)}
              </th>
            ))}
            <th scope="col" className="sr-only">
              {t('admin.editLink')}
            </th>
          </tr>
        </thead>
        <tbody>
          {providers.map((p) => (
            <tr key={p.id} className="border-border border-b">
              <td className="py-2 pr-4">{p.name}</td>
              <td className="py-2 pr-4">{t(`category.${p.categoryKey}`)}</td>
              <td className="py-2 pr-4">{[p.city, p.district].filter(Boolean).join(', ')}</td>
              <td className="py-2 pr-4">{p.whatsapp ?? '—'}</td>
              <td className="py-2 pr-4">{status(p)}</td>
              <td className="py-2">
                <Link
                  href={`/admin/providers/${p.id}`}
                  className="text-secondary font-semibold underline"
                >
                  {t('admin.editLink')}
                  <span className="sr-only"> {p.name}</span>
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Étape 7 : écrire les pages**

`apps/web/src/app/[locale]/(admin)/admin/providers/page.tsx` :

```tsx
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { AdminShell } from '@/components/admin/AdminShell';
import { buttonClasses } from '@/components/ui/Button';
import { Link } from '@/i18n/navigation';
import { PROVIDER_CATEGORIES } from '@/modules/providers/categories';
import { listProviders } from '@/modules/providers/service';
import { ProvidersTable } from '@/modules/providers/ui/ProvidersTable';

export const metadata: Metadata = {
  title: 'Admin — Prestataires',
  robots: { index: false, follow: false },
};

const FIELD = 'border-border bg-background text-foreground rounded-xl border px-3 py-2';
const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

// WHY: le layout (admin) appelle requireAdmin() ; le service et la RLS revérifient le rôle.
export default async function AdminProvidersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const filters = { city: one(params.city), category: one(params.category) };
  const [t, tErrors, res] = await Promise.all([
    getTranslations('providers'),
    getTranslations('dossier.errors'),
    listProviders(filters),
  ]);
  return (
    <AdminShell
      title={t('admin.title')}
      action={
        <Link href="/admin/providers/new" className={buttonClasses({ variant: 'secondary' })}>
          {t('admin.new')}
        </Link>
      }
    >
      <form method="get" className="mb-6 flex flex-wrap items-end gap-3">
        <label className="text-foreground grid gap-1 text-sm">
          {t('admin.filterCity')}
          <input name="city" defaultValue={filters.city ?? ''} maxLength={120} className={FIELD} />
        </label>
        <label className="text-foreground grid gap-1 text-sm">
          {t('admin.filterCategory')}
          <select name="category" defaultValue={filters.category ?? ''} className={FIELD}>
            <option value="">{t('admin.allCategories')}</option>
            {PROVIDER_CATEGORIES.map((key) => (
              <option key={key} value={key}>
                {t(`category.${key}`)}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className={buttonClasses({ variant: 'secondary' })}>
          {t('admin.filter')}
        </button>
      </form>
      {res.ok ? (
        <ProvidersTable providers={res.data} />
      ) : (
        <p role="alert" className="text-destructive">
          {tErrors(res.error)}
        </p>
      )}
    </AdminShell>
  );
}
```

`apps/web/src/app/[locale]/(admin)/admin/providers/new/page.tsx` :

```tsx
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { AdminShell } from '@/components/admin/AdminShell';
import { Link } from '@/i18n/navigation';
import { ProviderForm } from '@/modules/providers/ui/ProviderForm';

export const metadata: Metadata = {
  title: 'Admin — Nouveau prestataire',
  robots: { index: false, follow: false },
};

export default async function AdminNewProviderPage() {
  const t = await getTranslations('providers.admin');
  return (
    <AdminShell title={t('new')}>
      <p className="mb-6">
        <Link href="/admin/providers" className="text-secondary font-semibold underline">
          {t('back')}
        </Link>
      </p>
      <ProviderForm />
    </AdminShell>
  );
}
```

`apps/web/src/app/[locale]/(admin)/admin/providers/[id]/page.tsx` :

```tsx
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { AdminShell } from '@/components/admin/AdminShell';
import { Link } from '@/i18n/navigation';
import { getProvider } from '@/modules/providers/service';
import { ProviderForm } from '@/modules/providers/ui/ProviderForm';

export const metadata: Metadata = {
  title: 'Admin — Prestataire',
  robots: { index: false, follow: false },
};

export default async function AdminProviderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [t, tErrors, res] = await Promise.all([
    getTranslations('providers.admin'),
    getTranslations('dossier.errors'),
    getProvider(id),
  ]);
  if (!res.ok && res.error === 'not_found') notFound();
  return (
    <AdminShell title={t('edit')}>
      <p className="mb-6">
        <Link href="/admin/providers" className="text-secondary font-semibold underline">
          {t('back')}
        </Link>
      </p>
      {res.ok ? (
        <ProviderForm provider={res.data} />
      ) : (
        <p role="alert" className="text-destructive">
          {tErrors(res.error)}
        </p>
      )}
    </AdminShell>
  );
}
```

- [ ] **Étape 8 : ajouter l'entrée de navigation**

Dans `apps/web/src/components/admin/AdminSidebarNav.tsx`, tableau `ITEMS`, après l'entrée `/admin/ads` :

```ts
  {
    href: '/admin/providers',
    labelKey: 'providers',
    iconPath: 'M3 21h18M5 21V8l7-5 7 5v13M9 21v-6h6v6',
  },
```

et dans `interface Labels`, après `ads: string;` : `providers: string;`.

Dans `apps/web/src/components/admin/AdminShell.tsx`, objet `labels`, après `ads: t('ads'),` : `providers: t('providers'),`.

- [ ] **Étape 9 : vérifier types, lint et tests du module**

Run: `pnpm --filter @testimona/web typecheck`
Expected: aucune erreur.

Run: `pnpm --filter @testimona/web lint`
Expected: aucune erreur (avertissements anciens inchangés) ; en particulier aucun import de `lib/supabase/admin` ni accès `.from()` hors `repo.ts` dans les nouveaux fichiers.

Run: `pnpm --filter @testimona/web test -- src/modules/providers src/lib/auth`
Expected: PASS.

- [ ] **Étape 10 : formater et commiter**

```bash
pnpm exec prettier --write apps/web/src/modules/providers/actions.ts
pnpm exec prettier --write apps/web/src/modules/providers/ui/ProviderForm.tsx
pnpm exec prettier --write apps/web/src/modules/providers/ui/ProviderForm.test.tsx
pnpm exec prettier --write apps/web/src/modules/providers/ui/ProvidersTable.tsx
pnpm exec prettier --write "apps/web/src/app/[locale]/(admin)/admin/providers/page.tsx"
pnpm exec prettier --write "apps/web/src/app/[locale]/(admin)/admin/providers/new/page.tsx"
pnpm exec prettier --write "apps/web/src/app/[locale]/(admin)/admin/providers/[id]/page.tsx"
pnpm exec prettier --write apps/web/src/components/admin/AdminSidebarNav.tsx
pnpm exec prettier --write apps/web/src/components/admin/AdminShell.tsx
git add apps/web/src/modules/providers/actions.ts apps/web/src/modules/providers/ui "apps/web/src/app/[locale]/(admin)/admin/providers" apps/web/src/components/admin/AdminSidebarNav.tsx apps/web/src/components/admin/AdminShell.tsx
git commit -m "feat(providers): add the admin screens

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tâche 6 : vérification complète et livraison

**Files:** aucun nouveau fichier ; `supabase/README.md` après application en production.

- [ ] **Étape 1 : toute la suite**

Run: `pnpm --filter @testimona/supabase test`
Expected: PASS.

Run: `pnpm --filter @testimona/web test`
Expected: PASS (suite existante + nouveaux tests).

Run: `pnpm --filter @testimona/web typecheck && pnpm --filter @testimona/web lint && pnpm --filter @testimona/supabase typecheck`
Expected: aucune erreur.

Run: `pnpm --filter @testimona/web build`
Expected: build réussi, routes `/[locale]/admin/providers`, `/new` et `/[id]` présentes.

- [ ] **Étape 2 : relecture du diff**

Run: `git diff origin/main --stat`, puis lire le diff complet. Vérifier : aucun secret, aucun import du client service-role dans un nouveau fichier, chaque fichier sous 300 lignes, textes FR/EN complets.

- [ ] **Étape 3 : livraison (avec l'accord explicite du propriétaire du projet)**

Ces étapes écrivent en production ; ne les lancer qu'après accord explicite dans la conversation :

1. pousser la branche et ouvrir la PR vers `main` (description FR : Contexte, Changements, Tests effectués, Risques) ;
2. appliquer `20261028000300_providers` en production (MCP Supabase `apply_migration`), puis vérifier : RLS active sur les trois tables, droits de `authenticated` (`provider_category` : select ; `provider` : select, insert, update ; `quote_request` : select, insert), aucun droit pour `anon`, fonctions de trigger non exécutables, 10 exemples sans numéro, `is_admin()` avec `search_path=""` ;
3. relancer `get_advisors` (sécurité) : l'alerte `search_path` de `is_admin` disparaît, aucune nouvelle alerte attendue ;
4. noter la version enregistrée et ces vérifications dans `supabase/README.md` (section « État de la production »), commiter `docs(db): record the providers migration in production` ;
5. fusionner après CI verte, puis vérifier le déploiement Railway et `/api/health`.
