# Lot 1 · PR 1 — Dossier et membres : plan d'implémentation

> **Pour les agents :** sous-skill requis : superpowers:subagent-driven-development (recommandé) ou
> superpowers:executing-plans, tâche par tâche. Les étapes utilisent des cases `- [ ]`.

**Objectif :** une famille peut ouvrir un dossier privé depuis le nouvel accueil à trois portes, voir
son tableau de bord et inviter ses proches par lien (et par e-mail si Resend est configuré).

**Architecture :** trois tables Supabase (`person`, `journey_answer`, `dossier_invitation`) protégées
par la RLS par dossier du lot 0, plus deux fonctions SQL (création atomique d'un dossier, acceptation
d'une invitation). Côté Next.js, un module `src/modules/dossier/` (schéma Zod, `repo.ts` seul accès
base avec le client utilisateur, service testable, actions serveur, composants) et cinq routes.

**Stack :** Next.js 15 (App Router, actions serveur), Supabase (Postgres 17, RLS), Zod, next-intl,
Vitest, PGlite, Playwright.

**Spec :** [`2026-10-27-lot-1-entrer-et-annoncer-design.md`](../specs/2026-10-27-lot-1-entrer-et-annoncer-design.md).
Les PR 2 à 4 sont esquissées en fin de document ; chacune aura son propre plan détaillé.

---

## Carte des fichiers

| Fichier                                                             | Rôle                                                                                      |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `supabase/migrations/20261027000200_dossier_person_answers.sql`     | `person`, `journey_answer`, `dossier_member.display_name`, `create_dossier_with_person()` |
| `supabase/migrations/20261027000300_dossier_invitations.sql`        | `dossier_invitation`, `accept_dossier_invitation()`                                       |
| `supabase/tests/dossier-person-answers.test.ts`                     | RLS et fonction de création                                                               |
| `supabase/tests/dossier-invitations.test.ts`                        | RLS et acceptation des invitations                                                        |
| `apps/web/src/modules/dossier/schema.ts`                            | Constantes et schémas Zod                                                                 |
| `apps/web/src/modules/dossier/roles.ts`                             | Rangs des rôles, droits dérivés                                                           |
| `apps/web/src/modules/dossier/tokens.ts`                            | Génération et empreinte des jetons d'invitation                                           |
| `apps/web/src/modules/dossier/repo.ts`                              | Seul accès base (client utilisateur)                                                      |
| `apps/web/src/modules/dossier/service.ts`                           | Validation, orchestration, erreurs typées                                                 |
| `apps/web/src/modules/dossier/actions.ts`                           | Actions serveur                                                                           |
| `apps/web/src/modules/dossier/ui/*.tsx`                             | Composants de l'accueil, de l'assistant, des membres, de l'invitation                     |
| `apps/web/src/lib/email/resend.ts`                                  | + `dossierInviteEmail()`                                                                  |
| `apps/web/src/middleware.ts`                                        | `/dossier` et `/invitation` protégés                                                      |
| `apps/web/src/app/[locale]/page.tsx`                                | Nouvel accueil à trois portes                                                             |
| `apps/web/src/app/[locale]/(public)/memoriaux/page.tsx`             | Ancien accueil, déplacé tel quel                                                          |
| `apps/web/src/app/[locale]/(dossier)/dossier/nouveau/page.tsx`      | Assistant de création                                                                     |
| `apps/web/src/app/[locale]/(dossier)/dossier/[id]/page.tsx`         | Tableau de bord minimal                                                                   |
| `apps/web/src/app/[locale]/(dossier)/dossier/[id]/membres/page.tsx` | Membres et invitations                                                                    |
| `apps/web/src/app/[locale]/(dossier)/invitation/[token]/page.tsx`   | Acceptation d'une invitation                                                              |
| `apps/web/messages/fr.json`, `apps/web/messages/en.json`            | Espaces `doors` et `dossier`                                                              |
| `apps/web/e2e/smoke.spec.ts`                                        | Accueil à trois portes, `/memoriaux`, redirection vers la connexion                       |

Règles du lot 0 à respecter : accès base uniquement dans `repo.ts` ; aucun import de
`@/lib/supabase/admin` ; 300 lignes au maximum par fichier ; `pnpm format:check` vert.

Branche : `feature/lot1-pr1-dossier-membres`, créée depuis `main`.

```bash
cd /Users/user/Downloads/testimona
git checkout main && git pull --ff-only origin main
git checkout -b feature/lot1-pr1-dossier-membres
```

---

### Tâche 1 : tables `person` et `journey_answer`, création atomique d'un dossier

**Fichiers :**

- Créer : `supabase/migrations/20261027000200_dossier_person_answers.sql`
- Test : `supabase/tests/dossier-person-answers.test.ts`

- [ ] **Étape 1 : écrire le test qui échoue**

`supabase/tests/dossier-person-answers.test.ts` :

```ts
import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { asRole, asUser, createTestDb, createUser } from './helpers/db';

let db: PGlite;
let owner: string;
let viewer: string;
let outsider: string;
let dossierId: string;

const RLS_DENIED = { code: '42501' };

beforeAll(async () => {
  db = await createTestDb();
  owner = await createUser(db, 'owner@test.local');
  viewer = await createUser(db, 'viewer@test.local');
  outsider = await createUser(db, 'outsider@test.local');
  const { rows } = await asUser(db, owner, () =>
    db.query<{ id: string }>(
      `select public.create_dossier_with_person('death', ' Jean ', 'Ndong', 'ga', ' Libreville ', 'child') as id`,
    ),
  );
  dossierId = rows[0]!.id;
  await asUser(db, owner, () =>
    db.query(`insert into dossier_member (dossier_id, user_id, role) values ($1, $2, 'viewer')`, [
      dossierId,
      viewer,
    ]),
  );
});

afterAll(async () => {
  await db?.close();
});

describe('create_dossier_with_person', () => {
  it('crée le dossier, la personne et la réponse du créateur', async () => {
    const dossier = await db.query<{ title: string; country_code: string; city: string }>(
      'select title, country_code, city from dossier where id = $1',
      [dossierId],
    );
    expect(dossier.rows[0]).toEqual({
      title: 'Jean Ndong',
      country_code: 'GA',
      city: 'Libreville',
    });

    const person = await db.query<{ first_name: string; last_name: string }>(
      'select first_name, last_name from person where dossier_id = $1',
      [dossierId],
    );
    expect(person.rows[0]).toEqual({ first_name: 'Jean', last_name: 'Ndong' });

    const answer = await db.query<{ value: unknown; answered_by: string }>(
      `select value, answered_by from journey_answer where dossier_id = $1 and key = 'creator.relationship'`,
      [dossierId],
    );
    expect(answer.rows[0]).toEqual({ value: 'child', answered_by: owner });
  });

  it('renseigne le nom affiché du propriétaire', async () => {
    const { rows } = await db.query<{ display_name: string }>(
      'select display_name from dossier_member where dossier_id = $1 and user_id = $2',
      [dossierId, owner],
    );
    expect(rows[0]?.display_name).toBe('owner');
  });

  it('refuse un visiteur anonyme', async () => {
    const attempt = asRole(db, 'anon', null, () =>
      db.query(
        `select public.create_dossier_with_person('death', 'A', 'B', 'GA', 'Libreville', '')`,
      ),
    );
    await expect(attempt).rejects.toMatchObject(RLS_DENIED);
  });
});

describe('person et journey_answer : RLS', () => {
  it('montre la personne et les réponses aux membres', async () => {
    const person = await asUser(db, viewer, () => db.query('select * from person'));
    const answers = await asUser(db, viewer, () => db.query('select * from journey_answer'));
    expect(person.rows).toHaveLength(1);
    expect(answers.rows).toHaveLength(1);
  });

  it('cache la personne et les réponses aux non-membres', async () => {
    const person = await asUser(db, outsider, () => db.query('select * from person'));
    const answers = await asUser(db, outsider, () => db.query('select * from journey_answer'));
    expect(person.rows).toEqual([]);
    expect(answers.rows).toEqual([]);
  });

  it('interdit à un lecteur de répondre', async () => {
    const attempt = asUser(db, viewer, () =>
      db.query(
        `insert into journey_answer (dossier_id, key, value) values ($1, 'death.date', '"2026-10-20"')`,
        [dossierId],
      ),
    );
    await expect(attempt).rejects.toMatchObject(RLS_DENIED);
  });

  it("force l'auteur de la réponse à l'utilisateur courant", async () => {
    await asUser(db, owner, () =>
      db.query(
        `insert into journey_answer (dossier_id, key, value, answered_by) values ($1, 'death.date', '"2026-10-20"', $2)`,
        [dossierId, viewer],
      ),
    );
    const { rows } = await db.query<{ answered_by: string }>(
      `select answered_by from journey_answer where dossier_id = $1 and key = 'death.date'`,
      [dossierId],
    );
    expect(rows[0]?.answered_by).toBe(owner);
  });

  it('refuse une clé mal formée', async () => {
    const attempt = asUser(db, owner, () =>
      db.query(`insert into journey_answer (dossier_id, key, value) values ($1, 'Bad Key', '1')`, [
        dossierId,
      ]),
    );
    await expect(attempt).rejects.toMatchObject({ code: '23514' });
  });

  it('refuse une date de décès antérieure à la naissance', async () => {
    const attempt = asUser(db, owner, () =>
      db.query(
        `update person set birth_date = '1990-01-01', death_date = '1980-01-01' where dossier_id = $1`,
        [dossierId],
      ),
    );
    await expect(attempt).rejects.toMatchObject({ code: '23514' });
  });
});
```

- [ ] **Étape 2 : lancer le test, il doit échouer**

Run: `pnpm --filter @testimona/supabase test -- tests/dossier-person-answers.test.ts`
Expected: FAIL, `function public.create_dossier_with_person(...) does not exist`.

- [ ] **Étape 3 : écrire la migration**

`supabase/migrations/20261027000200_dossier_person_answers.sql` :

```sql
-- ============================================================================
-- Lot 1 · PR 1 — fiche de la personne, réponses du parcours, création atomique.
-- Tout est rattaché à un dossier et protégé par is_dossier_member() (lot 0).
-- ============================================================================

-- Nom affiché des membres (les autres membres ne lisent pas auth.users).
alter table public.dossier_member add column display_name text;

create function public.dossier_member_set_display_name()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.display_name is null then
    select coalesce(
             nullif(u.raw_user_meta_data ->> 'nickname', ''),
             nullif(u.raw_user_meta_data ->> 'full_name', ''),
             split_part(u.email, '@', 1)
           )
      into new.display_name
      from auth.users u
     where u.id = new.user_id;
  end if;
  return new;
end;
$$;

create trigger dossier_member_set_display_name
  before insert on public.dossier_member
  for each row execute function public.dossier_member_set_display_name();

-- ---------------------------------------------------------------------------
-- person : une fiche par dossier
-- ---------------------------------------------------------------------------
create table public.person (
  dossier_id uuid primary key references public.dossier (id) on delete cascade,
  first_name text not null check (char_length(first_name) between 1 and 120),
  last_name text not null check (char_length(last_name) between 1 and 120),
  nickname text check (nickname is null or char_length(nickname) <= 120),
  birth_date date,
  death_date date,
  death_city text check (death_city is null or char_length(death_city) <= 120),
  death_country_code char(2) check (death_country_code is null or death_country_code ~ '^[A-Z]{2}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint person_dates_order check (birth_date is null or death_date is null or death_date >= birth_date)
);

create function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger person_touch_updated_at
  before update on public.person
  for each row execute function public.touch_updated_at();

alter table public.person enable row level security;
revoke all on public.person from anon;

create policy person_select on public.person
  for select to authenticated
  using (public.is_dossier_member(dossier_id));

create policy person_insert on public.person
  for insert to authenticated
  with check (public.is_dossier_member(dossier_id, 'contributor'));

create policy person_update on public.person
  for update to authenticated
  using (public.is_dossier_member(dossier_id, 'contributor'))
  with check (public.is_dossier_member(dossier_id, 'contributor'));

-- ---------------------------------------------------------------------------
-- journey_answer : une ligne par réponse du parcours
-- ---------------------------------------------------------------------------
create table public.journey_answer (
  dossier_id uuid not null references public.dossier (id) on delete cascade,
  key text not null check (key ~ '^[a-z][a-zA-Z0-9]*(\.[a-z][a-zA-Z0-9]*)+$'),
  value jsonb not null,
  answered_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (dossier_id, key)
);

-- WHY: l'auteur est toujours l'utilisateur courant, jamais une valeur envoyée.
create function public.journey_answer_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.answered_by := auth.uid();
  new.updated_at := now();
  return new;
end;
$$;

create trigger journey_answer_before_write
  before insert or update on public.journey_answer
  for each row execute function public.journey_answer_before_write();

alter table public.journey_answer enable row level security;
revoke all on public.journey_answer from anon;

create policy journey_answer_select on public.journey_answer
  for select to authenticated
  using (public.is_dossier_member(dossier_id));

create policy journey_answer_insert on public.journey_answer
  for insert to authenticated
  with check (public.is_dossier_member(dossier_id, 'contributor'));

create policy journey_answer_update on public.journey_answer
  for update to authenticated
  using (public.is_dossier_member(dossier_id, 'contributor'))
  with check (public.is_dossier_member(dossier_id, 'contributor'));

create policy journey_answer_delete on public.journey_answer
  for delete to authenticated
  using (public.is_dossier_member(dossier_id, 'contributor'));

-- ---------------------------------------------------------------------------
-- Création atomique : dossier + personne + lien du créateur, en une transaction.
-- WHY: security invoker, donc les policies ci-dessus s'appliquent ; le trigger du
-- lot 0 fait du créateur le propriétaire avant l'insertion de la personne.
-- ---------------------------------------------------------------------------
create function public.create_dossier_with_person(
  p_entry_point text,
  p_first_name text,
  p_last_name text,
  p_country_code text,
  p_city text,
  p_relationship text
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid;
begin
  insert into public.dossier (title, country_code, city, entry_point)
  values (
    trim(p_first_name) || ' ' || trim(p_last_name),
    upper(trim(p_country_code)),
    trim(p_city),
    p_entry_point
  )
  returning id into v_id;

  insert into public.person (dossier_id, first_name, last_name)
  values (v_id, trim(p_first_name), trim(p_last_name));

  if p_relationship is not null and char_length(trim(p_relationship)) > 0 then
    insert into public.journey_answer (dossier_id, key, value)
    values (v_id, 'creator.relationship', to_jsonb(trim(p_relationship)));
  end if;

  return v_id;
end;
$$;

revoke execute on function public.create_dossier_with_person(text, text, text, text, text, text) from public, anon;
grant execute on function public.create_dossier_with_person(text, text, text, text, text, text) to authenticated;
```

- [ ] **Étape 4 : lancer les tests SQL, ils doivent passer**

Run: `pnpm --filter @testimona/supabase test`
Expected: PASS, dont `tests/migrations.test.ts` (100 % des tables avec RLS) et les 9 nouveaux tests.

- [ ] **Étape 5 : commiter**

```bash
git add supabase/migrations/20261027000200_dossier_person_answers.sql supabase/tests/dossier-person-answers.test.ts
git commit -m "feat(db): add person, journey answers and atomic dossier creation"
```

---

### Tâche 2 : invitations

**Fichiers :**

- Créer : `supabase/migrations/20261027000300_dossier_invitations.sql`
- Test : `supabase/tests/dossier-invitations.test.ts`

- [ ] **Étape 1 : écrire le test qui échoue**

`supabase/tests/dossier-invitations.test.ts` :

```ts
import { createHash } from 'node:crypto';
import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { asRole, asUser, createTestDb, createUser } from './helpers/db';

let db: PGlite;
let owner: string;
let viewer: string;
let guest: string;
let other: string;
let dossierId: string;

const RLS_DENIED = { code: '42501' };
const hash = (token: string) => createHash('sha256').update(token, 'utf8').digest('hex');

async function invite(by: string, token: string, role: string) {
  return asUser(db, by, () =>
    db.query(`insert into dossier_invitation (dossier_id, role, token_hash) values ($1, $2, $3)`, [
      dossierId,
      role,
      hash(token),
    ]),
  );
}

function accept(userId: string, token: string) {
  return asUser(db, userId, () =>
    db.query<{ id: string }>('select public.accept_dossier_invitation($1) as id', [token]),
  );
}

beforeAll(async () => {
  db = await createTestDb();
  owner = await createUser(db, 'owner@test.local');
  viewer = await createUser(db, 'viewer@test.local');
  guest = await createUser(db, 'guest@test.local');
  other = await createUser(db, 'other@test.local');
  const { rows } = await asUser(db, owner, () =>
    db.query<{ id: string }>(
      `select public.create_dossier_with_person('death', 'Jean', 'Ndong', 'GA', 'Libreville', '') as id`,
    ),
  );
  dossierId = rows[0]!.id;
  await asUser(db, owner, () =>
    db.query(`insert into dossier_member (dossier_id, user_id, role) values ($1, $2, 'viewer')`, [
      dossierId,
      viewer,
    ]),
  );
});

afterAll(async () => {
  await db?.close();
});

describe('dossier_invitation : RLS', () => {
  it('laisse le propriétaire créer et lire une invitation', async () => {
    await invite(owner, 'token-lecture-0000000000', 'contributor');
    const { rows } = await asUser(db, owner, () => db.query('select * from dossier_invitation'));
    expect(rows).toHaveLength(1);
  });

  it('interdit à un lecteur de créer ou de lire une invitation', async () => {
    await expect(invite(viewer, 'token-viewer-00000000000', 'viewer')).rejects.toMatchObject(
      RLS_DENIED,
    );
    const { rows } = await asUser(db, viewer, () => db.query('select * from dossier_invitation'));
    expect(rows).toEqual([]);
  });

  it('refuse une invitation au rôle de propriétaire', async () => {
    await expect(invite(owner, 'token-owner-000000000000', 'owner')).rejects.toMatchObject({
      code: '23514',
    });
  });

  it("refuse l'accès aux visiteurs anonymes", async () => {
    const attempt = asRole(db, 'anon', null, () => db.query('select * from dossier_invitation'));
    await expect(attempt).rejects.toMatchObject(RLS_DENIED);
  });
});

describe('accept_dossier_invitation', () => {
  it('ajoute le membre avec le rôle prévu et renvoie le dossier', async () => {
    await invite(owner, 'token-valide-000000000000', 'contributor');
    const { rows } = await accept(guest, 'token-valide-000000000000');
    expect(rows[0]?.id).toBe(dossierId);
    const member = await db.query<{ role: string; display_name: string }>(
      'select role, display_name from dossier_member where dossier_id = $1 and user_id = $2',
      [dossierId, guest],
    );
    expect(member.rows[0]).toEqual({ role: 'contributor', display_name: 'guest' });
  });

  it('refuse une invitation déjà utilisée', async () => {
    await expect(accept(other, 'token-valide-000000000000')).rejects.toMatchObject({
      code: 'TI003',
    });
  });

  it('refuse une invitation expirée', async () => {
    await db.query(
      `insert into dossier_invitation (dossier_id, role, token_hash, created_by, expires_at)
       values ($1, 'viewer', $2, $3, now() - interval '1 day')`,
      [dossierId, hash('token-expire-000000000000'), owner],
    );
    await expect(accept(other, 'token-expire-000000000000')).rejects.toMatchObject({
      code: 'TI002',
    });
  });

  it('refuse un jeton inconnu', async () => {
    await expect(accept(other, 'token-inconnu-00000000000')).rejects.toMatchObject({
      code: 'TI001',
    });
  });

  it('ne rétrograde pas un membre qui a déjà un rôle supérieur', async () => {
    await invite(owner, 'token-retro-0000000000000', 'viewer');
    await accept(owner, 'token-retro-0000000000000');
    const { rows } = await db.query<{ role: string }>(
      'select role from dossier_member where dossier_id = $1 and user_id = $2',
      [dossierId, owner],
    );
    expect(rows[0]?.role).toBe('owner');
  });

  it("refuse l'exécution aux visiteurs anonymes", async () => {
    const attempt = asRole(db, 'anon', null, () =>
      db.query(`select public.accept_dossier_invitation('token-valide-000000000000')`),
    );
    await expect(attempt).rejects.toMatchObject(RLS_DENIED);
  });
});
```

- [ ] **Étape 2 : lancer le test, il doit échouer**

Run: `pnpm --filter @testimona/supabase test -- tests/dossier-invitations.test.ts`
Expected: FAIL, `relation "dossier_invitation" does not exist`.

- [ ] **Étape 3 : écrire la migration**

`supabase/migrations/20261027000300_dossier_invitations.sql` :

```sql
-- ============================================================================
-- Lot 1 · PR 1 — invitations à rejoindre un dossier, par lien à usage unique.
-- Seule l'empreinte SHA-256 du jeton est stockée ; le jeton circule dans le lien.
-- ============================================================================

create table public.dossier_invitation (
  id uuid primary key default gen_random_uuid(),
  dossier_id uuid not null references public.dossier (id) on delete cascade,
  role public.dossier_role not null check (role <> 'owner'),
  email text check (email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  created_by uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days',
  used_at timestamptz,
  used_by uuid references auth.users (id) on delete set null
);

create index dossier_invitation_dossier_id_idx on public.dossier_invitation (dossier_id);

alter table public.dossier_invitation enable row level security;
revoke all on public.dossier_invitation from anon;

create policy dossier_invitation_select on public.dossier_invitation
  for select to authenticated
  using (public.is_dossier_member(dossier_id, 'coordinator'));

create policy dossier_invitation_insert on public.dossier_invitation
  for insert to authenticated
  with check (public.is_dossier_member(dossier_id, 'coordinator') and created_by = auth.uid());

create policy dossier_invitation_delete on public.dossier_invitation
  for delete to authenticated
  using (public.is_dossier_member(dossier_id, 'coordinator'));

-- ---------------------------------------------------------------------------
-- Acceptation. Codes d'erreur : TI001 jeton inconnu, TI002 expiré, TI003 déjà
-- utilisé, 28000 non connecté.
-- WHY: security definer, car l'invité n'est pas encore membre et ne peut ni lire
-- l'invitation ni s'ajouter lui-même ; la fonction fait ces vérifications.
-- ---------------------------------------------------------------------------
create function public.accept_dossier_invitation(p_token text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_inv public.dossier_invitation;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  select *
    into v_inv
    from public.dossier_invitation
   where token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex')
     for update;

  if not found then
    raise exception 'invitation invalid' using errcode = 'TI001';
  end if;
  if v_inv.used_at is not null then
    raise exception 'invitation already used' using errcode = 'TI003';
  end if;
  if v_inv.expires_at < now() then
    raise exception 'invitation expired' using errcode = 'TI002';
  end if;

  insert into public.dossier_member (dossier_id, user_id, role)
  values (v_inv.dossier_id, v_uid, v_inv.role)
  on conflict (dossier_id, user_id) do update
    set role = excluded.role
    where public.dossier_role_rank(public.dossier_member.role) < public.dossier_role_rank(excluded.role);

  update public.dossier_invitation
     set used_at = now(), used_by = v_uid
   where id = v_inv.id;

  return v_inv.dossier_id;
end;
$$;

revoke execute on function public.accept_dossier_invitation(text) from public, anon;
grant execute on function public.accept_dossier_invitation(text) to authenticated;
```

- [ ] **Étape 4 : lancer les tests SQL, ils doivent passer**

Run: `pnpm --filter @testimona/supabase test`
Expected: PASS (dont les 10 nouveaux tests d'invitation).

- [ ] **Étape 5 : commiter**

```bash
git add supabase/migrations/20261027000300_dossier_invitations.sql supabase/tests/dossier-invitations.test.ts
git commit -m "feat(db): add single-use dossier invitations"
```

---

### Tâche 3 : schémas, rôles et jetons

**Fichiers :**

- Créer : `apps/web/src/modules/dossier/schema.ts`, `roles.ts`, `tokens.ts`
- Test : `apps/web/src/modules/dossier/schema.test.ts`, `roles.test.ts`, `tokens.test.ts`

- [ ] **Étape 1 : écrire les tests qui échouent**

`apps/web/src/modules/dossier/schema.test.ts` :

```ts
import { describe, expect, it } from 'vitest';
import { CreateDossierInputSchema, CreateInvitationInputSchema, parseEntryPoint } from './schema';

const valid = {
  entryPoint: 'death',
  firstName: ' Jean ',
  lastName: 'Ndong',
  countryCode: 'ga',
  city: ' Libreville ',
  relationship: 'child',
};

describe('CreateDossierInputSchema', () => {
  it('normalise une saisie valide', () => {
    expect(CreateDossierInputSchema.parse(valid)).toEqual({
      entryPoint: 'death',
      firstName: 'Jean',
      lastName: 'Ndong',
      countryCode: 'GA',
      city: 'Libreville',
      relationship: 'child',
    });
  });

  it.each([
    ['entryPoint', 'after'],
    ['firstName', '  '],
    ['countryCode', 'GAB'],
    ['city', ''],
    ['relationship', 'cousin'],
  ])('refuse %s = %j', (field, value) => {
    expect(CreateDossierInputSchema.safeParse({ ...valid, [field]: value }).success).toBe(false);
  });
});

describe('CreateInvitationInputSchema', () => {
  const dossierId = '44444444-4444-4444-8444-444444444444';

  it('accepte une invitation sans e-mail', () => {
    expect(
      CreateInvitationInputSchema.parse({ dossierId, role: 'contributor', email: '' }),
    ).toEqual({
      dossierId,
      role: 'contributor',
      email: undefined,
    });
  });

  it('refuse le rôle de propriétaire et un e-mail invalide', () => {
    expect(CreateInvitationInputSchema.safeParse({ dossierId, role: 'owner' }).success).toBe(false);
    expect(
      CreateInvitationInputSchema.safeParse({ dossierId, role: 'viewer', email: 'pas-un-email' })
        .success,
    ).toBe(false);
  });
});

describe('parseEntryPoint', () => {
  it('traduit le paramètre de porte', () => {
    expect(parseEntryPoint('deces')).toBe('death');
    expect(parseEntryPoint('preparer')).toBe('prepare');
    expect(parseEntryPoint('autre')).toBe('death');
    expect(parseEntryPoint(undefined)).toBe('death');
  });
});
```

`apps/web/src/modules/dossier/roles.test.ts` :

```ts
import { describe, expect, it } from 'vitest';
import { canManageMembers, canWrite, hasRole } from './roles';

describe('rôles', () => {
  it('compare les rangs', () => {
    expect(hasRole('owner', 'coordinator')).toBe(true);
    expect(hasRole('treasurer', 'coordinator')).toBe(false);
    expect(hasRole('viewer', 'viewer')).toBe(true);
  });

  it('dérive les droits', () => {
    expect(canManageMembers('coordinator')).toBe(true);
    expect(canManageMembers('contributor')).toBe(false);
    expect(canWrite('contributor')).toBe(true);
    expect(canWrite('viewer')).toBe(false);
    expect(canWrite(null)).toBe(false);
  });
});
```

`apps/web/src/modules/dossier/tokens.test.ts` :

```ts
import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const { generateInvitationToken, hashInvitationToken } = await import('./tokens');

describe('jetons d’invitation', () => {
  it('génère des jetons base64url de 43 caractères, tous différents', () => {
    const tokens = new Set(Array.from({ length: 50 }, () => generateInvitationToken()));
    expect(tokens.size).toBe(50);
    for (const token of tokens) expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it('calcule l’empreinte SHA-256 en hexadécimal', () => {
    expect(hashInvitationToken('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });
});
```

- [ ] **Étape 2 : lancer les tests, ils doivent échouer**

Run: `cd apps/web && npx vitest run src/modules/dossier`
Expected: FAIL, modules `./schema`, `./roles`, `./tokens` introuvables.

- [ ] **Étape 3 : écrire le code**

`apps/web/src/modules/dossier/schema.ts` :

```ts
import { z } from 'zod';

export const DOSSIER_ROLES = [
  'owner',
  'coordinator',
  'treasurer',
  'contributor',
  'viewer',
] as const;
export type DossierRole = (typeof DOSSIER_ROLES)[number];

/** Rôles proposés dans une invitation : jamais propriétaire. */
export const INVITABLE_ROLES = ['coordinator', 'treasurer', 'contributor', 'viewer'] as const;

export type EntryPoint = 'death' | 'prepare' | 'after';

/** Portes ouvertes au lot 1 (« après les funérailles » arrive au lot 4). */
export const OPEN_ENTRY_POINTS = ['death', 'prepare'] as const;

export const RELATIONSHIPS = [
  'child',
  'spouse',
  'parent',
  'sibling',
  'grandchild',
  'friend',
  'other',
] as const;

/** Pays proposés à la création (CEMAC, Afrique de l'Ouest proche, diaspora). */
export const COUNTRY_CODES = [
  'GA',
  'CM',
  'CG',
  'CD',
  'GQ',
  'TD',
  'CF',
  'SN',
  'CI',
  'BJ',
  'TG',
  'FR',
  'BE',
  'CH',
  'CA',
  'US',
  'GB',
  'DE',
] as const;

const trimmed = (max: number) => z.string().trim().min(1).max(max);

export const CreateDossierInputSchema = z.object({
  entryPoint: z.enum(OPEN_ENTRY_POINTS),
  firstName: trimmed(120),
  lastName: trimmed(120),
  countryCode: z
    .string()
    .transform((s) => s.trim().toUpperCase())
    .pipe(z.string().regex(/^[A-Z]{2}$/)),
  city: trimmed(120),
  relationship: z.enum(RELATIONSHIPS),
});
export type CreateDossierInput = z.infer<typeof CreateDossierInputSchema>;

export const CreateInvitationInputSchema = z.object({
  dossierId: z.string().uuid(),
  role: z.enum(INVITABLE_ROLES),
  email: z
    .union([z.literal(''), z.string().trim().email().max(254)])
    .optional()
    .transform((v) => v || undefined),
});
export type CreateInvitationInput = z.infer<typeof CreateInvitationInputSchema>;

/** Paramètre `?porte=` de l'URL vers une porte d'entrée (décès par défaut). */
export function parseEntryPoint(porte: string | undefined): (typeof OPEN_ENTRY_POINTS)[number] {
  return porte === 'preparer' ? 'prepare' : 'death';
}
```

`apps/web/src/modules/dossier/roles.ts` :

```ts
import type { DossierRole } from './schema';

const RANK: Record<DossierRole, number> = {
  owner: 50,
  coordinator: 40,
  treasurer: 30,
  contributor: 20,
  viewer: 10,
};

/** Même règle que `public.dossier_role_rank()` en base. */
export function hasRole(role: DossierRole | null | undefined, min: DossierRole): boolean {
  return role != null && RANK[role] >= RANK[min];
}

export const canManageMembers = (role: DossierRole | null | undefined) =>
  hasRole(role, 'coordinator');
export const canWrite = (role: DossierRole | null | undefined) => hasRole(role, 'contributor');
```

`apps/web/src/modules/dossier/tokens.ts` :

```ts
import 'server-only';
import { createHash, randomBytes } from 'node:crypto';

/** Jeton d'invitation : 32 octets aléatoires en base64url (43 caractères). */
export function generateInvitationToken(): string {
  return randomBytes(32).toString('base64url');
}

/** Empreinte stockée en base ; identique à `sha256()` de `accept_dossier_invitation`. */
export function hashInvitationToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}
```

- [ ] **Étape 4 : lancer les tests, ils doivent passer**

Run: `cd apps/web && npx vitest run src/modules/dossier`
Expected: PASS.

- [ ] **Étape 5 : commiter**

```bash
git add apps/web/src/modules/dossier/schema.ts apps/web/src/modules/dossier/roles.ts apps/web/src/modules/dossier/tokens.ts apps/web/src/modules/dossier/*.test.ts
git commit -m "feat(dossier): add input schemas, roles and invitation tokens"
```

---

### Tâche 4 : accès base (`repo.ts`)

**Fichiers :**

- Créer : `apps/web/src/modules/dossier/repo.ts`

`repo.ts` ne contient que des requêtes ; il est couvert par les tests SQL (tâches 1 et 2) et par les
tests du service (tâche 5), qui le simulent.

- [ ] **Étape 1 : écrire le code**

```ts
import 'server-only';
import { getSupabaseServer } from '@/lib/supabase/server';
import type { CreateDossierInput, DossierRole, EntryPoint } from './schema';

export interface RepoError {
  code: string;
  message: string;
}
export type RepoResult<T> = { data: T; error: null } | { data: null; error: RepoError };

export interface DossierSummary {
  id: string;
  title: string;
  city: string;
  countryCode: string;
  entryPoint: EntryPoint;
  createdAt: string;
}

export interface PersonSummary {
  firstName: string;
  lastName: string;
  nickname: string | null;
  birthDate: string | null;
  deathDate: string | null;
}

export interface MemberSummary {
  userId: string;
  role: DossierRole;
  displayName: string | null;
}

export interface InvitationSummary {
  id: string;
  role: DossierRole;
  email: string | null;
  createdAt: string;
  expiresAt: string;
  usedAt: string | null;
}

interface DossierRow {
  id: string;
  title: string;
  city: string;
  country_code: string;
  entry_point: EntryPoint;
  created_at: string;
}

const DOSSIER_COLUMNS = 'id, title, city, country_code, entry_point, created_at';

function toDossier(r: DossierRow): DossierSummary {
  return {
    id: r.id,
    title: r.title,
    city: r.city,
    countryCode: r.country_code,
    entryPoint: r.entry_point,
    createdAt: r.created_at,
  };
}

function fail(error: { code?: string; message?: string } | null, fallback: string): RepoError {
  return { code: error?.code || 'unknown', message: error?.message || fallback };
}

export async function insertDossierWithPerson(
  input: CreateDossierInput,
): Promise<RepoResult<string>> {
  const db = await getSupabaseServer();
  const { data, error } = await db.rpc('create_dossier_with_person', {
    p_entry_point: input.entryPoint,
    p_first_name: input.firstName,
    p_last_name: input.lastName,
    p_country_code: input.countryCode,
    p_city: input.city,
    p_relationship: input.relationship,
  });
  if (error || typeof data !== 'string')
    return { data: null, error: fail(error, 'no id returned') };
  return { data, error: null };
}

/** Dossiers dont l'utilisateur est membre (filtrés par la RLS). */
export async function listMyDossiers(): Promise<DossierSummary[]> {
  const db = await getSupabaseServer();
  const { data } = await db
    .from('dossier')
    .select(DOSSIER_COLUMNS)
    .order('created_at', { ascending: false })
    .returns<DossierRow[]>();
  return (data ?? []).map(toDossier);
}

export async function getDossier(id: string): Promise<DossierSummary | null> {
  const db = await getSupabaseServer();
  const { data } = await db
    .from('dossier')
    .select(DOSSIER_COLUMNS)
    .eq('id', id)
    .maybeSingle<DossierRow>();
  return data ? toDossier(data) : null;
}

export async function getPerson(dossierId: string): Promise<PersonSummary | null> {
  const db = await getSupabaseServer();
  const { data } = await db
    .from('person')
    .select('first_name, last_name, nickname, birth_date, death_date')
    .eq('dossier_id', dossierId)
    .maybeSingle<{
      first_name: string;
      last_name: string;
      nickname: string | null;
      birth_date: string | null;
      death_date: string | null;
    }>();
  if (!data) return null;
  return {
    firstName: data.first_name,
    lastName: data.last_name,
    nickname: data.nickname,
    birthDate: data.birth_date,
    deathDate: data.death_date,
  };
}

export async function listMembers(dossierId: string): Promise<MemberSummary[]> {
  const db = await getSupabaseServer();
  const { data } = await db
    .from('dossier_member')
    .select('user_id, role, display_name')
    .eq('dossier_id', dossierId)
    .order('created_at', { ascending: true })
    .returns<{ user_id: string; role: DossierRole; display_name: string | null }[]>();
  return (data ?? []).map((m) => ({
    userId: m.user_id,
    role: m.role,
    displayName: m.display_name,
  }));
}

export async function listInvitations(dossierId: string): Promise<InvitationSummary[]> {
  const db = await getSupabaseServer();
  const { data } = await db
    .from('dossier_invitation')
    .select('id, role, email, created_at, expires_at, used_at')
    .eq('dossier_id', dossierId)
    .order('created_at', { ascending: false })
    .returns<
      {
        id: string;
        role: DossierRole;
        email: string | null;
        created_at: string;
        expires_at: string;
        used_at: string | null;
      }[]
    >();
  return (data ?? []).map((i) => ({
    id: i.id,
    role: i.role,
    email: i.email,
    createdAt: i.created_at,
    expiresAt: i.expires_at,
    usedAt: i.used_at,
  }));
}

export async function insertInvitation(args: {
  dossierId: string;
  role: DossierRole;
  email: string | undefined;
  tokenHash: string;
}): Promise<RepoResult<string>> {
  const db = await getSupabaseServer();
  const { data, error } = await db
    .from('dossier_invitation')
    .insert({
      dossier_id: args.dossierId,
      role: args.role,
      email: args.email ?? null,
      token_hash: args.tokenHash,
    })
    .select('id')
    .single<{ id: string }>();
  if (error || !data) return { data: null, error: fail(error, 'insert failed') };
  return { data: data.id, error: null };
}

export async function deleteInvitation(id: string): Promise<RepoResult<null>> {
  const db = await getSupabaseServer();
  const { error } = await db.from('dossier_invitation').delete().eq('id', id);
  if (error) return { data: null, error: fail(error, 'delete failed') };
  return { data: null, error: null };
}

export async function acceptInvitationByToken(token: string): Promise<RepoResult<string>> {
  const db = await getSupabaseServer();
  const { data, error } = await db.rpc('accept_dossier_invitation', { p_token: token });
  if (error || typeof data !== 'string')
    return { data: null, error: fail(error, 'no id returned') };
  return { data, error: null };
}
```

- [ ] **Étape 2 : vérifier types et lint**

Run: `pnpm typecheck && pnpm lint`
Expected: 0 erreur (le fichier est un `repo.ts`, donc autorisé à appeler `.from()`).

- [ ] **Étape 3 : commiter**

```bash
git add apps/web/src/modules/dossier/repo.ts
git commit -m "feat(dossier): add data access for dossiers, members and invitations"
```

---

### Tâche 5 : e-mail d'invitation et service

**Fichiers :**

- Modifier : `apps/web/src/lib/email/resend.ts` (ajout avant la section `// Helpers`)
- Créer : `apps/web/src/modules/dossier/service.ts`
- Test : `apps/web/src/lib/email/dossier-invite.test.ts`, `apps/web/src/modules/dossier/service.test.ts`

- [ ] **Étape 1 : écrire les tests qui échouent**

`apps/web/src/lib/email/dossier-invite.test.ts` :

```ts
import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('resend', () => ({ Resend: class {} }));

const { dossierInviteEmail } = await import('./resend');

describe('dossierInviteEmail', () => {
  it('construit un e-mail en français avec le lien', () => {
    const mail = dossierInviteEmail({
      to: 'marie@test.local',
      inviterName: 'Paul',
      personName: 'Jean Ndong',
      url: 'https://exemple.test/invitation/abc',
      locale: 'fr',
    });
    expect(mail.to).toBe('marie@test.local');
    expect(mail.subject).toContain('Jean Ndong');
    expect(mail.html).toContain('https://exemple.test/invitation/abc');
  });

  it('échappe le HTML des noms', () => {
    const mail = dossierInviteEmail({
      to: 'marie@test.local',
      inviterName: '<script>x</script>',
      personName: 'Jean',
      url: 'https://exemple.test/invitation/abc',
      locale: 'en',
    });
    expect(mail.html).not.toContain('<script>');
    expect(mail.html).toContain('&lt;script&gt;');
  });
});
```

`apps/web/src/modules/dossier/service.test.ts` :

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

// WHY: vi.mock est remonté en tête de fichier ; les doublures doivent donc être
// créées avec vi.hoisted pour exister au moment où les fabriques s'exécutent.
const { repo, email } = vi.hoisted(() => ({
  repo: {
    insertDossierWithPerson: vi.fn(),
    insertInvitation: vi.fn(),
    deleteInvitation: vi.fn(),
    acceptInvitationByToken: vi.fn(),
  },
  email: {
    sendEmail: vi.fn(),
    dossierInviteEmail: vi.fn(() => ({ to: 'x', subject: 's', html: 'h' })),
  },
}));

vi.mock('server-only', () => ({}));
vi.mock('./repo', () => repo);
vi.mock('@/lib/email/resend', () => email);

const service = await import('./service');

const DOSSIER = '44444444-4444-4444-8444-444444444444';
const ctx = {
  siteUrl: 'https://exemple.test',
  locale: 'en',
  inviterName: 'Paul',
  personName: 'Jean Ndong',
};
const validDossier = {
  entryPoint: 'death',
  firstName: 'Jean',
  lastName: 'Ndong',
  countryCode: 'GA',
  city: 'Libreville',
  relationship: 'child',
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('createDossier', () => {
  it('renvoie les erreurs de champ sans toucher la base', async () => {
    const res = await service.createDossier({ entryPoint: 'death', firstName: '' });
    expect(res).toMatchObject({ ok: false, error: 'validation' });
    expect(res.ok === false && res.fieldErrors?.firstName).toBeTruthy();
    expect(repo.insertDossierWithPerson).not.toHaveBeenCalled();
  });

  it("renvoie l'identifiant du dossier créé", async () => {
    repo.insertDossierWithPerson.mockResolvedValue({ data: DOSSIER, error: null });
    expect(await service.createDossier(validDossier)).toEqual({ ok: true, data: { id: DOSSIER } });
  });

  it('traduit un refus RLS en « forbidden »', async () => {
    repo.insertDossierWithPerson.mockResolvedValue({
      data: null,
      error: { code: '42501', message: 'x' },
    });
    expect(await service.createDossier(validDossier)).toEqual({ ok: false, error: 'forbidden' });
  });
});

describe('createInvitation', () => {
  it("stocke l'empreinte, jamais le jeton, et renvoie un lien localisé", async () => {
    repo.insertInvitation.mockResolvedValue({ data: 'inv-1', error: null });
    const res = await service.createInvitation(
      { dossierId: DOSSIER, role: 'contributor', email: '' },
      ctx,
    );
    expect(res.ok).toBe(true);
    const { tokenHash } = repo.insertInvitation.mock.calls[0]![0];
    expect(tokenHash).toMatch(/^[0-9a-f]{64}$/);
    if (res.ok) {
      expect(res.data.url).toMatch(/^https:\/\/exemple\.test\/en\/invitation\/[A-Za-z0-9_-]{43}$/);
      expect(res.data.url).not.toContain(tokenHash);
      expect(res.data.emailSent).toBe(false);
    }
    expect(email.sendEmail).not.toHaveBeenCalled();
  });

  it("envoie l'e-mail quand une adresse est fournie", async () => {
    repo.insertInvitation.mockResolvedValue({ data: 'inv-1', error: null });
    email.sendEmail.mockResolvedValue({ ok: true });
    const res = await service.createInvitation(
      { dossierId: DOSSIER, role: 'viewer', email: 'marie@test.local' },
      ctx,
    );
    expect(res).toMatchObject({ ok: true, data: { emailSent: true } });
    expect(email.dossierInviteEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'marie@test.local', personName: 'Jean Ndong', locale: 'en' }),
    );
  });

  it('traduit un refus RLS en « forbidden »', async () => {
    repo.insertInvitation.mockResolvedValue({ data: null, error: { code: '42501', message: 'x' } });
    const res = await service.createInvitation({ dossierId: DOSSIER, role: 'viewer' }, ctx);
    expect(res).toEqual({ ok: false, error: 'forbidden' });
  });
});

describe('acceptInvitation', () => {
  it.each([
    ['TI001', 'invitation_invalid'],
    ['TI002', 'invitation_expired'],
    ['TI003', 'invitation_used'],
    ['28000', 'unauthenticated'],
  ])('traduit le code %s', async (code, error) => {
    repo.acceptInvitationByToken.mockResolvedValue({ data: null, error: { code, message: 'x' } });
    expect(await service.acceptInvitation('A'.repeat(43))).toEqual({ ok: false, error });
  });

  it('refuse un jeton mal formé sans interroger la base', async () => {
    expect(await service.acceptInvitation('court')).toEqual({
      ok: false,
      error: 'invitation_invalid',
    });
    expect(repo.acceptInvitationByToken).not.toHaveBeenCalled();
  });

  it('renvoie le dossier rejoint', async () => {
    repo.acceptInvitationByToken.mockResolvedValue({ data: DOSSIER, error: null });
    expect(await service.acceptInvitation('A'.repeat(43))).toEqual({
      ok: true,
      data: { dossierId: DOSSIER },
    });
  });
});

describe('revokeInvitation', () => {
  it('refuse un identifiant invalide', async () => {
    expect(await service.revokeInvitation('pas-un-uuid')).toEqual({
      ok: false,
      error: 'validation',
    });
    expect(repo.deleteInvitation).not.toHaveBeenCalled();
  });
});
```

- [ ] **Étape 2 : lancer les tests, ils doivent échouer**

Run: `cd apps/web && npx vitest run src/modules/dossier/service.test.ts src/lib/email/dossier-invite.test.ts`
Expected: FAIL, `dossierInviteEmail` et `./service` introuvables.

- [ ] **Étape 3 : ajouter le modèle d'e-mail**

Dans `apps/web/src/lib/email/resend.ts`, juste avant la section `// Helpers`, ajouter :

```ts
interface DossierInviteArgs {
  to: string;
  inviterName: string | null;
  personName: string;
  url: string;
  locale: string;
}

/** Invitation à rejoindre un dossier familial (lien à usage unique, 7 jours). */
export function dossierInviteEmail({
  to,
  inviterName,
  personName,
  url,
  locale,
}: DossierInviteArgs) {
  const isFr = locale === 'fr';
  const who = inviterName
    ? `<strong>${escapeHtml(inviterName)}</strong>`
    : isFr
      ? 'Un proche'
      : 'A relative';
  const subject = isFr
    ? `Invitation à rejoindre le dossier de ${personName}`
    : `Invitation to join ${personName}'s family space`;
  const intro = isFr
    ? `${who} vous invite à préparer avec la famille l'hommage à <strong>${escapeHtml(personName)}</strong>.`
    : `${who} invites you to prepare <strong>${escapeHtml(personName)}</strong>'s tribute with the family.`;
  const explain = isFr
    ? 'Ce lien est personnel et valable 7 jours. Connectez-vous ou créez un compte pour rejoindre le dossier.'
    : 'This link is personal and valid for 7 days. Sign in or create an account to join.';
  const ctaText = isFr ? 'Rejoindre le dossier' : 'Join the family space';
  return {
    to,
    subject,
    html: layout({
      heading: subject,
      body: `
        <p>${intro}</p>
        <p>${explain}</p>
        <p style="text-align:center;margin:32px 0">
          <a href="${escapeHtml(url)}" style="${button()}">${ctaText}</a>
        </p>
      `,
      locale,
    }),
  };
}
```

Le sujet n'est pas échappé : c'est un en-tête d'e-mail en texte brut, pas du HTML.

- [ ] **Étape 4 : écrire le service**

`apps/web/src/modules/dossier/service.ts` :

```ts
import 'server-only';
import { z } from 'zod';
import { localizedPath } from '@/lib/auth/redirect-target';
import { dossierInviteEmail, sendEmail } from '@/lib/email/resend';
import * as repo from './repo';
import { CreateDossierInputSchema, CreateInvitationInputSchema } from './schema';
import { generateInvitationToken, hashInvitationToken } from './tokens';

export type DossierError =
  | 'validation'
  | 'forbidden'
  | 'invitation_invalid'
  | 'invitation_expired'
  | 'invitation_used'
  | 'unauthenticated'
  | 'unknown';

export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: DossierError; fieldErrors?: Record<string, string> };

export interface InvitationContext {
  siteUrl: string;
  locale: string;
  inviterName: string | null;
  personName: string;
}

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{20,100}$/;

const CODE_TO_ERROR: Record<string, DossierError> = {
  '42501': 'forbidden',
  TI001: 'invitation_invalid',
  TI002: 'invitation_expired',
  TI003: 'invitation_used',
  '28000': 'unauthenticated',
};

function fromRepo(error: repo.RepoError, scope: string): { ok: false; error: DossierError } {
  const mapped = CODE_TO_ERROR[error.code];
  if (!mapped) console.error(`[dossier] ${scope} failed`, { code: error.code });
  return { ok: false, error: mapped ?? 'unknown' };
}

function fieldErrors(issues: z.ZodIssue[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path.join('.');
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

/** Crée dossier, personne et lien du créateur en une transaction. */
export async function createDossier(raw: unknown): Promise<Result<{ id: string }>> {
  const parsed = CreateDossierInputSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: 'validation', fieldErrors: fieldErrors(parsed.error.issues) };
  }
  const res = await repo.insertDossierWithPerson(parsed.data);
  if (res.error) return fromRepo(res.error, 'createDossier');
  return { ok: true, data: { id: res.data } };
}

/**
 * Crée une invitation et renvoie le lien à partager. Le jeton n'existe que dans
 * ce lien ; la base n'en garde que l'empreinte.
 */
export async function createInvitation(
  raw: unknown,
  ctx: InvitationContext,
): Promise<Result<{ url: string; emailSent: boolean }>> {
  const parsed = CreateInvitationInputSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: 'validation', fieldErrors: fieldErrors(parsed.error.issues) };
  }
  const token = generateInvitationToken();
  const res = await repo.insertInvitation({
    dossierId: parsed.data.dossierId,
    role: parsed.data.role,
    email: parsed.data.email,
    tokenHash: hashInvitationToken(token),
  });
  if (res.error) return fromRepo(res.error, 'createInvitation');

  const url = `${ctx.siteUrl}${localizedPath(`/invitation/${token}`, ctx.locale)}`;
  let emailSent = false;
  if (parsed.data.email) {
    const sent = await sendEmail(
      dossierInviteEmail({
        to: parsed.data.email,
        inviterName: ctx.inviterName,
        personName: ctx.personName,
        url,
        locale: ctx.locale,
      }),
    );
    emailSent = sent.ok;
  }
  return { ok: true, data: { url, emailSent } };
}

export async function revokeInvitation(id: string): Promise<Result<null>> {
  if (!z.string().uuid().safeParse(id).success) return { ok: false, error: 'validation' };
  const res = await repo.deleteInvitation(id);
  if (res.error) return fromRepo(res.error, 'revokeInvitation');
  return { ok: true, data: null };
}

export async function acceptInvitation(token: string): Promise<Result<{ dossierId: string }>> {
  if (!TOKEN_PATTERN.test(token)) return { ok: false, error: 'invitation_invalid' };
  const res = await repo.acceptInvitationByToken(token);
  if (res.error) return fromRepo(res.error, 'acceptInvitation');
  return { ok: true, data: { dossierId: res.data } };
}
```

- [ ] **Étape 5 : lancer les tests, ils doivent passer**

Run: `cd apps/web && npx vitest run src/modules/dossier src/lib/email`
Expected: PASS.

- [ ] **Étape 6 : commiter**

```bash
git add apps/web/src/lib/email/resend.ts apps/web/src/lib/email/dossier-invite.test.ts apps/web/src/modules/dossier/service.ts apps/web/src/modules/dossier/service.test.ts
git commit -m "feat(dossier): add dossier service and invitation e-mail"
```

---

### Tâche 6 : actions serveur et routes protégées

**Fichiers :**

- Créer : `apps/web/src/modules/dossier/actions.ts`
- Modifier : `apps/web/src/middleware.ts:19`

- [ ] **Étape 1 : écrire les actions**

`apps/web/src/modules/dossier/actions.ts` :

```ts
'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getLocale } from 'next-intl/server';
import { localizedPath } from '@/lib/auth/redirect-target';
import { getCurrentUser } from '@/lib/supabase/server';
import { getPerson } from './repo';
import * as service from './service';
import type { DossierError } from './service';

export interface FormState {
  error?: DossierError;
  fieldErrors?: Record<string, string>;
}

export interface InviteState extends FormState {
  url?: string;
  emailSent?: boolean;
}

const field = (formData: FormData, name: string) => String(formData.get(name) ?? '');

export async function createDossierAction(
  _prev: FormState | null,
  formData: FormData,
): Promise<FormState> {
  if (!(await getCurrentUser())) return { error: 'unauthenticated' };
  const res = await service.createDossier({
    entryPoint: field(formData, 'entryPoint'),
    firstName: field(formData, 'firstName'),
    lastName: field(formData, 'lastName'),
    countryCode: field(formData, 'countryCode'),
    city: field(formData, 'city'),
    relationship: field(formData, 'relationship'),
  });
  if (!res.ok) return { error: res.error, fieldErrors: res.fieldErrors };
  redirect(localizedPath(`/dossier/${res.data.id}`, await getLocale()));
}

export async function createInvitationAction(
  _prev: InviteState | null,
  formData: FormData,
): Promise<InviteState> {
  const user = await getCurrentUser();
  if (!user) return { error: 'unauthenticated' };
  const dossierId = field(formData, 'dossierId');
  const person = await getPerson(dossierId);
  const meta = (user.user_metadata ?? {}) as { nickname?: string; full_name?: string };
  const res = await service.createInvitation(
    { dossierId, role: field(formData, 'role'), email: field(formData, 'email') },
    {
      siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? '',
      locale: await getLocale(),
      inviterName: meta.nickname || meta.full_name || null,
      personName: person ? `${person.firstName} ${person.lastName}` : '',
    },
  );
  if (!res.ok) return { error: res.error, fieldErrors: res.fieldErrors };
  revalidatePath('/[locale]/dossier/[id]/membres', 'page');
  return { url: res.data.url, emailSent: res.data.emailSent };
}

export async function revokeInvitationAction(formData: FormData): Promise<void> {
  await service.revokeInvitation(field(formData, 'invitationId'));
  revalidatePath('/[locale]/dossier/[id]/membres', 'page');
}

export async function acceptInvitationAction(
  _prev: FormState | null,
  formData: FormData,
): Promise<FormState> {
  if (!(await getCurrentUser())) return { error: 'unauthenticated' };
  const res = await service.acceptInvitation(field(formData, 'token'));
  if (!res.ok) return { error: res.error };
  redirect(localizedPath(`/dossier/${res.data.dossierId}`, await getLocale()));
}
```

- [ ] **Étape 2 : protéger les nouvelles routes**

Dans `apps/web/src/middleware.ts`, remplacer la ligne 19 :

```ts
const PROTECTED_PREFIXES = ['/dossier', '/invitation', '/dashboard', '/admin'];
```

- [ ] **Étape 3 : vérifier types, lint et tests**

Run: `pnpm typecheck && pnpm lint && pnpm test`
Expected: 0 erreur de type, 0 erreur de lint, tous les tests verts.

- [ ] **Étape 4 : commiter**

```bash
git add apps/web/src/modules/dossier/actions.ts apps/web/src/middleware.ts
git commit -m "feat(dossier): add server actions and protect dossier routes"
```

---

### Tâche 7 : textes FR/EN

**Fichiers :**

- Modifier : `apps/web/messages/fr.json`, `apps/web/messages/en.json`

- [ ] **Étape 1 : ajouter les espaces `doors` et `dossier`**

Ajouter à la racine de `apps/web/messages/fr.json` :

```json
"doors": {
  "title": "Que vivez-vous en ce moment ?",
  "lead": "Testimona accompagne les familles, de la fin de vie au deuil. Choisissez votre situation : nous adaptons le parcours, une question à la fois.",
  "death": { "title": "Un proche vient de nous quitter", "desc": "Annoncer, organiser, financer les funérailles." },
  "prepare": { "title": "Préparer avec un proche", "desc": "Recueillir ses volontés et son histoire, pendant qu'il est là." },
  "after": { "title": "Après les funérailles", "desc": "Remercier, clôturer les cotisations, se souvenir." },
  "soon": "Bientôt disponible",
  "searchTitle": "Retrouver un mémorial",
  "searchPlaceholder": "Nom, prénom ou surnom",
  "searchSubmit": "Rechercher",
  "browseMemorials": "Voir les mémoriaux"
},
"dossier": {
  "myDossiers": "Mes dossiers",
  "inCity": "{city}",
  "new": {
    "whoTitle": "Pour qui ouvrez-vous ce dossier ?",
    "firstName": "Prénom",
    "lastName": "Nom",
    "whereTitle": "Où vivait-il ou elle ?",
    "whereHint": "Nous l'utilisons pour vous suggérer des prestataires proches.",
    "country": "Pays",
    "city": "Ville",
    "relationshipTitle": "Quel est votre lien avec cette personne ?",
    "relationships": { "child": "Enfant", "spouse": "Conjoint ou conjointe", "parent": "Parent", "sibling": "Frère ou sœur", "grandchild": "Petit-enfant", "friend": "Ami ou amie", "other": "Autre" },
    "back": "Revenir",
    "next": "Suivant",
    "submit": "Ouvrir le dossier",
    "required": "Ce champ est obligatoire."
  },
  "overview": {
    "journeyTitle": "Le parcours",
    "journeySoon": "Les premières étapes (biographie, annonces) arrivent très bientôt dans ce dossier.",
    "membersTitle": "La famille",
    "membersCount": "{count, plural, =1 {1 membre} other {# membres}}",
    "manageMembers": "Gérer les membres"
  },
  "members": {
    "title": "Membres du dossier",
    "you": "vous",
    "roles": { "owner": "Propriétaire", "coordinator": "Coordinateur", "treasurer": "Trésorier", "contributor": "Contributeur", "viewer": "Lecteur" },
    "inviteTitle": "Inviter un proche",
    "inviteRole": "Rôle",
    "inviteEmail": "E-mail (facultatif)",
    "inviteSubmit": "Créer le lien d'invitation",
    "inviteReady": "Lien prêt. Il est valable 7 jours et ne sert qu'une fois.",
    "inviteEmailSent": "L'invitation a aussi été envoyée par e-mail.",
    "copy": "Copier le lien",
    "copied": "Lien copié",
    "shareWhatsapp": "Partager sur WhatsApp",
    "whatsappText": "Je t'invite à rejoindre le dossier de {name} sur Testimona : {url}",
    "pendingTitle": "Invitations en attente",
    "expires": "expire le {date}",
    "revoke": "Révoquer",
    "readOnly": "Seuls les coordinateurs peuvent inviter de nouveaux membres."
  },
  "invitation": {
    "title": "Rejoindre un dossier familial",
    "lead": "Vous avez reçu une invitation à préparer un hommage avec la famille.",
    "accept": "Rejoindre le dossier"
  },
  "errors": {
    "validation": "Certaines informations sont incomplètes.",
    "forbidden": "Vous n'avez pas les droits pour cette action.",
    "invitation_invalid": "Ce lien d'invitation n'est pas valide. Demandez un nouveau lien.",
    "invitation_expired": "Ce lien d'invitation a expiré. Demandez un nouveau lien.",
    "invitation_used": "Ce lien a déjà été utilisé. Demandez un nouveau lien.",
    "unauthenticated": "Connectez-vous pour continuer.",
    "unknown": "Une erreur est survenue. Réessayez dans un instant."
  }
}
```

Ajouter à la racine de `apps/web/messages/en.json` :

```json
"doors": {
  "title": "What are you going through right now?",
  "lead": "Testimona supports families from end of life to grief. Choose your situation: we adapt the journey, one question at a time.",
  "death": { "title": "Someone close has just passed away", "desc": "Announce, organise and fund the funeral." },
  "prepare": { "title": "Prepare with a loved one", "desc": "Gather their wishes and their story while they are here." },
  "after": { "title": "After the funeral", "desc": "Say thank you, close the contributions, remember." },
  "soon": "Coming soon",
  "searchTitle": "Find a memorial",
  "searchPlaceholder": "First name, last name or nickname",
  "searchSubmit": "Search",
  "browseMemorials": "Browse memorials"
},
"dossier": {
  "myDossiers": "My family spaces",
  "inCity": "{city}",
  "new": {
    "whoTitle": "Who is this family space for?",
    "firstName": "First name",
    "lastName": "Last name",
    "whereTitle": "Where did they live?",
    "whereHint": "We use it to suggest providers near you.",
    "country": "Country",
    "city": "City",
    "relationshipTitle": "How are you related to this person?",
    "relationships": { "child": "Child", "spouse": "Spouse or partner", "parent": "Parent", "sibling": "Brother or sister", "grandchild": "Grandchild", "friend": "Friend", "other": "Other" },
    "back": "Back",
    "next": "Next",
    "submit": "Open the family space",
    "required": "This field is required."
  },
  "overview": {
    "journeyTitle": "The journey",
    "journeySoon": "The first steps (biography, announcements) are coming very soon to this space.",
    "membersTitle": "The family",
    "membersCount": "{count, plural, =1 {1 member} other {# members}}",
    "manageMembers": "Manage members"
  },
  "members": {
    "title": "Members",
    "you": "you",
    "roles": { "owner": "Owner", "coordinator": "Coordinator", "treasurer": "Treasurer", "contributor": "Contributor", "viewer": "Viewer" },
    "inviteTitle": "Invite a relative",
    "inviteRole": "Role",
    "inviteEmail": "E-mail (optional)",
    "inviteSubmit": "Create the invitation link",
    "inviteReady": "Link ready. It is valid for 7 days and works only once.",
    "inviteEmailSent": "The invitation was also sent by e-mail.",
    "copy": "Copy link",
    "copied": "Link copied",
    "shareWhatsapp": "Share on WhatsApp",
    "whatsappText": "Join {name}'s family space on Testimona: {url}",
    "pendingTitle": "Pending invitations",
    "expires": "expires on {date}",
    "revoke": "Revoke",
    "readOnly": "Only coordinators can invite new members."
  },
  "invitation": {
    "title": "Join a family space",
    "lead": "You have been invited to prepare a tribute with the family.",
    "accept": "Join the family space"
  },
  "errors": {
    "validation": "Some information is missing.",
    "forbidden": "You are not allowed to do this.",
    "invitation_invalid": "This invitation link is not valid. Ask for a new link.",
    "invitation_expired": "This invitation link has expired. Ask for a new link.",
    "invitation_used": "This link has already been used. Ask for a new link.",
    "unauthenticated": "Sign in to continue.",
    "unknown": "Something went wrong. Please try again in a moment."
  }
}
```

- [ ] **Étape 2 : vérifier que les deux fichiers ont les mêmes clés**

Run:

```bash
cd apps/web && node -e "
const f=require('./messages/fr.json'),e=require('./messages/en.json');
const keys=(o,p='')=>Object.entries(o).flatMap(([k,v])=>typeof v==='object'?keys(v,p+k+'.'):[p+k]);
const a=new Set(keys(f)),b=new Set(keys(e));
const diff=[...a].filter(k=>!b.has(k)).concat([...b].filter(k=>!a.has(k)));
console.log(diff.length?diff:'identiques');"
```

Expected: `identiques`.

- [ ] **Étape 3 : commiter**

```bash
git add apps/web/messages/fr.json apps/web/messages/en.json
git commit -m "feat(i18n): add entry doors and dossier texts"
```

---

### Tâche 8 : nouvel accueil et `/memoriaux`

**Fichiers :**

- Déplacer : `apps/web/src/app/[locale]/page.tsx` → `apps/web/src/app/[locale]/(public)/memoriaux/page.tsx`
- Créer : `apps/web/src/app/[locale]/page.tsx`, `apps/web/src/modules/dossier/ui/EntryDoors.tsx`,
  `apps/web/src/modules/dossier/ui/MyDossiers.tsx`
- Modifier : `apps/web/e2e/smoke.spec.ts`

- [ ] **Étape 1 : déplacer l'accueil actuel tel quel**

```bash
mkdir -p "apps/web/src/app/[locale]/(public)/memoriaux"
git mv "apps/web/src/app/[locale]/page.tsx" "apps/web/src/app/[locale]/(public)/memoriaux/page.tsx"
```

- [ ] **Étape 2 : adapter le test e2e (il doit échouer)**

Dans `apps/web/e2e/smoke.spec.ts`, remplacer le test `Home (anonymous) — V2 hero "beautiful stories"`
par :

```ts
test('Home (anonymous) — three entry doors', async ({ page }) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: /Que vivez-vous en ce moment|What are you going through/ }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: /Un proche vient de nous quitter|Someone close/ }),
  ).toBeVisible();
  await expect(page.getByText(/Bientôt disponible|Coming soon/)).toBeVisible();
});

test('Memorials page — previous home content', async ({ page }) => {
  await page.goto('/memoriaux');
  await expect(page.getByText(/beaux souvenirs|beautiful stories/)).toBeVisible();
});

test('New dossier requires sign-in', async ({ page }) => {
  await page.goto('/dossier/nouveau?porte=deces');
  await expect(page).toHaveURL(/\/login\?next=/);
});
```

Run: `pnpm --filter @testimona/web test:e2e -- e2e/smoke.spec.ts`
Expected: FAIL sur « three entry doors » (la page `/` n'existe plus). Ce test demande les variables
Supabase dans `apps/web/.env.local` ; sans elles, passer à l'étape 3 et le lancer à la tâche 12.

- [ ] **Étape 3 : écrire les composants de l'accueil**

`apps/web/src/modules/dossier/ui/EntryDoors.tsx` :

```tsx
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

const DOORS = [
  { key: 'death', porte: 'deces', highlight: true },
  { key: 'prepare', porte: 'preparer', highlight: false },
  { key: 'after', porte: null, highlight: false },
] as const;

export async function EntryDoors() {
  const t = await getTranslations('doors');
  return (
    <section aria-labelledby="doors-title" className="space-y-6">
      <div className="space-y-3">
        <h1
          id="doors-title"
          className="font-display text-foreground text-balance text-3xl font-bold tracking-tight sm:text-4xl"
        >
          {t('title')}
        </h1>
        <p className="text-muted-foreground max-w-2xl">{t('lead')}</p>
      </div>
      <ul className="grid gap-4 sm:grid-cols-3">
        {DOORS.map((door) => {
          const body = (
            <>
              <span className="font-display text-foreground block text-lg font-semibold">
                {t(`${door.key}.title`)}
              </span>
              <span className="text-muted-foreground mt-2 block text-sm">
                {t(`${door.key}.desc`)}
              </span>
            </>
          );
          const base = 'block h-full rounded-2xl border p-5 transition-colors';
          return (
            <li key={door.key}>
              {door.porte ? (
                <Link
                  href={`/dossier/nouveau?porte=${door.porte}`}
                  className={`${base} ${
                    door.highlight
                      ? 'border-accent bg-bg-hover-pink hover:bg-bg-active-pink'
                      : 'border-border bg-background hover:bg-surface'
                  }`}
                >
                  {body}
                </Link>
              ) : (
                <div aria-disabled="true" className={`${base} border-border bg-muted opacity-70`}>
                  {body}
                  <span className="text-primary mt-3 block text-xs font-semibold uppercase tracking-wide">
                    {t('soon')}
                  </span>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
```

`apps/web/src/modules/dossier/ui/MyDossiers.tsx` :

```tsx
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import type { DossierSummary } from '../repo';

export async function MyDossiers({ dossiers }: { dossiers: DossierSummary[] }) {
  const t = await getTranslations('dossier');
  return (
    <section aria-labelledby="my-dossiers-title" className="space-y-4">
      <h2 id="my-dossiers-title" className="font-display text-foreground text-xl font-semibold">
        {t('myDossiers')}
      </h2>
      <ul className="grid gap-3 sm:grid-cols-2">
        {dossiers.map((d) => (
          <li key={d.id}>
            <Link
              href={`/dossier/${d.id}`}
              className="border-border bg-background hover:bg-surface block rounded-xl border p-4"
            >
              <span className="font-display text-foreground block font-semibold">{d.title}</span>
              <span className="text-muted-foreground text-sm">{t('inCity', { city: d.city })}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
```

- [ ] **Étape 4 : écrire le nouvel accueil**

`apps/web/src/app/[locale]/page.tsx` :

```tsx
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { localizedPath } from '@/lib/auth/redirect-target';
import { getCurrentUser } from '@/lib/supabase/server';
import { buttonClasses } from '@/components/ui/Button';
import { listMyDossiers } from '@/modules/dossier/repo';
import { EntryDoors } from '@/modules/dossier/ui/EntryDoors';
import { MyDossiers } from '@/modules/dossier/ui/MyDossiers';

export const dynamic = 'force-dynamic';

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [t, user] = await Promise.all([getTranslations('doors'), getCurrentUser()]);
  const dossiers = user ? await listMyDossiers() : [];

  return (
    <div className="mx-auto w-full max-w-5xl space-y-12 px-4 py-10 sm:px-6 lg:py-16">
      {dossiers.length > 0 && <MyDossiers dossiers={dossiers} />}
      <EntryDoors />
      <section aria-labelledby="search-title" className="border-border space-y-4 border-t pt-8">
        <h2 id="search-title" className="font-display text-foreground text-xl font-semibold">
          {t('searchTitle')}
        </h2>
        <form
          action={localizedPath('/search', locale)}
          method="get"
          className="flex flex-wrap gap-3"
        >
          <label htmlFor="home-search" className="sr-only">
            {t('searchPlaceholder')}
          </label>
          <input
            id="home-search"
            name="q"
            type="search"
            placeholder={t('searchPlaceholder')}
            className="border-border bg-background text-foreground min-w-0 flex-1 rounded-full border px-4 py-2"
          />
          <button type="submit" className={buttonClasses({ variant: 'primary', size: 'md' })}>
            {t('searchSubmit')}
          </button>
        </form>
        <Link href="/memoriaux" className="text-primary text-sm font-semibold hover:underline">
          {t('browseMemorials')}
        </Link>
      </section>
    </div>
  );
}
```

- [ ] **Étape 5 : vérifier**

Run: `pnpm typecheck && pnpm lint && pnpm format:check`
Expected: 0 erreur. Puis `pnpm --filter @testimona/web dev`, ouvrir `http://localhost:3000` (trois
portes) et `http://localhost:3000/memoriaux` (ancien accueil).

- [ ] **Étape 6 : commiter**

```bash
git add -A "apps/web/src/app/[locale]/page.tsx" "apps/web/src/app/[locale]/(public)/memoriaux" apps/web/src/modules/dossier/ui apps/web/e2e/smoke.spec.ts
git commit -m "feat(home): replace the home page with the three entry doors"
```

---

### Tâche 9 : créer un dossier (`/dossier/nouveau`)

**Fichiers :**

- Créer : `apps/web/src/app/[locale]/(dossier)/dossier/nouveau/page.tsx`,
  `apps/web/src/modules/dossier/ui/NewDossierWizard.tsx`

- [ ] **Étape 1 : écrire l'assistant**

`apps/web/src/modules/dossier/ui/NewDossierWizard.tsx` :

```tsx
'use client';

import { useActionState, useState } from 'react';
import { useTranslations } from 'next-intl';
import { createDossierAction, type FormState } from '../actions';
import { RELATIONSHIPS } from '../schema';

interface Props {
  entryPoint: 'death' | 'prepare';
  countries: { code: string; label: string }[];
}

const STEPS = ['who', 'where', 'relationship'] as const;

export function NewDossierWizard({ entryPoint, countries }: Props) {
  const t = useTranslations('dossier');
  const [state, formAction, pending] = useActionState<FormState | null, FormData>(
    createDossierAction,
    null,
  );
  const [step, setStep] = useState(0);
  const [values, setValues] = useState({
    firstName: '',
    lastName: '',
    countryCode: countries[0]?.code ?? 'GA',
    city: '',
    relationship: '',
  });
  const [missing, setMissing] = useState(false);

  const set = (name: keyof typeof values) => (e: { target: { value: string } }) =>
    setValues((v) => ({ ...v, [name]: e.target.value }));

  const stepComplete = [
    values.firstName.trim() !== '' && values.lastName.trim() !== '',
    values.city.trim() !== '',
    values.relationship !== '',
  ];

  const next = () => {
    if (!stepComplete[step]) return setMissing(true);
    setMissing(false);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const input =
    'w-full rounded-xl border border-white/30 bg-white/10 px-4 py-3 text-white placeholder:text-white/50';

  return (
    <form
      action={formAction}
      className="bg-secondary text-secondary-foreground mx-auto flex min-h-[70dvh] max-w-xl flex-col gap-6 rounded-3xl p-6 sm:p-10"
    >
      <input type="hidden" name="entryPoint" value={entryPoint} />
      <p className="text-sm text-white/60">
        {step + 1} / {STEPS.length}
      </p>

      <fieldset hidden={step !== 0} className="space-y-4">
        <legend className="font-display text-2xl font-bold">{t('new.whoTitle')}</legend>
        <label className="block space-y-1">
          <span className="text-sm">{t('new.firstName')}</span>
          <input
            name="firstName"
            value={values.firstName}
            onChange={set('firstName')}
            className={input}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm">{t('new.lastName')}</span>
          <input
            name="lastName"
            value={values.lastName}
            onChange={set('lastName')}
            className={input}
          />
        </label>
      </fieldset>

      <fieldset hidden={step !== 1} className="space-y-4">
        <legend className="font-display text-2xl font-bold">{t('new.whereTitle')}</legend>
        <p className="text-sm text-white/70">{t('new.whereHint')}</p>
        <label className="block space-y-1">
          <span className="text-sm">{t('new.country')}</span>
          <select
            name="countryCode"
            value={values.countryCode}
            onChange={set('countryCode')}
            className={input}
          >
            {countries.map((c) => (
              <option key={c.code} value={c.code} className="text-foreground">
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1">
          <span className="text-sm">{t('new.city')}</span>
          <input name="city" value={values.city} onChange={set('city')} className={input} />
        </label>
      </fieldset>

      <fieldset hidden={step !== 2} className="space-y-3">
        <legend className="font-display text-2xl font-bold">{t('new.relationshipTitle')}</legend>
        {RELATIONSHIPS.map((r) => (
          <label
            key={r}
            className={`block cursor-pointer rounded-xl border px-4 py-3 ${
              values.relationship === r
                ? 'text-foreground border-white bg-white font-semibold'
                : 'border-white/30'
            }`}
          >
            <input
              type="radio"
              name="relationship"
              value={r}
              checked={values.relationship === r}
              onChange={set('relationship')}
              className="sr-only"
            />
            {t(`new.relationships.${r}`)}
          </label>
        ))}
      </fieldset>

      {(missing || state?.error) && (
        <p role="alert" className="text-accent-soft text-sm">
          {missing ? t('new.required') : t(`errors.${state!.error!}`)}
        </p>
      )}

      <div className="mt-auto flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setStep((s) => Math.max(s - 1, 0))}
          disabled={step === 0}
          className="text-sm text-white/70 disabled:invisible"
        >
          ← {t('new.back')}
        </button>
        {step < STEPS.length - 1 ? (
          <button
            type="button"
            onClick={next}
            className="bg-accent rounded-full px-6 py-3 font-semibold text-white"
          >
            {t('new.next')}
          </button>
        ) : (
          <button
            type="submit"
            disabled={pending || !stepComplete[2]}
            className="bg-accent rounded-full px-6 py-3 font-semibold text-white disabled:opacity-60"
          >
            {t('new.submit')}
          </button>
        )}
      </div>
    </form>
  );
}
```

- [ ] **Étape 2 : écrire la page**

`apps/web/src/app/[locale]/(dossier)/dossier/nouveau/page.tsx` :

```tsx
import { setRequestLocale } from 'next-intl/server';
import { COUNTRY_CODES, parseEntryPoint } from '@/modules/dossier/schema';
import { NewDossierWizard } from '@/modules/dossier/ui/NewDossierWizard';

export default async function NewDossierPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ porte?: string }>;
}) {
  const [{ locale }, { porte }] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);

  const names = new Intl.DisplayNames([locale], { type: 'region' });
  const countries = COUNTRY_CODES.map((code) => ({ code, label: names.of(code) ?? code }));

  return (
    <div className="px-4 py-8 sm:px-6 lg:py-12">
      <NewDossierWizard entryPoint={parseEntryPoint(porte)} countries={countries} />
    </div>
  );
}
```

- [ ] **Étape 3 : vérifier**

Run: `pnpm typecheck && pnpm lint && pnpm format:check`
Expected: 0 erreur. Puis, connecté en local, ouvrir `/dossier/nouveau?porte=deces`, remplir les trois
écrans : la soumission mène à `/dossier/<id>` (404 tant que la tâche 10 n'est pas faite).

- [ ] **Étape 4 : commiter**

```bash
git add "apps/web/src/app/[locale]/(dossier)/dossier/nouveau" apps/web/src/modules/dossier/ui/NewDossierWizard.tsx
git commit -m "feat(dossier): add the three-question creation wizard"
```

---

### Tâche 10 : tableau de bord minimal (`/dossier/[id]`)

**Fichiers :**

- Créer : `apps/web/src/app/[locale]/(dossier)/dossier/[id]/page.tsx`

- [ ] **Étape 1 : écrire la page**

```tsx
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { z } from 'zod';
import { Link } from '@/i18n/navigation';
import { buttonClasses } from '@/components/ui/Button';
import { getDossier, getPerson, listMembers } from '@/modules/dossier/repo';

const IdSchema = z.string().uuid();

export default async function DossierPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  if (!IdSchema.safeParse(id).success) notFound();

  const [t, dossier] = await Promise.all([getTranslations('dossier'), getDossier(id)]);
  if (!dossier) notFound();
  const [person, members] = await Promise.all([getPerson(id), listMembers(id)]);
  const country = new Intl.DisplayNames([locale], { type: 'region' }).of(dossier.countryCode);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-8 px-4 py-8 sm:px-6 lg:py-12">
      <header className="space-y-1">
        <h1 className="font-display text-foreground text-3xl font-bold tracking-tight">
          {person ? `${person.firstName} ${person.lastName}` : dossier.title}
        </h1>
        <p className="text-muted-foreground">
          {dossier.city}
          {country ? ` · ${country}` : ''}
        </p>
      </header>

      <section className="bg-secondary text-secondary-foreground rounded-2xl p-6">
        <h2 className="font-display text-lg font-semibold">{t('overview.journeyTitle')}</h2>
        <p className="mt-2 text-white/80">{t('overview.journeySoon')}</p>
      </section>

      <section className="border-border space-y-3 rounded-2xl border p-6">
        <h2 className="font-display text-foreground text-lg font-semibold">
          {t('overview.membersTitle')}
        </h2>
        <p className="text-muted-foreground">
          {t('overview.membersCount', { count: members.length })}
        </p>
        <Link
          href={`/dossier/${id}/membres`}
          className={buttonClasses({ variant: 'primary', size: 'md' })}
        >
          {t('overview.manageMembers')}
        </Link>
      </section>
    </div>
  );
}
```

- [ ] **Étape 2 : vérifier**

Run: `pnpm typecheck && pnpm lint && pnpm format:check`
Expected: 0 erreur. En local : après création, le tableau de bord affiche le nom, la ville, « 1 membre ».
Un autre compte (non membre) qui ouvre la même URL obtient une 404 (la RLS ne renvoie rien).

- [ ] **Étape 3 : commiter**

```bash
git add "apps/web/src/app/[locale]/(dossier)/dossier/[id]/page.tsx"
git commit -m "feat(dossier): add the minimal dossier dashboard"
```

---

### Tâche 11 : membres et invitations

**Fichiers :**

- Créer : `apps/web/src/app/[locale]/(dossier)/dossier/[id]/membres/page.tsx`,
  `apps/web/src/modules/dossier/ui/InviteForm.tsx`,
  `apps/web/src/app/[locale]/(dossier)/invitation/[token]/page.tsx`,
  `apps/web/src/modules/dossier/ui/AcceptInvitationForm.tsx`

- [ ] **Étape 1 : écrire le formulaire d'invitation**

`apps/web/src/modules/dossier/ui/InviteForm.tsx` :

```tsx
'use client';

import { useActionState, useState } from 'react';
import { useTranslations } from 'next-intl';
import { createInvitationAction, type InviteState } from '../actions';
import { INVITABLE_ROLES } from '../schema';

interface Props {
  dossierId: string;
  personName: string;
  emailEnabled: boolean;
}

export function InviteForm({ dossierId, personName, emailEnabled }: Props) {
  const t = useTranslations('dossier');
  const [state, formAction, pending] = useActionState<InviteState | null, FormData>(
    createInvitationAction,
    null,
  );
  const [copied, setCopied] = useState(false);

  const copy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const field = 'border-border bg-background text-foreground w-full rounded-xl border px-3 py-2';

  return (
    <div className="space-y-4">
      <form action={formAction} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <input type="hidden" name="dossierId" value={dossierId} />
        <label className="space-y-1">
          <span className="text-muted-foreground text-sm">{t('members.inviteRole')}</span>
          <select name="role" defaultValue="contributor" className={field}>
            {INVITABLE_ROLES.map((r) => (
              <option key={r} value={r}>
                {t(`members.roles.${r}`)}
              </option>
            ))}
          </select>
        </label>
        {emailEnabled ? (
          <label className="space-y-1">
            <span className="text-muted-foreground text-sm">{t('members.inviteEmail')}</span>
            <input name="email" type="email" className={field} />
          </label>
        ) : (
          <span aria-hidden="true" />
        )}
        <button
          type="submit"
          disabled={pending}
          className="bg-accent rounded-full px-5 py-2 font-semibold text-white disabled:opacity-60"
        >
          {t('members.inviteSubmit')}
        </button>
      </form>

      {state?.error && (
        <p role="alert" className="text-destructive text-sm">
          {t(`errors.${state.error}`)}
        </p>
      )}

      {state?.url && (
        <div className="bg-surface space-y-3 rounded-xl p-4">
          <p className="text-foreground text-sm">{t('members.inviteReady')}</p>
          {state.emailSent && (
            <p className="text-muted-foreground text-sm">{t('members.inviteEmailSent')}</p>
          )}
          <p className="text-foreground select-all break-all font-mono text-xs">{state.url}</p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => copy(state.url!)}
              className="border-border rounded-full border px-4 py-2 text-sm"
            >
              {copied ? t('members.copied') : t('members.copy')}
            </button>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(
                t('members.whatsappText', { name: personName, url: state.url }),
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-primary rounded-full px-4 py-2 text-sm font-semibold text-white"
            >
              {t('members.shareWhatsapp')}
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Étape 2 : écrire la page des membres**

`apps/web/src/app/[locale]/(dossier)/dossier/[id]/membres/page.tsx` :

```tsx
import { notFound } from 'next/navigation';
import { getFormatter, getTranslations, setRequestLocale } from 'next-intl/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/supabase/server';
import { revokeInvitationAction } from '@/modules/dossier/actions';
import { getDossier, getPerson, listInvitations, listMembers } from '@/modules/dossier/repo';
import { canManageMembers } from '@/modules/dossier/roles';
import { InviteForm } from '@/modules/dossier/ui/InviteForm';

const IdSchema = z.string().uuid();

export default async function MembersPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  if (!IdSchema.safeParse(id).success) notFound();

  const [t, format, user, dossier] = await Promise.all([
    getTranslations('dossier'),
    getFormatter(),
    getCurrentUser(),
    getDossier(id),
  ]);
  if (!dossier || !user) notFound();

  const [person, members] = await Promise.all([getPerson(id), listMembers(id)]);
  const myRole = members.find((m) => m.userId === user.id)?.role ?? null;
  const manager = canManageMembers(myRole);
  const invitations = manager ? (await listInvitations(id)).filter((i) => !i.usedAt) : [];
  const personName = person ? `${person.firstName} ${person.lastName}` : dossier.title;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8 px-4 py-8 sm:px-6 lg:py-12">
      <h1 className="font-display text-foreground text-3xl font-bold tracking-tight">
        {t('members.title')}
      </h1>

      <ul className="divide-border border-border divide-y rounded-2xl border">
        {members.map((m) => (
          <li key={m.userId} className="flex items-center justify-between gap-3 px-5 py-3">
            <span className="text-foreground">
              {m.displayName ?? '—'}
              {m.userId === user.id && (
                <span className="text-muted-foreground"> ({t('members.you')})</span>
              )}
            </span>
            <span className="text-muted-foreground text-sm">{t(`members.roles.${m.role}`)}</span>
          </li>
        ))}
      </ul>

      <section className="space-y-4">
        <h2 className="font-display text-foreground text-xl font-semibold">
          {t('members.inviteTitle')}
        </h2>
        {manager ? (
          <InviteForm
            dossierId={id}
            personName={personName}
            emailEnabled={Boolean(process.env.RESEND_API_KEY)}
          />
        ) : (
          <p className="text-muted-foreground">{t('members.readOnly')}</p>
        )}
      </section>

      {invitations.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-display text-foreground text-lg font-semibold">
            {t('members.pendingTitle')}
          </h2>
          <ul className="divide-border border-border divide-y rounded-2xl border">
            {invitations.map((inv) => (
              <li
                key={inv.id}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
              >
                <span className="text-foreground">
                  {t(`members.roles.${inv.role}`)}
                  {inv.email ? ` · ${inv.email}` : ''}
                  <span className="text-muted-foreground text-sm">
                    {' '}
                    ·{' '}
                    {t('members.expires', {
                      date: format.dateTime(new Date(inv.expiresAt), { dateStyle: 'medium' }),
                    })}
                  </span>
                </span>
                <form action={revokeInvitationAction}>
                  <input type="hidden" name="invitationId" value={inv.id} />
                  <button type="submit" className="text-destructive text-sm font-semibold">
                    {t('members.revoke')}
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
```

- [ ] **Étape 3 : écrire la page d'invitation**

`apps/web/src/modules/dossier/ui/AcceptInvitationForm.tsx` :

```tsx
'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { acceptInvitationAction, type FormState } from '../actions';

export function AcceptInvitationForm({ token }: { token: string }) {
  const t = useTranslations('dossier');
  const [state, formAction, pending] = useActionState<FormState | null, FormData>(
    acceptInvitationAction,
    null,
  );
  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      {state?.error && (
        <p role="alert" className="text-accent-soft">
          {t(`errors.${state.error}`)}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="bg-accent rounded-full px-6 py-3 font-semibold text-white disabled:opacity-60"
      >
        {t('invitation.accept')}
      </button>
    </form>
  );
}
```

`apps/web/src/app/[locale]/(dossier)/invitation/[token]/page.tsx` :

```tsx
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { AcceptInvitationForm } from '@/modules/dossier/ui/AcceptInvitationForm';

export default async function InvitationPage({
  params,
}: {
  params: Promise<{ locale: string; token: string }>;
}) {
  const { locale, token } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('dossier');

  // WHY: l'acceptation passe par un bouton, jamais au chargement de la page : un
  // aperçu de lien (WhatsApp, e-mail) ferait sinon consommer l'invitation.
  return (
    <div className="px-4 py-12 sm:px-6">
      <div className="bg-secondary text-secondary-foreground mx-auto max-w-lg space-y-4 rounded-3xl p-8">
        <h1 className="font-display text-2xl font-bold">{t('invitation.title')}</h1>
        <p className="text-white/80">{t('invitation.lead')}</p>
        <AcceptInvitationForm token={token} />
      </div>
    </div>
  );
}
```

- [ ] **Étape 4 : vérifier**

Run: `pnpm typecheck && pnpm lint && pnpm format:check && pnpm test`
Expected: 0 erreur, tous les tests verts. En local avec deux comptes : le propriétaire crée un lien
depuis `/dossier/<id>/membres`, le second compte ouvre le lien, clique « Rejoindre », arrive sur le
tableau de bord ; rouvrir le même lien affiche « Ce lien a déjà été utilisé ».

- [ ] **Étape 5 : commiter**

```bash
git add "apps/web/src/app/[locale]/(dossier)/dossier/[id]/membres" "apps/web/src/app/[locale]/(dossier)/invitation" apps/web/src/modules/dossier/ui/InviteForm.tsx apps/web/src/modules/dossier/ui/AcceptInvitationForm.tsx
git commit -m "feat(dossier): add members page and invitation links"
```

---

### Tâche 12 : vérification complète, production et PR

- [ ] **Étape 1 : vérification locale complète**

```bash
pnpm install --frozen-lockfile
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder_anon_key_long_enough NEXT_PUBLIC_SITE_URL=https://example.com pnpm build
```

Expected : tout vert ; `pnpm test` inclut les nouveaux tests SQL (tâches 1 et 2) et unitaires
(tâches 3 et 5).

- [ ] **Étape 2 : tests e2e**

Run: `pnpm --filter @testimona/web test:e2e -- e2e/smoke.spec.ts` (variables Supabase requises).
Expected: PASS, dont les trois tests de la tâche 8.

- [ ] **Étape 3 : appliquer les migrations en production (avec accord explicite)**

Avant la fusion, demander l'accord du propriétaire du projet, puis appliquer via le MCP Supabase
(`apply_migration`, projet `ryfbfpgwuqyfymxcxmny`) le contenu des deux fichiers, dans l'ordre :
`20261027000200_dossier_person_answers.sql`, puis `20261027000300_dossier_invitations.sql`. Vérifier
ensuite avec `get_advisors` (sécurité) qu'aucune nouvelle alerte n'apparaît, et noter les versions
enregistrées dans `supabase/README.md` (section « État de la production »).

WHY : le nouvel accueil appelle `listMyDossiers()` et l'assistant appelle
`create_dossier_with_person()`. Sans les tables, la liste est vide mais la création échoue ; les
migrations doivent donc être en place avant le déploiement.

- [ ] **Étape 4 : pousser et ouvrir la PR**

```bash
git push -u origin feature/lot1-pr1-dossier-membres
```

Description de PR (Contexte / Changements / Tests effectués / Risques), terminée par la ligne
d'attribution habituelle.

---

## PR 2 à 4 : esquisse

Chaque PR aura son propre plan détaillé, écrit à partir du code réellement en place après la PR
précédente.

**PR 2 — Moteur et biographie.** `apps/web/src/journey/` (`types.ts`, `define.ts`, `registry.ts`,
`progress.ts`, `ui/QuestionScreen.tsx` et composants de saisie), étape `steps/1-6-biography.ts`,
service `saveAnswer` (clé connue du registre, valeur validée, « passer » = `{ "skipped": true }`),
route `/dossier/[id]/etape/[stepId]`, carte « Prochaine question » et avancement sur le tableau de
bord, questions en lecture seule pour les lecteurs. Tests : schémas d'étapes, `progress.ts`,
`saveAnswer`, e2e « répondre à une question ». Aucune migration.

**PR 3 — Annoncer.** Étapes `2-1-broadcast-list.ts` (type `list`), `2-2-immediate-message.ts`,
`2-3-email-announcement.ts`, `journey/templates/` (brouillons FR/EN, tons croyant et neutre), route
`/dossier/[id]/etape/[stepId]/brouillon` (modifier, copier, partager sur WhatsApp), enregistrement
de `announce.whatsapp.text` et `announce.email.text`. Tests : modèles (données complètes et
manquantes), types de liste. Aucune migration.

**PR 4 — IA.** Migration `ai_usage` + `consume_ai_quota()` (tests PGlite du plafond), module
`src/modules/ai/` (`improveDraft`, fournisseur Claude via `@anthropic-ai/sdk`, modèle choisi après
lecture de la documentation à jour), bouton « Améliorer avec l'IA » masqué sans
`ANTHROPIC_API_KEY`, erreurs `unavailable` / `quota` / `failed`. Tests : `improveDraft` avec
fournisseur simulé, plafond SQL.
