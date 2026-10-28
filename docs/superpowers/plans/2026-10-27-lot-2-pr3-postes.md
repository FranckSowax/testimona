# Lot 2 · PR 3 — Postes du budget : plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** le trésorier crée les postes du budget à partir de l'estimation, les ajuste, choisit le scénario retenu et rattache chaque dépense à un poste ; le budget de référence devient le total du scénario retenu.

**Architecture:** une migration ajoute `dossier_finance.scenario` (écrit par une fonction `set_budget_scenario` réservée au trésorier), la table `budget_line`, la colonne `ledger_entry.budget_line_id` (contrôlée par le trigger du registre) et la fonction `ledger_spent_by_line`. Un module `apps/web/src/modules/budget/lines/` (schéma, modèle pur, dépôt, service, actions, écrans) alimente un onglet « Postes » (`/dossier/[id]/cotisations/postes`). Le formulaire de dépense propose un poste, et le budget de référence (cotisations, tableau de bord) passe du budget envisagé au budget retenu dès qu'un scénario est choisi.

**Tech Stack:** Supabase (Postgres 17, RLS, PGlite pour les tests SQL), Next.js 15 (Server Components, server actions), React 19, next-intl 3, Zod 3, Vitest (+ jsdom pour les composants).

Spec : `docs/superpowers/specs/2026-10-27-lot-2-financer-design.md` (§ 1 `dossier_finance.scenario`, `budget_line`, `ledger_entry.budget_line_id` ; § 2 onglet « Postes » ; § 4 livraison, PR 3).

---

## Décisions de ce plan (à valider dans la PR)

- **Noms des colonnes de montants :** `amount_sober`, `amount_intermediate`, `amount_full` au lieu de `sober`, `intermediate`, `full` de la spec : `full` est un mot réservé de Postgres (`FULL JOIN`) et devrait être cité partout. La spec est mise à jour.
- **Écriture du scénario :** la policy de mise à jour de `dossier_finance` reste au propriétaire (visibilité). Le scénario s'écrit par la fonction `set_budget_scenario(dossier, scénario)` (security definer), qui exige le rôle trésorier et ne touche que cette colonne. Choisir « aucun » remet le scénario à null.
- **Création des postes :** un bouton « Créer les postes » insère les 12 postes de la grille avec les montants de l'estimation (affluence de l'étape B.1). Le libellé est enregistré dans la langue de la personne qui crée les postes ; il est ensuite modifiable. Un double clic ne crée rien de plus (`on conflict do nothing` sur `(dossier_id, grid_key)`).
- **Recalcul :** « Recalculer selon l'affluence » met à jour les montants des postes de la grille que personne n'a modifiés (`edited = false`). Un poste supprimé n'est pas recréé, un poste libre n'est jamais recalculé.
- **Modification :** enregistrer un poste le marque `edited = true` ; il n'est plus recalculé.
- **Suppression :** un poste qui porte des dépenses ne peut pas être supprimé (`on delete restrict`, message dédié). Au plus 100 postes par dossier.
- **Dépenses par poste :** `ledger_spent_by_line` (security invoker) somme les dépenses actives par poste ; les dépenses sont visibles de tout membre, la RLS suffit.
- **Budget de référence :** total des postes pour le scénario retenu si un scénario est choisi et qu'il existe des postes ; sinon le budget envisagé (étape B.2) comme en PR 2. L'écran Cotisations et la carte du tableau de bord disent « Budget retenu » ou « Budget envisagé ».
- **Hors PR :** clôture (PR 5), reçus (PR 4), réordonner les postes (la position suit la grille, puis l'ordre d'ajout).

## Structure des fichiers

| Fichier                                                                        | Rôle                                                                                                            |
| ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| `supabase/migrations/20261027000700_budget_lines.sql`                          | `scenario`, `set_budget_scenario`, `budget_line`, `budget_line_id`, trigger du registre, `ledger_spent_by_line` |
| `supabase/tests/budget-lines.test.ts`                                          | Droits, scénario, postes, rattachement des dépenses, dépenses par poste                                         |
| `apps/web/src/modules/budget/gate.ts`                                          | Porte commune : dossier lisible ouvert au budget                                                                |
| `apps/web/src/modules/budget/lines/schema.ts`                                  | Zod : poste, scénario                                                                                           |
| `apps/web/src/modules/budget/lines/model.ts`                                   | Pur : lignes de la grille, recalcul, vues, budget de référence                                                  |
| `apps/web/src/modules/budget/lines/repo.ts`                                    | Seul accès base des postes et du scénario                                                                       |
| `apps/web/src/modules/budget/lines/service.ts`                                 | Règles, erreurs typées                                                                                          |
| `apps/web/src/modules/budget/lines/actions.ts`                                 | Server actions                                                                                                  |
| `apps/web/src/modules/budget/lines/ui/*.tsx`                                   | Onglets, scénario, tableau, formulaires                                                                         |
| `apps/web/src/app/[locale]/(dossier)/dossier/[id]/cotisations/postes/page.tsx` | Onglet « Postes »                                                                                               |
| `apps/web/src/modules/budget/ledger/*`                                         | `budgetLineId` sur les dépenses, choix du poste, budget de référence                                            |
| `apps/web/messages/{fr,en}.json`                                               | Espace `lines.*`, quelques clés `ledger.*`                                                                      |

Règles : accès base uniquement dans les `repo.ts` (client utilisateur, jamais service-role), 300 lignes au plus par fichier, `pnpm exec prettier --write <fichier>` sur chaque fichier modifié (un chemin par commande en zsh). Commits conventionnels en anglais terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Commentaires et JSDoc en français, `// WHY:` pour les choix. Couleurs : `text-foreground` pour le texte, `text-secondary font-semibold underline` pour les liens, `buttonClasses({ variant: 'secondary' })` pour les boutons, `text-destructive` pour les erreurs (`role="alert"`) et `bg-destructive text-destructive-foreground` pour une confirmation de suppression ; jamais `text-primary`, `text-muted-foreground` pour un texte à lire, ni `bg-accent`. Formulaires client : `onSubmit` + `startTransition(() => formAction(new FormData(form)))`, jamais `<form action>` (React 19 vide le formulaire même en erreur). Ne jamais utiliser `git checkout --`, `git restore`, `git reset --hard`, `git stash`.

---

### Tâche 1 : migration des postes

**Files:**

- Create: `supabase/migrations/20261027000700_budget_lines.sql`
- Create: `supabase/tests/budget-lines.test.ts`
- Modify: `supabase/README.md`

- [ ] **Étape 1 : écrire le test SQL (il échoue)**

`supabase/tests/budget-lines.test.ts` :

```ts
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

async function addLine(
  userId: string,
  fields: { gridKey?: string | null; label?: string; dossier?: string; sober?: number } = {},
) {
  const { rows } = await asUser(db, userId, () =>
    db.query<{ id: string }>(
      `insert into budget_line (dossier_id, grid_key, label, amount_sober, amount_intermediate, amount_full)
       values ($1, $2, $3, $4, 0, 0) returning id`,
      [
        fields.dossier ?? dossierId,
        fields.gridKey === undefined ? null : fields.gridKey,
        fields.label ?? 'Traiteur',
        fields.sober ?? 1000,
      ],
    ),
  );
  return rows[0]!.id;
}

async function addExpense(
  userId: string,
  fields: { line?: string | null; amount?: number; dossier?: string; kind?: string } = {},
) {
  const { rows } = await asUser(db, userId, () =>
    db.query<{ id: string }>(
      `insert into ledger_entry (dossier_id, kind, amount, method, party_name, member_id, budget_line_id, idempotency_key)
       values ($1, $2, $3, $4, 'Traiteur', $5, $6, $7) returning id`,
      [
        fields.dossier ?? dossierId,
        fields.kind ?? 'expense',
        fields.amount ?? 10_000,
        fields.kind === 'pledge' ? null : 'cash',
        fields.kind === 'pledge' ? userId : null,
        fields.line ?? null,
        randomUUID(),
      ],
    ),
  );
  return rows[0]!.id;
}

async function scenarioOf(dossier = dossierId) {
  const { rows } = await db.query<{ scenario: string | null }>(
    'select scenario from dossier_finance where dossier_id = $1',
    [dossier],
  );
  return rows[0]?.scenario ?? null;
}

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

describe('set_budget_scenario', () => {
  const setScenario = (userId: string, scenario: string | null, dossier = dossierId) =>
    asUser(db, userId, () =>
      db.query('select public.set_budget_scenario($1, $2)', [dossier, scenario]),
    );

  it('laisse le trésorier retenir puis effacer un scénario', async () => {
    await setScenario(treasurer, 'intermediate');
    expect(await scenarioOf()).toBe('intermediate');
    await setScenario(treasurer, null);
    expect(await scenarioOf()).toBeNull();
  });

  it('garde la visibilité choisie par le propriétaire', async () => {
    await asUser(db, owner, () =>
      db.query(
        `insert into dossier_finance (dossier_id, amounts_visibility) values ($1, 'members')
         on conflict (dossier_id) do update set amounts_visibility = excluded.amounts_visibility`,
        [dossierId],
      ),
    );
    await setScenario(treasurer, 'full');
    const { rows } = await db.query<{ amounts_visibility: string }>(
      'select amounts_visibility from dossier_finance where dossier_id = $1',
      [dossierId],
    );
    expect(rows[0]!.amounts_visibility).toBe('members');
  });

  it('refuse un contributeur, un non-membre et un scénario inconnu', async () => {
    await expect(setScenario(contributor, 'sober')).rejects.toMatchObject(DENIED);
    await expect(setScenario(stranger, 'sober')).rejects.toMatchObject(DENIED);
    await expect(setScenario(treasurer, 'luxe')).rejects.toMatchObject({ code: '23514' });
  });

  it('interdit au trésorier de modifier directement dossier_finance', async () => {
    const result = await asUser(db, treasurer, () =>
      db.query(`update dossier_finance set scenario = 'sober' where dossier_id = $1`, [dossierId]),
    );
    expect(result.affectedRows ?? 0).toBe(0);
  });
});

describe('budget_line : droits', () => {
  it('laisse tout membre lire les postes et le trésorier les écrire', async () => {
    const id = await addLine(treasurer, { label: 'Fleurs' });
    const read = await asUser(db, viewer, () =>
      db.query<{ label: string }>('select label from budget_line where id = $1', [id]),
    );
    expect(read.rows[0]?.label).toBe('Fleurs');
    await asUser(db, treasurer, () =>
      db.query(`update budget_line set label = 'Fleurs et couronnes' where id = $1`, [id]),
    );
    const none = await asUser(db, stranger, () =>
      db.query('select id from budget_line where id = $1', [id]),
    );
    expect(none.rows).toEqual([]);
  });

  it('refuse l’écriture à un contributeur', async () => {
    await expect(addLine(contributor)).rejects.toMatchObject(DENIED);
    const id = await addLine(treasurer);
    const updated = await asUser(db, contributor, () =>
      db.query(`update budget_line set label = 'x' where id = $1`, [id]),
    );
    expect(updated.affectedRows ?? 0).toBe(0);
    const deleted = await asUser(db, contributor, () =>
      db.query('delete from budget_line where id = $1', [id]),
    );
    expect(deleted.affectedRows ?? 0).toBe(0);
  });

  it('garde une clé de grille unique par dossier et fige dossier et clé', async () => {
    const id = await addLine(treasurer, { gridKey: 'coffin', label: 'Cercueil' });
    await expect(addLine(treasurer, { gridKey: 'coffin' })).rejects.toMatchObject({
      code: '23505',
    });
    await asUser(db, treasurer, () =>
      db.query(`update budget_line set grid_key = 'hearse', dossier_id = $2 where id = $1`, [
        id,
        otherDossierId,
      ]),
    );
    const { rows } = await db.query<{ grid_key: string; dossier_id: string }>(
      'select grid_key, dossier_id from budget_line where id = $1',
      [id],
    );
    expect(rows[0]).toEqual({ grid_key: 'coffin', dossier_id: dossierId });
  });

  it('refuse des montants ou un libellé hors bornes', async () => {
    await expect(addLine(treasurer, { sober: -1 })).rejects.toMatchObject({ code: '23514' });
    await expect(addLine(treasurer, { sober: 100_000_001 })).rejects.toMatchObject({
      code: '23514',
    });
    await expect(addLine(treasurer, { label: '' })).rejects.toMatchObject({ code: '23514' });
  });

  it('limite le nombre de postes par dossier', async () => {
    const fresh = await createDossier(owner);
    await addMember(treasurer, 'treasurer', fresh);
    await db.query(
      `insert into budget_line (dossier_id, label)
       select $1, 'Poste ' || n from generate_series(1, 100) as n`,
      [fresh],
    );
    await expect(addLine(treasurer, { dossier: fresh })).rejects.toMatchObject({ code: '23514' });
  });
});

describe('ledger_entry.budget_line_id', () => {
  it('rattache une dépense à un poste du même dossier', async () => {
    const line = await addLine(treasurer, { label: 'Corbillard' });
    const expense = await addExpense(treasurer, { line });
    const { rows } = await db.query<{ budget_line_id: string }>(
      'select budget_line_id from ledger_entry where id = $1',
      [expense],
    );
    expect(rows[0]!.budget_line_id).toBe(line);
  });

  it('refuse un poste d’un autre dossier ou un poste sur une promesse', async () => {
    await addMember(treasurer, 'treasurer', otherDossierId);
    const foreign = await addLine(treasurer, { dossier: otherDossierId });
    await expect(addExpense(treasurer, { line: foreign })).rejects.toMatchObject({
      code: 'TL004',
    });
    const line = await addLine(treasurer);
    await expect(addExpense(contributor, { line, kind: 'pledge' })).rejects.toMatchObject({
      code: '23514',
    });
  });

  it('ne recopie pas le poste sur une annulation', async () => {
    const line = await addLine(treasurer);
    const expense = await addExpense(treasurer, { line });
    const { rows } = await asUser(db, treasurer, () =>
      db.query<{ budget_line_id: string | null }>(
        `insert into ledger_entry (dossier_id, kind, amount, party_name, reverses_id, budget_line_id, idempotency_key)
         values ($1, 'reversal', 1, '-', $2, $3, $4) returning budget_line_id`,
        [dossierId, expense, line, randomUUID()],
      ),
    );
    expect(rows[0]!.budget_line_id).toBeNull();
  });

  it('empêche de supprimer un poste qui porte des dépenses', async () => {
    const line = await addLine(treasurer);
    await addExpense(treasurer, { line });
    await expect(
      asUser(db, treasurer, () => db.query('delete from budget_line where id = $1', [line])),
    ).rejects.toMatchObject({ code: '23503' });
    const free = await addLine(treasurer);
    await asUser(db, treasurer, () => db.query('delete from budget_line where id = $1', [free]));
  });
});

describe('ledger_spent_by_line', () => {
  it('somme les dépenses actives par poste, sans poste à part', async () => {
    const fresh = await createDossier(owner);
    await addMember(treasurer, 'treasurer', fresh);
    await addMember(viewer, 'viewer', fresh);
    const line = await addLine(treasurer, { dossier: fresh });
    await addExpense(treasurer, { dossier: fresh, line, amount: 30_000 });
    await addExpense(treasurer, { dossier: fresh, line, amount: 5_000 });
    await addExpense(treasurer, { dossier: fresh, amount: 2_000 });
    const cancelled = await addExpense(treasurer, { dossier: fresh, line, amount: 9_000 });
    await asUser(db, treasurer, () =>
      db.query(
        `insert into ledger_entry (dossier_id, kind, amount, party_name, reverses_id, idempotency_key)
         values ($1, 'reversal', 1, '-', $2, $3)`,
        [fresh, cancelled, randomUUID()],
      ),
    );
    const { rows } = await asUser(db, viewer, () =>
      db.query<{ budget_line_id: string | null; spent: string }>(
        'select * from public.ledger_spent_by_line($1) order by budget_line_id nulls last',
        [fresh],
      ),
    );
    expect(rows.map((r) => [r.budget_line_id, Number(r.spent)])).toEqual([
      [line, 35_000],
      [null, 2_000],
    ]);
  });

  it('ne renvoie rien à un non-membre', async () => {
    const { rows } = await asUser(db, stranger, () =>
      db.query('select * from public.ledger_spent_by_line($1)', [dossierId]),
    );
    expect(rows).toEqual([]);
  });
});
```

- [ ] **Étape 2 : lancer le test**

Run: `pnpm --filter @testimona/supabase test -- budget-lines`
Expected: FAIL (`function public.set_budget_scenario(...) does not exist`).

- [ ] **Étape 3 : écrire la migration**

`supabase/migrations/20261027000700_budget_lines.sql` :

```sql
-- ============================================================================
-- Lot 2 · PR 3 — postes du budget, scénario retenu, dépenses par poste.
--
-- WHY (choix assumés) :
--  - le scénario retenu s'écrit par set_budget_scenario (trésorier et plus) ; la
--    policy de mise à jour de dossier_finance reste au propriétaire (visibilité) ;
--  - montants nommés amount_sober / amount_intermediate / amount_full : « full »
--    est un mot réservé de Postgres ;
--  - un poste qui porte des dépenses ne se supprime pas (on delete restrict) ;
--  - les dépenses sont visibles de tout membre : ledger_spent_by_line est en
--    security invoker, la RLS du registre suffit.
-- ============================================================================

alter table public.dossier_finance
  add column scenario text check (scenario in ('sober', 'intermediate', 'full'));

-- WHY: security definer pour écrire la seule colonne scenario sans ouvrir au
-- trésorier la mise à jour de dossier_finance (visibilité réservée au propriétaire).
create function public.set_budget_scenario(p_dossier_id uuid, p_scenario text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if not public.is_dossier_member(p_dossier_id, 'treasurer') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if p_scenario is not null and p_scenario not in ('sober', 'intermediate', 'full') then
    raise exception 'invalid scenario' using errcode = '23514';
  end if;
  insert into public.dossier_finance (dossier_id, scenario)
  values (p_dossier_id, p_scenario)
  on conflict (dossier_id) do update set scenario = excluded.scenario;
end;
$$;

revoke execute on function public.set_budget_scenario(uuid, text) from public, anon;
grant execute on function public.set_budget_scenario(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- budget_line : les postes du budget du dossier
-- ---------------------------------------------------------------------------
create table public.budget_line (
  id uuid primary key default gen_random_uuid(),
  dossier_id uuid not null references public.dossier (id) on delete cascade,
  grid_key text check (grid_key ~ '^[a-zA-Z]{1,40}$'),
  label text not null check (char_length(label) between 1 and 120),
  amount_sober integer not null default 0 check (amount_sober between 0 and 100000000),
  amount_intermediate integer not null default 0
    check (amount_intermediate between 0 and 100000000),
  amount_full integer not null default 0 check (amount_full between 0 and 100000000),
  edited boolean not null default false,
  position integer not null default 0 check (position between 0 and 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (dossier_id, grid_key)
);

create index budget_line_dossier_idx on public.budget_line (dossier_id, position);

-- WHY: au plus 100 postes par dossier, pour borner un écran et une saisie abusive.
create function public.budget_line_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.budget_line l where l.dossier_id = new.dossier_id) >= 100 then
    raise exception 'too many budget lines' using errcode = '23514';
  end if;
  new.created_at := now();
  new.updated_at := now();
  return new;
end;
$$;

create trigger budget_line_before_insert
  before insert on public.budget_line
  for each row execute function public.budget_line_before_insert();

-- WHY: le dossier, la clé de grille et la date de création ne changent jamais.
create function public.budget_line_before_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.dossier_id := old.dossier_id;
  new.grid_key := old.grid_key;
  new.created_at := old.created_at;
  new.updated_at := now();
  return new;
end;
$$;

create trigger budget_line_before_update
  before update on public.budget_line
  for each row execute function public.budget_line_before_update();

revoke execute on function public.budget_line_before_insert() from public, anon, authenticated;
revoke execute on function public.budget_line_before_update() from public, anon, authenticated;

alter table public.budget_line enable row level security;
revoke all on public.budget_line from anon;
revoke truncate, trigger, references on public.budget_line from authenticated;

create policy budget_line_select on public.budget_line
  for select to authenticated
  using (public.is_dossier_member(dossier_id));

create policy budget_line_insert on public.budget_line
  for insert to authenticated
  with check (public.is_dossier_member(dossier_id, 'treasurer'));

create policy budget_line_update on public.budget_line
  for update to authenticated
  using (public.is_dossier_member(dossier_id, 'treasurer'))
  with check (public.is_dossier_member(dossier_id, 'treasurer'));

create policy budget_line_delete on public.budget_line
  for delete to authenticated
  using (public.is_dossier_member(dossier_id, 'treasurer'));

-- ---------------------------------------------------------------------------
-- ledger_entry.budget_line_id : poste d'une dépense
-- ---------------------------------------------------------------------------
alter table public.ledger_entry
  add column budget_line_id uuid references public.budget_line (id) on delete restrict,
  add constraint ledger_entry_budget_line_expense
    check (budget_line_id is null or kind = 'expense');

create index ledger_entry_budget_line_idx on public.ledger_entry (budget_line_id);
```

Puis, dans le même fichier, remplacer la fonction du trigger du registre. Partir du texte exact de `public.ledger_entry_before_insert()` dans `supabase/migrations/20261027000600_ledger.sql` (le copier tel quel avec `create or replace function`) et y faire **seulement** ces deux ajouts :

1. dans la branche `if new.kind = 'reversal' then`, juste après `new.pledge_id := null;` :

```sql
    new.budget_line_id := null;
```

2. juste après la ligne `new.reverses_kind := null;` (hors de la branche des annulations) :

```sql
  -- WHY: le poste d'une dépense doit appartenir au même dossier.
  if new.budget_line_id is not null and not exists (
    select 1 from public.budget_line l
     where l.id = new.budget_line_id and l.dossier_id = new.dossier_id
  ) then
    raise exception 'invalid budget line' using errcode = 'TL004';
  end if;
```

Le trigger existe déjà et pointe sur la fonction : `create or replace` suffit. Après la fonction, rétablir les droits :

```sql
revoke execute on function public.ledger_entry_before_insert() from public, anon, authenticated;
```

Enfin, à la fin du fichier :

```sql
-- ---------------------------------------------------------------------------
-- Dépenses actives par poste (null : dépenses sans poste).
-- ---------------------------------------------------------------------------
create function public.ledger_spent_by_line(p_dossier_id uuid)
returns table (budget_line_id uuid, spent bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select e.budget_line_id, sum(e.amount)::bigint
    from public.ledger_entry e
   where e.dossier_id = p_dossier_id
     and e.kind = 'expense'
     and not exists (select 1 from public.ledger_entry r where r.reverses_id = e.id)
   group by e.budget_line_id;
$$;

revoke execute on function public.ledger_spent_by_line(uuid) from public, anon;
grant execute on function public.ledger_spent_by_line(uuid) to authenticated;
```

- [ ] **Étape 4 : relancer toute la suite SQL**

Run: `pnpm --filter @testimona/supabase test`
Expected: PASS, y compris `ledger.test.ts` (le trigger remplacé garde son comportement) et `migrations.test.ts` (RLS partout). Si PGlite se comporte autrement qu'attendu, corriger au plus juste et l'expliquer ; ne jamais affaiblir une règle de droits.

- [ ] **Étape 5 : documenter**

Dans `supabase/README.md`, ajouter au tableau des migrations la ligne `| \`20261027000700_budget_lines.sql\` | Lot 2 : postes du budget, scénario retenu, dépenses par poste |`et, sous « État de la production », un bloc « **Pas encore en production :** » avec : «`budget_lines`(lot 2, PR 3) : à appliquer avant de déployer le web de la PR. Après application,`get_advisors`signalera`set_budget_scenario`comme security definer exécutable par`authenticated`(0029), c'est voulu. » ; remplacer « Toutes les migrations du dépôt sont donc en production. » par « Toutes les migrations du dépôt jusqu'à`ledger` sont donc en production. ».

- [ ] **Étape 6 : commit**

```bash
git add supabase/migrations/20261027000700_budget_lines.sql supabase/tests/budget-lines.test.ts supabase/README.md
git commit -m "feat(db): add budget lines, the retained scenario and spending per line"
```

---

### Tâche 2 : porte commune, schéma et modèle des postes

**Files:**

- Create: `apps/web/src/modules/budget/gate.ts`
- Modify: `apps/web/src/modules/budget/ledger/service.ts` (utiliser la porte commune)
- Create: `apps/web/src/modules/budget/lines/schema.ts`, `schema.test.ts`, `model.ts`, `model.test.ts`

- [ ] **Étape 1 : porte commune**

`apps/web/src/modules/budget/gate.ts` :

```ts
import 'server-only';
import { isStepOpen } from '@/journey/registry';
import { getDossier } from '@/modules/dossier/repo';

/**
 * Le registre et les postes n'existent que pour un dossier lisible ouvert au budget (porte
 * « décès »). Renvoie 'not_found' sinon.
 * WHY: un dossier sans étape budget n'a pas de budget : on le traite comme absent.
 *
 * @example
 * if (await budgetGate(dossierId)) return { ok: false, error: 'not_found' };
 */
export async function budgetGate(dossierId: string): Promise<'not_found' | null> {
  const dossier = await getDossier(dossierId);
  if (!dossier || !isStepOpen(dossier.entryPoint, 'attendance')) return 'not_found';
  return null;
}
```

Dans `apps/web/src/modules/budget/ledger/service.ts`, supprimer la fonction privée `checkDossier` et les imports de `isStepOpen` et `getDossier`, importer `import { budgetGate } from '../gate';` et remplacer chaque `await checkDossier(` par `await budgetGate(`. Le test `ledger/service.test.ts` mocke `@/modules/dossier/repo` : il reste valable (la porte appelle toujours `getDossier`).

Run: `pnpm --filter @testimona/web test -- src/modules/budget/ledger`
Expected: PASS.

- [ ] **Étape 2 : écrire les tests (ils échouent)**

`apps/web/src/modules/budget/lines/schema.test.ts` :

```ts
import { describe, expect, it } from 'vitest';
import { LineSchema, NewLineSchema, ScenarioSchema } from './schema';

const DOSSIER = '44444444-4444-4444-8444-444444444444';
const LINE = '55555555-5555-4555-8555-555555555555';
const base = {
  dossierId: DOSSIER,
  label: '  Traiteur ',
  sober: '200 000',
  intermediate: '0',
  full: '1 000 000',
};

describe('schémas des postes', () => {
  it('nettoie le libellé et lit des montants avec espaces, zéro compris', () => {
    expect(NewLineSchema.parse(base)).toEqual({
      dossierId: DOSSIER,
      label: 'Traiteur',
      sober: 200_000,
      intermediate: 0,
      full: 1_000_000,
    });
  });

  it('refuse un montant négatif, trop grand ou mal formé', () => {
    const issue = (sober: string) =>
      NewLineSchema.safeParse({ ...base, sober }).error?.issues[0]?.message;
    expect(issue('-1')).toBe('invalid number');
    expect(issue('100000001')).toBe('out of range');
    expect(issue('9'.repeat(400))).toBe('out of range');
    expect(issue('12,5')).toBe('invalid number');
    expect(issue('')).toBe('invalid number');
  });

  it('refuse un libellé vide, trop long ou avec un caractère NUL', () => {
    const issue = (label: string) =>
      NewLineSchema.safeParse({ ...base, label }).error?.issues[0]?.message;
    expect(issue('  ')).toBe('required');
    expect(issue('a'.repeat(121))).toBe('too long');
    expect(issue('a\u0000b')).toBe('invalid character');
    expect(NewLineSchema.safeParse({ ...base, label: '🌺'.repeat(120) }).success).toBe(true);
  });

  it('exige l’identifiant du poste pour une modification', () => {
    expect(LineSchema.safeParse(base).success).toBe(false);
    expect(LineSchema.parse({ ...base, lineId: LINE }).lineId).toBe(LINE);
  });

  it('accepte un scénario connu ou aucun', () => {
    expect(ScenarioSchema.parse({ dossierId: DOSSIER, scenario: 'full' }).scenario).toBe('full');
    expect(ScenarioSchema.parse({ dossierId: DOSSIER, scenario: '' }).scenario).toBeNull();
    expect(ScenarioSchema.safeParse({ dossierId: DOSSIER, scenario: 'luxe' }).success).toBe(false);
  });
});
```

`apps/web/src/modules/budget/lines/model.test.ts` :

```ts
import { describe, expect, it } from 'vitest';
import { scenariosFor, attendanceFrom } from '../scenarios';
import {
  gridRows,
  lineViews,
  recomputeRows,
  referenceBudget,
  scenarioTotals,
  type BudgetLine,
} from './model';

const answers = {
  'attendance.close': 40,
  'attendance.extended': 60,
  'attendance.friends': 30,
  'attendance.community': 20,
  'attendance.nights': 2,
  'budget.level': 'sober',
};

const line = (over: Partial<BudgetLine>): BudgetLine => ({
  id: 'l1',
  gridKey: null,
  label: 'Traiteur',
  amounts: { sober: 100, intermediate: 200, full: 300 },
  edited: false,
  position: 0,
  ...over,
});

describe('gridRows', () => {
  it('donne un poste par entrée de la grille avec les montants de l’estimation', () => {
    const rows = gridRows(answers, (key) => `label:${key}`);
    const expected = scenariosFor(attendanceFrom(answers)).lines;
    expect(rows).toHaveLength(expected.length);
    expect(rows[0]).toEqual({
      gridKey: expected[0]!.key,
      label: `label:${expected[0]!.key}`,
      amounts: expected[0]!.amounts,
      position: 0,
    });
    expect(rows.map((r) => r.position)).toEqual(expected.map((_, i) => i));
  });
});

describe('recomputeRows', () => {
  it('ne recalcule que les postes de la grille non modifiés', () => {
    const fresh = scenariosFor(attendanceFrom(answers)).lines;
    const rows = recomputeRows(
      [
        line({ id: 'a', gridKey: fresh[0]!.key, position: 0 }),
        line({ id: 'b', gridKey: fresh[1]!.key, edited: true }),
        line({ id: 'c', gridKey: null }),
        line({ id: 'd', gridKey: 'removedFromGrid' }),
      ],
      answers,
    );
    expect(rows).toEqual([{ id: 'a', amounts: fresh[0]!.amounts }]);
  });
});

describe('lineViews et scenarioTotals', () => {
  it('ajoute les dépenses par poste et trie par position', () => {
    const views = lineViews(
      [line({ id: 'b', position: 2 }), line({ id: 'a', position: 1 })],
      new Map([['a', 5_000]]),
    );
    expect(views.map((v) => [v.id, v.spent])).toEqual([
      ['a', 5_000],
      ['b', 0],
    ]);
  });

  it('additionne les postes pour chaque scénario', () => {
    expect(scenarioTotals([line({}), line({ id: 'l2' })])).toEqual({
      sober: 200,
      intermediate: 400,
      full: 600,
    });
  });
});

describe('referenceBudget', () => {
  it('prend le total du scénario retenu quand il existe des postes', () => {
    expect(referenceBudget('full', [line({})], answers)).toEqual({
      amount: 300,
      source: 'retained',
    });
  });

  it('revient au budget envisagé sans scénario ou sans poste', () => {
    const envisaged = scenariosFor(attendanceFrom(answers)).totals.sober;
    expect(referenceBudget(null, [line({})], answers)).toEqual({
      amount: envisaged,
      source: 'envisaged',
    });
    expect(referenceBudget('full', [], answers)?.source).toBe('envisaged');
    expect(referenceBudget(null, [], { ...answers, 'budget.level': undefined })).toBeNull();
  });
});
```

Run: `pnpm --filter @testimona/web test -- src/modules/budget/lines`
Expected: FAIL (modules absents).

- [ ] **Étape 3 : schéma**

`apps/web/src/modules/budget/lines/schema.ts` :

```ts
import { z } from 'zod';
import { LEVELS } from '@/journey/options';
import { AMOUNT_MAX } from '../scenarios';

const uuid = z.string().uuid();
// WHY: text refuse le caractère NUL ; on le refuse avant la base.
const noNul = (s: string) => !s.includes('\u0000');
// WHY: compter en caractères comme char_length en base, pas en unités UTF-16.
const maxChars = (n: number) => (s: string) => [...s].length <= n;

// WHY: un montant de poste peut valoir zéro (poste non retenu à ce niveau).
const levelAmount = z
  .string()
  .transform((s) => s.replace(/[\s  ]/g, ''))
  .pipe(z.string().regex(/^\d+$/, 'invalid number'))
  .transform(Number)
  .pipe(
    z
      .number()
      .min(0, 'out of range')
      .max(AMOUNT_MAX, 'out of range')
      .refine(Number.isSafeInteger, 'out of range'),
  );

const label = z
  .string()
  .trim()
  .min(1, 'required')
  .refine(maxChars(120), 'too long')
  .refine(noNul, 'invalid character');

/** Nouveau poste libre : libellé et montant par niveau. */
export const NewLineSchema = z.object({
  dossierId: uuid,
  label,
  sober: levelAmount,
  intermediate: levelAmount,
  full: levelAmount,
});

/** Modification d'un poste existant. */
export const LineSchema = NewLineSchema.extend({ lineId: uuid });

/** Désignation d'un poste (suppression). */
export const LineRefSchema = z.object({ dossierId: uuid, lineId: uuid });

/** Désignation d'un dossier (création et recalcul des postes). */
export const DossierRefSchema = z.object({ dossierId: uuid });

/** Scénario retenu ; une chaîne vide efface le choix. */
export const ScenarioSchema = z.object({
  dossierId: uuid,
  scenario: z.union([z.enum(LEVELS), z.literal('')]).transform((v) => (v === '' ? null : v)),
});
```

- [ ] **Étape 4 : modèle**

`apps/web/src/modules/budget/lines/model.ts` :

```ts
import { LEVELS, type Level } from '@/journey/options';
import type { Answers } from '@/journey/progress';
import { attendanceFrom, envisagedTotal, scenariosFor } from '../scenarios';

/** Poste du budget tel que lu en base. */
export interface BudgetLine {
  id: string;
  gridKey: string | null;
  label: string;
  amounts: Readonly<Record<Level, number>>;
  edited: boolean;
  position: number;
}

/** Poste prêt à afficher, avec les dépenses actives qui lui sont rattachées. */
export interface LineView extends BudgetLine {
  spent: number;
}

/** Poste de la grille à créer. */
export interface GridRow {
  gridKey: string;
  label: string;
  amounts: Record<Level, number>;
  position: number;
}

/** Nouveaux montants d'un poste de la grille recalculé. */
export interface RecomputedRow {
  id: string;
  amounts: Record<Level, number>;
}

export type BudgetSource = 'retained' | 'envisaged';

/** Budget de référence de la famille et sa provenance. */
export interface ReferenceBudget {
  amount: number;
  source: BudgetSource;
}

/**
 * Postes de la grille avec les montants de l'estimation (affluence de l'étape B.1).
 *
 * @example
 * gridRows(answers, (key) => t(key)); // [{ gridKey: 'mortuary', label: 'Morgue…', … }]
 */
export function gridRows(answers: Answers, labelOf: (gridKey: string) => string): GridRow[] {
  return scenariosFor(attendanceFrom(answers)).lines.map((line, position) => ({
    gridKey: line.key,
    label: labelOf(line.key),
    amounts: { ...line.amounts },
    position,
  }));
}

/**
 * Montants à jour des postes de la grille que personne n'a modifiés.
 * WHY: un poste modifié à la main ou libre garde ses montants ; un poste dont la clé a quitté la
 * grille n'est pas touché.
 */
export function recomputeRows(lines: readonly BudgetLine[], answers: Answers): RecomputedRow[] {
  const fresh = new Map(
    scenariosFor(attendanceFrom(answers)).lines.map((line) => [line.key, line.amounts]),
  );
  return lines.flatMap((line) => {
    const amounts = !line.edited && line.gridKey ? fresh.get(line.gridKey) : undefined;
    return amounts ? [{ id: line.id, amounts: { ...amounts } }] : [];
  });
}

/** Postes triés par position, avec leurs dépenses (0 si aucune). */
export function lineViews(
  lines: readonly BudgetLine[],
  spentByLine: ReadonlyMap<string, number>,
): LineView[] {
  return [...lines]
    .sort((a, b) => a.position - b.position || a.label.localeCompare(b.label))
    .map((line) => ({ ...line, spent: spentByLine.get(line.id) ?? 0 }));
}

/** Total des postes pour chaque scénario. */
export function scenarioTotals(lines: readonly BudgetLine[]): Record<Level, number> {
  const totals: Record<Level, number> = { sober: 0, intermediate: 0, full: 0 };
  for (const line of lines) for (const level of LEVELS) totals[level] += line.amounts[level];
  return totals;
}

/**
 * Budget de référence : total des postes du scénario retenu, sinon budget envisagé à l'étape B.2,
 * sinon null.
 *
 * @example
 * referenceBudget('intermediate', lines, answers); // { amount: 3_100_000, source: 'retained' }
 */
export function referenceBudget(
  scenario: Level | null,
  lines: readonly BudgetLine[],
  answers: Answers,
): ReferenceBudget | null {
  if (scenario && lines.length > 0) {
    return { amount: scenarioTotals(lines)[scenario], source: 'retained' };
  }
  const envisaged = envisagedTotal(answers);
  return envisaged === null ? null : { amount: envisaged, source: 'envisaged' };
}
```

- [ ] **Étape 5 : relancer et commit**

Run: `pnpm --filter @testimona/web test -- src/modules/budget && pnpm --filter @testimona/web typecheck`
Expected: PASS.

```bash
git add apps/web/src/modules/budget/gate.ts apps/web/src/modules/budget/ledger/service.ts apps/web/src/modules/budget/lines
git commit -m "feat(budget): add the budget lines schema and model"
```

---

### Tâche 3 : dépôt, service et actions des postes

**Files:**

- Create: `apps/web/src/modules/budget/lines/repo.ts`, `repo.test.ts`, `service.ts`, `service.test.ts`, `actions.ts`, `actions.test.ts`

- [ ] **Étape 1 : écrire le test du service (il échoue)**

`apps/web/src/modules/budget/lines/service.test.ts` :

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { repo, gate, answersRepo } = vi.hoisted(() => ({
  repo: {
    listLines: vi.fn(),
    insertGridRows: vi.fn(),
    updateRecomputed: vi.fn(),
    insertLine: vi.fn(),
    updateLine: vi.fn(),
    deleteLine: vi.fn(),
    setScenario: vi.fn(),
  },
  gate: { budgetGate: vi.fn() },
  answersRepo: { listAnswersResult: vi.fn() },
}));

vi.mock('server-only', () => ({}));
vi.mock('./repo', () => repo);
vi.mock('../gate', () => gate);
vi.mock('@/modules/dossier/answers/repo', () => answersRepo);
vi.mock('next-intl/server', () => ({
  getTranslations: vi.fn(async () => (key: string) => `label:${key}`),
}));

const { addLine, chooseScenario, createGridLines, deleteLine, recomputeLines, saveLine } =
  await import('./service');

const DOSSIER = '44444444-4444-4444-8444-444444444444';
const LINE = '55555555-5555-4555-8555-555555555555';
const answers = { 'attendance.close': 10, 'attendance.nights': 1 };
const amounts = { sober: '1000', intermediate: '2000', full: '3000' };

beforeEach(() => {
  vi.clearAllMocks();
  gate.budgetGate.mockResolvedValue(null);
  answersRepo.listAnswersResult.mockResolvedValue({ data: answers, error: null });
  repo.listLines.mockResolvedValue({ data: [], error: null });
  for (const fn of [
    repo.insertGridRows,
    repo.updateRecomputed,
    repo.insertLine,
    repo.updateLine,
    repo.deleteLine,
    repo.setScenario,
  ]) {
    fn.mockResolvedValue({ data: true, error: null });
  }
});

describe('createGridLines', () => {
  it('crée les postes de la grille avec les libellés de la langue', async () => {
    expect(await createGridLines({ dossierId: DOSSIER }, 'fr')).toEqual({ ok: true, data: true });
    const [dossierId, rows] = repo.insertGridRows.mock.calls[0]!;
    expect(dossierId).toBe(DOSSIER);
    expect(rows[0]).toMatchObject({ gridKey: 'mortuary', label: 'label:mortuary', position: 0 });
  });

  it('refuse un dossier hors budget et une lecture des réponses en échec', async () => {
    gate.budgetGate.mockResolvedValueOnce('not_found');
    expect(await createGridLines({ dossierId: DOSSIER }, 'fr')).toMatchObject({
      error: 'not_found',
    });
    answersRepo.listAnswersResult.mockResolvedValueOnce({ data: {}, error: { code: 'x' } });
    expect(await createGridLines({ dossierId: DOSSIER }, 'fr')).toMatchObject({
      error: 'unknown',
    });
    expect(repo.insertGridRows).not.toHaveBeenCalled();
  });
});

describe('recomputeLines', () => {
  it('ne met à jour que les postes non modifiés de la grille', async () => {
    repo.listLines.mockResolvedValueOnce({
      data: [
        {
          id: 'a',
          gridKey: 'coffin',
          label: 'Cercueil',
          amounts: { sober: 1, intermediate: 1, full: 1 },
          edited: false,
          position: 1,
        },
        {
          id: 'b',
          gridKey: 'hearse',
          label: 'Corbillard',
          amounts: { sober: 1, intermediate: 1, full: 1 },
          edited: true,
          position: 2,
        },
      ],
      error: null,
    });
    await recomputeLines({ dossierId: DOSSIER });
    const [, rows] = repo.updateRecomputed.mock.calls[0]!;
    expect(rows.map((r: { id: string }) => r.id)).toEqual(['a']);
  });
});

describe('saveLine, addLine, deleteLine', () => {
  it('enregistre un poste modifié', async () => {
    await saveLine({ dossierId: DOSSIER, lineId: LINE, label: 'Cercueil', ...amounts });
    expect(repo.updateLine).toHaveBeenCalledWith(DOSSIER, LINE, {
      label: 'Cercueil',
      amounts: { sober: 1000, intermediate: 2000, full: 3000 },
    });
  });

  it('renvoie les erreurs de champ sans écrire', async () => {
    const res = await addLine({ dossierId: DOSSIER, label: '', ...amounts });
    expect(res).toMatchObject({
      ok: false,
      error: 'validation',
      fieldErrors: { label: 'required' },
    });
    expect(repo.insertLine).not.toHaveBeenCalled();
  });

  it('ajoute un poste libre après le dernier', async () => {
    repo.listLines.mockResolvedValueOnce({
      data: [
        {
          id: 'a',
          gridKey: null,
          label: 'A',
          amounts: { sober: 0, intermediate: 0, full: 0 },
          edited: true,
          position: 7,
        },
      ],
      error: null,
    });
    await addLine({ dossierId: DOSSIER, label: 'Fleurs', ...amounts });
    expect(repo.insertLine).toHaveBeenCalledWith(DOSSIER, {
      label: 'Fleurs',
      amounts: { sober: 1000, intermediate: 2000, full: 3000 },
      position: 8,
    });
  });

  it('traduit un poste qui porte des dépenses et un poste introuvable', async () => {
    repo.deleteLine.mockResolvedValueOnce({ data: null, error: { code: '23503', message: 'x' } });
    expect(await deleteLine({ dossierId: DOSSIER, lineId: LINE })).toMatchObject({
      error: 'line_in_use',
    });
    repo.updateLine.mockResolvedValueOnce({ data: null, error: { code: 'no_rows', message: 'x' } });
    expect(
      await saveLine({ dossierId: DOSSIER, lineId: LINE, label: 'X', ...amounts }),
    ).toMatchObject({ error: 'not_found' });
    repo.insertLine.mockResolvedValueOnce({ data: null, error: { code: '42501', message: 'x' } });
    expect(await addLine({ dossierId: DOSSIER, label: 'X', ...amounts })).toMatchObject({
      error: 'forbidden',
    });
  });
});

describe('chooseScenario', () => {
  it('retient un scénario ou l’efface', async () => {
    await chooseScenario({ dossierId: DOSSIER, scenario: 'intermediate' });
    expect(repo.setScenario).toHaveBeenLastCalledWith(DOSSIER, 'intermediate');
    await chooseScenario({ dossierId: DOSSIER, scenario: '' });
    expect(repo.setScenario).toHaveBeenLastCalledWith(DOSSIER, null);
  });
});
```

Run: `pnpm --filter @testimona/web test -- src/modules/budget/lines/service.test.ts`
Expected: FAIL.

- [ ] **Étape 2 : dépôt**

`apps/web/src/modules/budget/lines/repo.ts` :

```ts
import 'server-only';
import type { Level } from '@/journey/options';
import { LEVELS } from '@/journey/options';
import { getSupabaseServer } from '@/lib/supabase/server';
import type { RepoResult } from '@/modules/dossier/repo';
import type { BudgetLine, GridRow, RecomputedRow } from './model';

const COLUMNS =
  'id, grid_key, label, amount_sober, amount_intermediate, amount_full, edited, position';

interface LineRow {
  id: string;
  grid_key: string | null;
  label: string;
  amount_sober: number;
  amount_intermediate: number;
  amount_full: number;
  edited: boolean;
  position: number;
}

const toLine = (r: LineRow): BudgetLine => ({
  id: r.id,
  gridKey: r.grid_key,
  label: r.label,
  amounts: { sober: r.amount_sober, intermediate: r.amount_intermediate, full: r.amount_full },
  edited: r.edited,
  position: r.position,
});

const amountColumns = (amounts: Readonly<Record<Level, number>>) => ({
  amount_sober: amounts.sober,
  amount_intermediate: amounts.intermediate,
  amount_full: amounts.full,
});

function fail(error: { code?: string; message?: string }) {
  return {
    data: null,
    error: { code: error.code || 'unknown', message: error.message || 'budget lines error' },
  };
}

const NO_ROWS = { data: null, error: { code: 'no_rows', message: 'no row matched' } };

/** Postes du dossier (tout membre, RLS). */
export async function listLines(dossierId: string): Promise<RepoResult<BudgetLine[]>> {
  const db = await getSupabaseServer();
  const { data, error } = await db
    .from('budget_line')
    .select(COLUMNS)
    .eq('dossier_id', dossierId)
    .order('position')
    .returns<LineRow[]>();
  if (error) {
    console.error('[budget/lines] listLines impossible', { code: error.code });
    return fail(error);
  }
  return { data: (data ?? []).map(toLine), error: null };
}

/**
 * Crée les postes de la grille ; un poste déjà présent (même clé) est laissé tel quel.
 * WHY: un double clic sur « Créer les postes » ne crée rien de plus.
 */
export async function insertGridRows(
  dossierId: string,
  rows: readonly GridRow[],
): Promise<RepoResult<true>> {
  const db = await getSupabaseServer();
  const { error } = await db.from('budget_line').upsert(
    rows.map((row) => ({
      dossier_id: dossierId,
      grid_key: row.gridKey,
      label: row.label,
      position: row.position,
      ...amountColumns(row.amounts),
    })),
    { onConflict: 'dossier_id,grid_key', ignoreDuplicates: true },
  );
  if (error) return fail(error);
  return { data: true, error: null };
}

/**
 * Met à jour les montants des postes recalculés, seulement s'ils sont toujours non modifiés.
 * WHY: le filtre `edited = false` évite d'écraser un poste modifié entre la lecture et l'écriture.
 */
export async function updateRecomputed(
  dossierId: string,
  rows: readonly RecomputedRow[],
): Promise<RepoResult<true>> {
  const db = await getSupabaseServer();
  const results = await Promise.all(
    rows.map((row) =>
      db
        .from('budget_line')
        .update(amountColumns(row.amounts))
        .eq('dossier_id', dossierId)
        .eq('id', row.id)
        .eq('edited', false),
    ),
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) return fail(failed.error);
  return { data: true, error: null };
}

/** Ajoute un poste libre, marqué modifié (jamais recalculé). */
export async function insertLine(
  dossierId: string,
  line: { label: string; amounts: Record<Level, number>; position: number },
): Promise<RepoResult<true>> {
  const db = await getSupabaseServer();
  const { error } = await db.from('budget_line').insert({
    dossier_id: dossierId,
    grid_key: null,
    label: line.label,
    position: line.position,
    edited: true,
    ...amountColumns(line.amounts),
  });
  if (error) return fail(error);
  return { data: true, error: null };
}

/** Modifie le libellé et les montants d'un poste, qui devient modifié. */
export async function updateLine(
  dossierId: string,
  lineId: string,
  line: { label: string; amounts: Record<Level, number> },
): Promise<RepoResult<true>> {
  const db = await getSupabaseServer();
  const { data, error } = await db
    .from('budget_line')
    .update({ label: line.label, edited: true, ...amountColumns(line.amounts) })
    .eq('dossier_id', dossierId)
    .eq('id', lineId)
    .select('id');
  if (error) return fail(error);
  // WHY: la RLS fait échouer en silence une mise à jour interdite (0 ligne) : on le signale.
  if (!data || data.length === 0) return NO_ROWS;
  return { data: true, error: null };
}

/** Supprime un poste ; refusé par la base s'il porte des dépenses (23503). */
export async function deleteLine(dossierId: string, lineId: string): Promise<RepoResult<true>> {
  const db = await getSupabaseServer();
  const { data, error } = await db
    .from('budget_line')
    .delete()
    .eq('dossier_id', dossierId)
    .eq('id', lineId)
    .select('id');
  if (error) return fail(error);
  if (!data || data.length === 0) return NO_ROWS;
  return { data: true, error: null };
}

/** Scénario retenu, ou null. */
export async function getScenario(dossierId: string): Promise<RepoResult<Level | null>> {
  const db = await getSupabaseServer();
  const { data, error } = await db
    .from('dossier_finance')
    .select('scenario')
    .eq('dossier_id', dossierId)
    .maybeSingle<{ scenario: string | null }>();
  if (error) {
    console.error('[budget/lines] getScenario impossible', { code: error.code });
    return fail(error);
  }
  const value = data?.scenario ?? null;
  return {
    data: value && (LEVELS as readonly string[]).includes(value) ? (value as Level) : null,
    error: null,
  };
}

/** Retient un scénario (trésorier et plus, vérifié par la base) ; null l'efface. */
export async function setScenario(
  dossierId: string,
  scenario: Level | null,
): Promise<RepoResult<true>> {
  const db = await getSupabaseServer();
  const { error } = await db.rpc('set_budget_scenario', {
    p_dossier_id: dossierId,
    p_scenario: scenario,
  });
  if (error) return fail(error);
  return { data: true, error: null };
}

/** Dépenses actives par poste ; la clé '' regroupe les dépenses sans poste. */
export async function spentByLine(dossierId: string): Promise<RepoResult<Map<string, number>>> {
  const db = await getSupabaseServer();
  const { data, error } = await db.rpc('ledger_spent_by_line', { p_dossier_id: dossierId });
  if (error) {
    console.error('[budget/lines] spentByLine impossible', { code: error.code });
    return fail(error);
  }
  const rows = (data ?? []) as { budget_line_id: string | null; spent: number | string }[];
  return {
    data: new Map(rows.map((r) => [r.budget_line_id ?? '', Number(r.spent)])),
    error: null,
  };
}
```

- [ ] **Étape 3 : service**

`apps/web/src/modules/budget/lines/service.ts` :

```ts
import 'server-only';
import { getTranslations } from 'next-intl/server';
import type { z } from 'zod';
import type { Level } from '@/journey/options';
import { listAnswersResult } from '@/modules/dossier/answers/repo';
import { fieldErrors } from '@/modules/dossier/service';
import { budgetGate } from '../gate';
import { ATTENDANCE_KEYS, NIGHTS_KEY } from '../scenarios';
import { gridRows, recomputeRows } from './model';
import * as repo from './repo';
import {
  DossierRefSchema,
  LineRefSchema,
  LineSchema,
  NewLineSchema,
  ScenarioSchema,
} from './schema';

export type LinesError =
  | 'validation'
  | 'forbidden'
  | 'not_found'
  | 'unauthenticated'
  | 'line_in_use'
  | 'unknown';

export type LinesResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: LinesError; fieldErrors?: Record<string, string> };

const CODES: Record<string, LinesError> = {
  '42501': 'forbidden',
  '28000': 'unauthenticated',
  '23514': 'validation',
  '22P02': 'validation',
  '23503': 'line_in_use',
  no_rows: 'not_found',
};

function fromRepo(error: { code: string }, scope: string): { ok: false; error: LinesError } {
  const mapped = CODES[error.code];
  if (!mapped) console.error(`[budget/lines] ${scope} failed`, { code: error.code });
  return { ok: false, error: mapped ?? 'unknown' };
}

function invalid(error: z.ZodError) {
  return {
    ok: false as const,
    error: 'validation' as const,
    fieldErrors: fieldErrors(error.issues),
  };
}

const done = (res: { error: { code: string } | null }, scope: string): LinesResult<true> =>
  res.error ? fromRepo(res.error, scope) : { ok: true, data: true };

async function attendanceAnswers(dossierId: string) {
  const res = await listAnswersResult(dossierId, [...ATTENDANCE_KEYS, NIGHTS_KEY]);
  if (res.error) console.error('[budget/lines] answers unreadable', { code: res.error.code });
  return res.error ? null : res.data;
}

/**
 * Crée les postes de la grille à partir de l'estimation (trésorier et plus).
 *
 * @example
 * await createGridLines({ dossierId }, 'fr');
 */
export async function createGridLines(raw: unknown, locale: string): Promise<LinesResult<true>> {
  const input = DossierRefSchema.safeParse(raw);
  if (!input.success) return invalid(input.error);
  const { dossierId } = input.data;
  const blocked = await budgetGate(dossierId);
  if (blocked) return { ok: false, error: blocked };
  const answers = await attendanceAnswers(dossierId);
  if (!answers) return { ok: false, error: 'unknown' };
  const t = await getTranslations({ locale, namespace: 'budget.grid' });
  return done(
    await repo.insertGridRows(
      dossierId,
      gridRows(answers, (key) => t(key)),
    ),
    'create',
  );
}

/** Recalcule les montants des postes de la grille non modifiés (trésorier et plus). */
export async function recomputeLines(raw: unknown): Promise<LinesResult<true>> {
  const input = DossierRefSchema.safeParse(raw);
  if (!input.success) return invalid(input.error);
  const { dossierId } = input.data;
  const blocked = await budgetGate(dossierId);
  if (blocked) return { ok: false, error: blocked };
  const [answers, lines] = await Promise.all([
    attendanceAnswers(dossierId),
    repo.listLines(dossierId),
  ]);
  if (!answers) return { ok: false, error: 'unknown' };
  if (lines.error) return fromRepo(lines.error, 'recompute');
  return done(
    await repo.updateRecomputed(dossierId, recomputeRows(lines.data, answers)),
    'recompute',
  );
}

/** Modifie un poste (trésorier et plus) ; il ne sera plus recalculé. */
export async function saveLine(raw: unknown): Promise<LinesResult<true>> {
  const input = LineSchema.safeParse(raw);
  if (!input.success) return invalid(input.error);
  const { dossierId, lineId, label, sober, intermediate, full } = input.data;
  const blocked = await budgetGate(dossierId);
  if (blocked) return { ok: false, error: blocked };
  return done(
    await repo.updateLine(dossierId, lineId, { label, amounts: { sober, intermediate, full } }),
    'saveLine',
  );
}

/** Ajoute un poste libre après le dernier (trésorier et plus). */
export async function addLine(raw: unknown): Promise<LinesResult<true>> {
  const input = NewLineSchema.safeParse(raw);
  if (!input.success) return invalid(input.error);
  const { dossierId, label, sober, intermediate, full } = input.data;
  const blocked = await budgetGate(dossierId);
  if (blocked) return { ok: false, error: blocked };
  const lines = await repo.listLines(dossierId);
  if (lines.error) return fromRepo(lines.error, 'addLine');
  const position = Math.min(1000, Math.max(-1, ...lines.data.map((l) => l.position)) + 1);
  return done(
    await repo.insertLine(dossierId, { label, amounts: { sober, intermediate, full }, position }),
    'addLine',
  );
}

/** Supprime un poste sans dépense (trésorier et plus). */
export async function deleteLine(raw: unknown): Promise<LinesResult<true>> {
  const input = LineRefSchema.safeParse(raw);
  if (!input.success) return invalid(input.error);
  const blocked = await budgetGate(input.data.dossierId);
  if (blocked) return { ok: false, error: blocked };
  return done(await repo.deleteLine(input.data.dossierId, input.data.lineId), 'deleteLine');
}

/** Retient un scénario ou l'efface (trésorier et plus). */
export async function chooseScenario(raw: unknown): Promise<LinesResult<Level | null>> {
  const input = ScenarioSchema.safeParse(raw);
  if (!input.success) return invalid(input.error);
  const blocked = await budgetGate(input.data.dossierId);
  if (blocked) return { ok: false, error: blocked };
  const res = await repo.setScenario(input.data.dossierId, input.data.scenario);
  if (res.error) return fromRepo(res.error, 'chooseScenario');
  return { ok: true, data: input.data.scenario };
}
```

- [ ] **Étape 4 : actions**

`apps/web/src/modules/budget/lines/actions.ts` :

```ts
'use server';

import { revalidatePath } from 'next/cache';
import { getLocale } from 'next-intl/server';
import { localizedPath } from '@/lib/auth/redirect-target';
import { getCurrentUser } from '@/lib/supabase/server';
import * as service from './service';
import type { LinesError } from './service';

export interface LinesFormState {
  ok?: boolean;
  error?: LinesError;
  fieldErrors?: Record<string, string>;
}

type Outcome = { ok: boolean; error?: LinesError; fieldErrors?: Record<string, string> };

const field = (formData: FormData, name: string) => String(formData.get(name) ?? '');

const lineFields = (formData: FormData) => ({
  dossierId: field(formData, 'dossierId'),
  label: field(formData, 'label'),
  sober: field(formData, 'sober'),
  intermediate: field(formData, 'intermediate'),
  full: field(formData, 'full'),
});

/**
 * Vérifie la session, lance le traitement, puis revalide les pages qui affichent les postes.
 * WHY: un fichier 'use server' n'exporte que des fonctions asynchrones déclarées ; la logique
 * commune vit donc dans cette fonction privée.
 */
async function run(
  formData: FormData,
  handler: (locale: string) => Promise<Outcome>,
): Promise<LinesFormState> {
  if (!(await getCurrentUser())) return { error: 'unauthenticated' };
  const locale = await getLocale();
  const res = await handler(locale);
  if (!res.ok) return { error: res.error, fieldErrors: res.fieldErrors };
  const dossierId = field(formData, 'dossierId');
  for (const path of [
    `/dossier/${dossierId}/cotisations/postes`,
    `/dossier/${dossierId}/cotisations`,
    `/dossier/${dossierId}`,
  ]) {
    revalidatePath(localizedPath(path, locale));
  }
  return { ok: true };
}

/** Crée les postes de la grille. */
export async function createLinesAction(_prev: LinesFormState | null, formData: FormData) {
  return run(formData, (locale) =>
    service.createGridLines({ dossierId: field(formData, 'dossierId') }, locale),
  );
}

/** Recalcule les postes non modifiés selon l'affluence. */
export async function recomputeLinesAction(_prev: LinesFormState | null, formData: FormData) {
  return run(formData, () => service.recomputeLines({ dossierId: field(formData, 'dossierId') }));
}

/** Enregistre un poste modifié. */
export async function saveLineAction(_prev: LinesFormState | null, formData: FormData) {
  return run(formData, () =>
    service.saveLine({ ...lineFields(formData), lineId: field(formData, 'lineId') }),
  );
}

/** Ajoute un poste libre. */
export async function addLineAction(_prev: LinesFormState | null, formData: FormData) {
  return run(formData, () => service.addLine(lineFields(formData)));
}

/** Supprime un poste sans dépense. */
export async function deleteLineAction(_prev: LinesFormState | null, formData: FormData) {
  return run(formData, () =>
    service.deleteLine({
      dossierId: field(formData, 'dossierId'),
      lineId: field(formData, 'lineId'),
    }),
  );
}

/** Retient un scénario ou l'efface. */
export async function chooseScenarioAction(_prev: LinesFormState | null, formData: FormData) {
  return run(formData, () =>
    service.chooseScenario({
      dossierId: field(formData, 'dossierId'),
      scenario: field(formData, 'scenario'),
    }),
  );
}
```

- [ ] **Étape 5 : tests du dépôt et des actions**

`apps/web/src/modules/budget/lines/repo.test.ts` : avec un faux client Supabase chaînable (même approche que `ledger/repo.test.ts`, à lire et à reprendre), vérifier :

- `listLines` convertit `amount_*` en `amounts` ;
- `insertGridRows` appelle `upsert` avec `{ onConflict: 'dossier_id,grid_key', ignoreDuplicates: true }` et des colonnes `amount_*` ;
- `updateRecomputed` filtre sur `edited = false` pour chaque poste ;
- `updateLine` marque `edited: true`, et `updateLine` comme `deleteLine` renvoient l'erreur `no_rows` quand aucune ligne ne revient ;
- `getScenario` renvoie null pour une valeur absente ou inconnue ;
- `spentByLine` range la ligne `budget_line_id: null` sous la clé `''` et convertit les `bigint` (chaînes) en nombres.

`apps/web/src/modules/budget/lines/actions.test.ts` (même approche que `ledger/actions.test.ts`) : non connecté → `{ error: 'unauthenticated' }` sans appel au service ; succès → les trois chemins localisés revalidés ; erreur du service renvoyée telle quelle sans revalidation ; `createLinesAction` transmet la langue de `getLocale()` ; `chooseScenarioAction` transmet le scénario saisi.

- [ ] **Étape 6 : vérifier et commit**

Run: `pnpm --filter @testimona/web test -- src/modules/budget && pnpm --filter @testimona/web typecheck && pnpm --filter @testimona/web lint`
Expected: PASS.

```bash
git add apps/web/src/modules/budget/lines
git commit -m "feat(budget): add the budget lines repository, service and actions"
```

---

### Tâche 4 : poste d'une dépense dans le registre

**Files:**

- Modify: `apps/web/src/modules/budget/ledger/{schema,model,repo,service,actions,contributions-view}.ts` et leurs tests
- Modify: `apps/web/src/modules/budget/ledger/ui/{EntryForm,EntryForms,EntryList}.tsx` et leurs tests
- Modify: `apps/web/messages/{fr,en}.json`, `apps/web/src/modules/budget/ledger/messages.test.ts`
- Modify: `apps/web/src/app/[locale]/(dossier)/dossier/[id]/cotisations/page.tsx` (props provisoires)

- [ ] **Étape 1 : schéma, modèle, dépôt, service, actions**

1. `ledger/schema.ts` : `export const ExpenseSchema = PledgeSchema.extend({ method: z.enum(ENTRY_METHODS), budgetLineId: optionalId });`
2. `ledger/model.ts` : ajouter `budgetLineId: string | null;` à `LedgerEntry` (après `pledgeId`). Ajouter `budgetLineId: null` à toutes les fabriques de lignes des tests (`grep -rn "pledgeId:" apps/web/src/modules/budget` pour les trouver : `model.test.ts`, `contributions-view.test.ts`, `ui/EntryList.test.tsx`, …).
3. `ledger/repo.ts` : ajouter `budget_line_id` à `COLUMNS`, à `EntryRow` (`budget_line_id: string | null`), à `toEntry` (`budgetLineId: r.budget_line_id`), à `NewEntry` (`budgetLineId: string | null`) et à l'insertion (`budget_line_id: entry.budgetLineId`).
4. `ledger/service.ts` : `TL004: 'validation'` dans `CODES` ; `budgetLineId: d.budgetLineId` dans `recordExpense`, `budgetLineId: null` dans les autres écritures.
5. `ledger/actions.ts` : pour `kind === 'expense'`, `service.recordExpense({ ...base, method, budgetLineId: field(formData, 'budgetLineId') })`.
6. `ledger/contributions-view.ts` : ajouter à l'entrée `lines: readonly Pick<BudgetLine, 'id' | 'label'>[]` (`import type { BudgetLine } from '../lines/model'`) et à la sortie `lineOptions: LineOption[]` (`canManage ? lines.map((l) => ({ id: l.id, label: l.label })) : []`).

Tests à ajouter : `schema.test.ts` (dépense avec `budgetLineId: ''` → null, un uuid conservé) ; `service.test.ts` (la dépense transmet `budgetLineId`, `TL004` → `validation`) ; `repo.test.ts` (`budget_line_id` envoyé et relu) ; `actions.test.ts` (le poste choisi passe au service) ; `contributions-view.test.ts` (`lineOptions` vides sauf trésorier et plus).

- [ ] **Étape 2 : textes du registre**

Dans l'espace `ledger` des deux fichiers de messages : `form.budgetLine` (FR « Poste du budget » / EN "Budget line"), `form.budgetLineNone` (FR « Aucun poste » / EN "No line"), `entry.line` (FR « Poste : {line} » / EN "Line: {line}"). Les ajouter à `PATHS` dans `ledger/messages.test.ts`, avec un contrôle de la variable `{line}`.

- [ ] **Étape 3 : formulaire de dépense et liste**

Dans `ledger/ui/EntryForm.tsx` :

- exporter `export interface LineOption { id: string; label: string; }` et ajouter la prop `lines?: readonly LineOption[]` (défaut `[]`) ;
- `const showLine = kind === 'expense' && lines.length > 0;` et l'ajouter à `shown` (`...(showLine ? ['budgetLineId'] : [])`) ;
- juste après le champ `method`, rendre :

```tsx
{
  showLine &&
    wrap(
      'budgetLineId',
      t('form.budgetLine'),
      <select defaultValue="" className={FIELD} {...a11y('budgetLineId')}>
        <option value="">{t('form.budgetLineNone')}</option>
        {lines.map((l) => (
          <option key={l.id} value={l.id}>
            {l.label}
          </option>
        ))}
      </select>,
    );
}
```

Dans `ledger/ui/EntryForms.tsx` : prop `lines: readonly LineOption[]` transmise au formulaire de dépense.

Dans `ledger/ui/EntryList.tsx` : prop `lineLabels: ReadonlyMap<string, string>` ; pour une dépense rattachée dont le libellé est connu, ajouter après le moyen de paiement `<span className="font-normal"> · {t('entry.line', { line: label })}</span>`.

Dans `cotisations/page.tsx`, passer provisoirement `lines={[]}` à `contributionsView` et `lineLabels={new Map()}` à `EntryList` (branchés pour de bon à la tâche 7).

Tests : `EntryForm.test.tsx` (une dépense avec des postes montre le choix « Poste du budget » avec « Aucun poste » ; absent sans poste et pour une cotisation reçue ; le poste choisi part dans le FormData) ; `EntryList.test.tsx` (une dépense rattachée affiche « Poste : Traiteur »).

- [ ] **Étape 4 : vérifier et commit**

Run: `pnpm --filter @testimona/web test && pnpm --filter @testimona/web typecheck && pnpm --filter @testimona/web lint`
Expected: PASS.

```bash
git add apps/web/src/modules/budget/ledger apps/web/messages/fr.json apps/web/messages/en.json "apps/web/src/app/[locale]/(dossier)/dossier/[id]/cotisations/page.tsx"
git commit -m "feat(budget): attach an expense to a budget line"
```

---

### Tâche 5 : textes des postes

**Files:**

- Modify: `apps/web/messages/fr.json`, `apps/web/messages/en.json`
- Create: `apps/web/src/modules/budget/lines/messages.test.ts`
- Modify: `apps/web/src/modules/budget/ledger/messages.test.ts`

- [ ] **Étape 1 : écrire la garde (elle échoue)**

`apps/web/src/modules/budget/lines/messages.test.ts` : même structure que `ledger/messages.test.ts` (le lire et reprendre `get`, `isFilled`, `leafPaths` et le contrôle des variables ICU). `PATHS` = toutes les feuilles de l'espace `lines` données à l'étape 2. Tests : chaque clé remplie en FR et en EN ; chaque feuille de `lines` listée dans `PATHS` ; mêmes variables ICU en FR et en EN ; `lines.form.editTitle` et `lines.form.delete` contiennent `{label}`, `lines.scenario.current` contient `{level}`, `lines.scenario.option` contient `{level}` et `{total}` ; chaque message de validation de `lines/schema.ts` ('invalid number', 'out of range', 'required', 'too long', 'invalid character') correspond à une clé `lines.errors.*` existante.

Dans `ledger/messages.test.ts`, ajouter `ledger.summary.budgetRetained` et `ledger.card.summaryRetained` (avec `{received}` et `{budget}`).

Run: `pnpm --filter @testimona/web test -- messages`
Expected: FAIL.

- [ ] **Étape 2 : textes**

Dans `apps/web/messages/fr.json`, nouvel espace de premier niveau :

```json
"lines": {
  "page": {
    "title": "Postes du budget",
    "intro": "Les postes reprennent l'estimation de la page Budget. Le trésorier peut les ajuster, en ajouter et retenir un scénario.",
    "estimateNote": "Montants de départ : estimations à vérifier auprès des prestataires.",
    "empty": "Aucun poste pour l'instant. Un trésorier peut les créer à partir de l'estimation.",
    "emptyManager": "Créez les postes à partir de l'estimation de la page Budget, puis ajustez-les.",
    "create": "Créer les postes",
    "created": "Postes créés.",
    "recompute": "Recalculer selon l'affluence",
    "recomputeHint": "Met à jour les postes que personne n'a modifiés, d'après les réponses sur l'affluence.",
    "recomputed": "Postes recalculés."
  },
  "tabs": {
    "label": "Sections des cotisations",
    "entries": "Mouvements",
    "lines": "Postes"
  },
  "scenario": {
    "title": "Scénario retenu",
    "hint": "Le scénario retenu devient le budget de référence de la famille.",
    "none": "Aucun scénario retenu",
    "option": "{level} : {total}",
    "current": "Scénario retenu : {level}",
    "save": "Enregistrer le scénario",
    "saved": "Scénario enregistré."
  },
  "table": {
    "caption": "Postes du budget, montants en FCFA",
    "line": "Poste",
    "spent": "Dépensé",
    "unassigned": "Dépenses sans poste",
    "total": "Total",
    "edited": "modifié",
    "retained": "retenu"
  },
  "form": {
    "editTitle": "Modifier « {label} »",
    "addTitle": "Ajouter un poste",
    "label": "Nom du poste",
    "sober": "Sobre (FCFA)",
    "intermediate": "Intermédiaire (FCFA)",
    "full": "Complet (FCFA)",
    "save": "Enregistrer",
    "saved": "Poste enregistré.",
    "add": "Ajouter le poste",
    "added": "Poste ajouté.",
    "deleteShort": "Supprimer",
    "delete": "Supprimer le poste : {label}",
    "deleteWarning": "Le poste sera retiré du budget.",
    "confirmDelete": "Confirmer la suppression",
    "deleting": "Suppression…",
    "keep": "Garder"
  },
  "errors": {
    "line_in_use": "Ce poste porte des dépenses : il ne peut pas être supprimé.",
    "invalidNumber": "Entrez un montant entier, en chiffres.",
    "outOfRange": "Entrez un montant entre 0 et 100 000 000 FCFA.",
    "required": "Ce champ est obligatoire.",
    "tooLong": "Ce texte est trop long.",
    "invalidCharacter": "Ce texte contient un caractère non accepté."
  }
}
```

Dans `apps/web/messages/en.json` :

```json
"lines": {
  "page": {
    "title": "Budget lines",
    "intro": "The lines start from the estimate on the Budget page. The treasurer can adjust them, add more and retain a scenario.",
    "estimateNote": "Starting amounts: estimates to check with providers.",
    "empty": "No lines yet. A treasurer can create them from the estimate.",
    "emptyManager": "Create the lines from the estimate on the Budget page, then adjust them.",
    "create": "Create the lines",
    "created": "Lines created.",
    "recompute": "Recalculate from attendance",
    "recomputeHint": "Updates the lines nobody has changed, from the attendance answers.",
    "recomputed": "Lines recalculated."
  },
  "tabs": {
    "label": "Contributions sections",
    "entries": "Entries",
    "lines": "Lines"
  },
  "scenario": {
    "title": "Retained scenario",
    "hint": "The retained scenario becomes the family's reference budget.",
    "none": "No scenario retained",
    "option": "{level}: {total}",
    "current": "Retained scenario: {level}",
    "save": "Save the scenario",
    "saved": "Scenario saved."
  },
  "table": {
    "caption": "Budget lines, amounts in FCFA",
    "line": "Line",
    "spent": "Spent",
    "unassigned": "Expenses without a line",
    "total": "Total",
    "edited": "edited",
    "retained": "retained"
  },
  "form": {
    "editTitle": "Edit “{label}”",
    "addTitle": "Add a line",
    "label": "Line name",
    "sober": "Sober (FCFA)",
    "intermediate": "Intermediate (FCFA)",
    "full": "Full (FCFA)",
    "save": "Save",
    "saved": "Line saved.",
    "add": "Add the line",
    "added": "Line added.",
    "deleteShort": "Delete",
    "delete": "Delete the line: {label}",
    "deleteWarning": "The line will be removed from the budget.",
    "confirmDelete": "Confirm deletion",
    "deleting": "Deleting…",
    "keep": "Keep"
  },
  "errors": {
    "line_in_use": "This line has expenses: it cannot be deleted.",
    "invalidNumber": "Enter a whole amount, in digits.",
    "outOfRange": "Enter an amount between 0 and 100,000,000 FCFA.",
    "required": "This field is required.",
    "tooLong": "This text is too long.",
    "invalidCharacter": "This text contains a character that is not accepted."
  }
}
```

Dans l'espace `ledger` des deux fichiers : `summary.budgetRetained` (FR « Budget retenu » / EN "Retained budget") et `card.summaryRetained` (FR « {received} reçus sur un budget retenu de {budget}. » / EN "{received} received against a retained budget of {budget}.").

- [ ] **Étape 3 : vérifier et commit**

Run: `pnpm --filter @testimona/web test`
Expected: PASS.

```bash
git add apps/web/messages/fr.json apps/web/messages/en.json apps/web/src/modules/budget/lines/messages.test.ts apps/web/src/modules/budget/ledger/messages.test.ts
git commit -m "feat(budget): add the budget lines texts"
```

---

### Tâche 6 : onglet « Postes »

**Files:**

- Create: `apps/web/src/modules/budget/lines/ui/useLinesForm.ts`, `LedgerTabs.tsx`, `ScenarioForm.tsx`, `LinesActions.tsx`, `LineForm.tsx`, `DeleteLineButton.tsx`, `LinesTable.tsx`, et leurs tests
- Create: `apps/web/src/app/[locale]/(dossier)/dossier/[id]/cotisations/postes/page.tsx`
- Modify: `apps/web/src/app/[locale]/(dossier)/dossier/[id]/cotisations/page.tsx` (onglets)
- Modify: `apps/web/e2e/smoke.spec.ts`

- [ ] **Étape 1 : hook commun des formulaires**

`apps/web/src/modules/budget/lines/ui/useLinesForm.ts` :

```ts
'use client';

import { startTransition, useActionState, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type { LinesFormState } from '../actions';

type Action = (prev: LinesFormState | null, formData: FormData) => Promise<LinesFormState>;

/**
 * État commun des formulaires de postes : envoi par onSubmit, statut « enregistré » effacé à la
 * saisie suivante, focus sur le premier champ en erreur.
 * WHY: onSubmit plutôt que `<form action>` : React 19 vide le formulaire après chaque action,
 * même en erreur, et la personne perdrait sa saisie.
 *
 * @example
 * const { state, pending, saved, onSubmit, clearSaved, formRef } = useLinesForm(addLineAction, true);
 */
export function useLinesForm(action: Action, resetOnSuccess = false) {
  const [state, formAction, pending] = useActionState<LinesFormState | null, FormData>(
    action,
    null,
  );
  const [saved, setSaved] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) {
      if (resetOnSuccess) formRef.current?.reset();
      setSaved(true);
    } else if (state?.fieldErrors) {
      formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
    }
  }, [state, resetOnSuccess]);

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (pending) return;
    const data = new FormData(e.currentTarget);
    startTransition(() => formAction(data));
  };

  return { state, pending, saved, onSubmit, clearSaved: () => setSaved(false), formRef };
}
```

- [ ] **Étape 2 : onglets**

`apps/web/src/modules/budget/lines/ui/LedgerTabs.tsx` :

```tsx
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

/**
 * Navigation entre les mouvements et les postes des cotisations.
 * WHY: deux pages liées plutôt que des onglets ARIA : chaque section a son adresse et reste
 * utilisable sans JavaScript.
 *
 * @example
 * <LedgerTabs dossierId={id} current="lines" />
 */
export async function LedgerTabs({
  dossierId,
  current,
}: {
  dossierId: string;
  current: 'entries' | 'lines';
}) {
  const t = await getTranslations('lines.tabs');
  const items = [
    { key: 'entries', href: `/dossier/${dossierId}/cotisations` },
    { key: 'lines', href: `/dossier/${dossierId}/cotisations/postes` },
  ] as const;
  return (
    <nav aria-label={t('label')} className="border-border flex gap-2 border-b">
      {items.map((item) => {
        const active = item.key === current;
        return (
          <Link
            key={item.key}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-semibold ${
              active
                ? 'border-secondary text-secondary'
                : 'text-foreground border-transparent underline'
            }`}
          >
            {t(item.key)}
          </Link>
        );
      })}
    </nav>
  );
}
```

- [ ] **Étape 3 : scénario retenu**

`apps/web/src/modules/budget/lines/ui/ScenarioForm.tsx` :

```tsx
'use client';

import { useTranslations } from 'next-intl';
import { buttonClasses } from '@/components/ui/Button';
import { LEVELS, type Level } from '@/journey/options';
import { chooseScenarioAction } from '../actions';
import { useLinesForm } from './useLinesForm';

interface Props {
  dossierId: string;
  scenario: Level | null;
  /** Total des postes de chaque niveau, déjà formaté. */
  totals: Readonly<Record<Level, string>>;
}

/**
 * Choix du scénario retenu (trésorier et plus), avec le total des postes de chaque niveau.
 *
 * @example
 * <ScenarioForm dossierId={id} scenario="intermediate" totals={{ sober: '1 200 000 FCFA', … }} />
 */
export function ScenarioForm({ dossierId, scenario, totals }: Props) {
  const t = useTranslations('lines.scenario');
  const tLevel = useTranslations('budget.level');
  const tErrors = useTranslations('dossier.errors');
  const { state, pending, saved, onSubmit, clearSaved, formRef } =
    useLinesForm(chooseScenarioAction);
  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      onChange={clearSaved}
      className="border-border space-y-3 rounded-2xl border p-4"
    >
      <input type="hidden" name="dossierId" value={dossierId} />
      <fieldset className="space-y-2">
        <legend className="text-foreground font-semibold">{t('title')}</legend>
        <p className="text-foreground text-sm">{t('hint')}</p>
        {LEVELS.map((level) => (
          <label key={level} className="text-foreground flex items-center gap-2 text-sm">
            <input type="radio" name="scenario" value={level} defaultChecked={scenario === level} />
            {t('option', { level: tLevel(level), total: totals[level] })}
          </label>
        ))}
        <label className="text-foreground flex items-center gap-2 text-sm">
          <input type="radio" name="scenario" value="" defaultChecked={scenario === null} />
          {t('none')}
        </label>
      </fieldset>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          aria-busy={pending || undefined}
          className={buttonClasses({
            variant: 'secondary',
            size: 'sm',
            className: 'disabled:cursor-not-allowed disabled:opacity-60',
          })}
        >
          {t('save')}
        </button>
        <p role="status" className="text-foreground text-sm">
          {saved ? t('saved') : ''}
        </p>
      </div>
      {state?.error && (
        <p role="alert" className="text-destructive text-sm">
          {tErrors(state.error === 'line_in_use' ? 'unknown' : state.error)}
        </p>
      )}
    </form>
  );
}
```

- [ ] **Étape 4 : créer et recalculer**

`apps/web/src/modules/budget/lines/ui/LinesActions.tsx` :

```tsx
'use client';

import { useId } from 'react';
import { useTranslations } from 'next-intl';
import { buttonClasses } from '@/components/ui/Button';
import { createLinesAction, recomputeLinesAction } from '../actions';
import { useLinesForm } from './useLinesForm';

/**
 * « Créer les postes » quand il n'y en a aucun, sinon « Recalculer selon l'affluence ».
 *
 * @example
 * <LinesActions dossierId={id} hasLines={lines.length > 0} />
 */
export function LinesActions({ dossierId, hasLines }: { dossierId: string; hasLines: boolean }) {
  const t = useTranslations('lines.page');
  const tErrors = useTranslations('dossier.errors');
  const { state, pending, saved, onSubmit, formRef } = useLinesForm(
    hasLines ? recomputeLinesAction : createLinesAction,
  );
  const hintId = `${useId()}-recompute-hint`;
  return (
    <form ref={formRef} onSubmit={onSubmit} className="space-y-2">
      <input type="hidden" name="dossierId" value={dossierId} />
      {hasLines && (
        <p id={hintId} className="text-foreground text-sm">
          {t('recomputeHint')}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          aria-busy={pending || undefined}
          aria-describedby={hasLines ? hintId : undefined}
          className={buttonClasses({
            variant: 'secondary',
            size: 'md',
            className: 'disabled:cursor-not-allowed disabled:opacity-60',
          })}
        >
          {hasLines ? t('recompute') : t('create')}
        </button>
        <p role="status" className="text-foreground text-sm">
          {saved ? (hasLines ? t('recomputed') : t('created')) : ''}
        </p>
      </div>
      {state?.error && (
        <p role="alert" className="text-destructive text-sm">
          {tErrors(state.error === 'line_in_use' ? 'unknown' : state.error)}
        </p>
      )}
    </form>
  );
}
```

- [ ] **Étape 5 : formulaire d'un poste (modification et ajout)**

`apps/web/src/modules/budget/lines/ui/LineForm.tsx` :

```tsx
'use client';

import { useId } from 'react';
import { useTranslations } from 'next-intl';
import { buttonClasses } from '@/components/ui/Button';
import { LEVELS, type Level } from '@/journey/options';
import { addLineAction, saveLineAction } from '../actions';
import { useLinesForm } from './useLinesForm';

const FIELD = 'border-border bg-background text-foreground w-full rounded-xl border px-3 py-2';

const FIELD_MESSAGES: Record<string, string> = {
  'invalid number': 'errors.invalidNumber',
  'out of range': 'errors.outOfRange',
  required: 'errors.required',
  'too long': 'errors.tooLong',
  'invalid character': 'errors.invalidCharacter',
};

interface Props {
  dossierId: string;
  /** Poste modifié ; absent pour ajouter un poste libre. */
  line?: { id: string; label: string; amounts: Readonly<Record<Level, number>> };
}

/**
 * Libellé et montant par niveau d'un poste : modification d'un poste existant ou ajout d'un poste
 * libre (le formulaire se vide après un ajout réussi).
 *
 * @example
 * <LineForm dossierId={id} line={{ id, label: 'Cercueil', amounts }} />
 */
export function LineForm({ dossierId, line }: Props) {
  const t = useTranslations('lines');
  const tErrors = useTranslations('dossier.errors');
  const { state, pending, saved, onSubmit, clearSaved, formRef } = useLinesForm(
    line ? saveLineAction : addLineAction,
    !line,
  );
  const uid = useId();
  const fieldError = (name: string) => {
    const message = state?.fieldErrors?.[name];
    if (!message) return null;
    const key = FIELD_MESSAGES[message];
    return key ? t(key) : tErrors('validation');
  };
  const field = (name: string, label: string, defaultValue: string, numeric: boolean) => {
    const error = fieldError(name);
    const id = `${uid}-${name}`;
    return (
      <div key={name} className="space-y-1">
        <label htmlFor={id} className="text-foreground block text-sm">
          {label}
        </label>
        <input
          id={id}
          name={name}
          defaultValue={defaultValue}
          inputMode={numeric ? 'numeric' : undefined}
          maxLength={numeric ? undefined : 120}
          autoComplete="off"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className={FIELD}
        />
        {error && (
          <p id={`${id}-error`} role="alert" className="text-destructive text-sm">
            {error}
          </p>
        )}
      </div>
    );
  };
  const hasFieldError = Object.keys(state?.fieldErrors ?? {}).length > 0;
  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      onChange={clearSaved}
      noValidate
      className="grid gap-3 sm:grid-cols-2"
    >
      <input type="hidden" name="dossierId" value={dossierId} />
      {line && <input type="hidden" name="lineId" value={line.id} />}
      {field('label', t('form.label'), line?.label ?? '', false)}
      {LEVELS.map((level) =>
        field(level, t(`form.${level}`), line ? String(line.amounts[level]) : '', true),
      )}
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <button
          type="submit"
          disabled={pending}
          aria-busy={pending || undefined}
          className={buttonClasses({
            variant: 'secondary',
            size: 'sm',
            className: 'disabled:cursor-not-allowed disabled:opacity-60',
          })}
        >
          {line ? t('form.save') : t('form.add')}
        </button>
        <p role="status" className="text-foreground text-sm">
          {saved ? (line ? t('form.saved') : t('form.added')) : ''}
        </p>
      </div>
      {state?.error && !hasFieldError && (
        <p role="alert" className="text-destructive text-sm sm:col-span-2">
          {state.error === 'line_in_use' ? t('errors.line_in_use') : tErrors(state.error)}
        </p>
      )}
    </form>
  );
}
```

- [ ] **Étape 6 : suppression en deux temps**

`apps/web/src/modules/budget/lines/ui/DeleteLineButton.tsx` : reprendre le schéma de `apps/web/src/modules/budget/ledger/ui/ReverseButton.tsx` (le lire en entier) avec ces différences :

- props `{ dossierId: string; lineId: string; label: string }` ;
- pas de clé d'idempotence (une suppression rejouée échoue proprement en `not_found`) ;
- déclencheur : texte visible `t('form.deleteShort')` (« Supprimer »), `aria-label={t('form.delete', { label })}` (le nom accessible commence par le texte visible), classes `text-secondary font-semibold underline underline-offset-2` ;
- confirmation : avertissement `t('form.deleteWarning')` relié par `aria-describedby`, bouton `bg-destructive text-destructive-foreground` libellé `t('form.confirmDelete')`, `t('form.deleting')` et `aria-busy` pendant l'envoi, bouton `t('form.keep')` qui reçoit le focus à l'ouverture et rend le focus au déclencheur à la fermeture ;
- envoi : `deleteLineAction` par `onSubmit` + `startTransition`, formulaire remonté avec une `key` à chaque ouverture pour ne pas réafficher une ancienne erreur ;
- erreur : `line_in_use` → `t('errors.line_in_use')`, les autres → `dossier.errors`, en `role="alert"` `text-destructive`.

- [ ] **Étape 7 : tableau des postes**

`apps/web/src/modules/budget/lines/ui/LinesTable.tsx` :

```tsx
import { getTranslations } from 'next-intl/server';
import { LEVELS, type Level } from '@/journey/options';
import { formatXaf } from '../../format';
import { scenarioTotals, type LineView } from '../model';
import { DeleteLineButton } from './DeleteLineButton';
import { LineForm } from './LineForm';

interface Props {
  dossierId: string;
  locale: string;
  lines: readonly LineView[];
  scenario: Level | null;
  unassignedSpent: number;
  canManage: boolean;
}

/**
 * Postes du budget : montant par niveau (le scénario retenu mis en avant) et dépenses rattachées ;
 * pour le trésorier, modification et suppression de chaque poste, et ajout d'un poste libre.
 * WHY: pas de suppression proposée pour un poste qui porte des dépenses ; la base la refuse
 * de toute façon (line_in_use).
 *
 * @example
 * <LinesTable dossierId={id} locale="fr" lines={views} scenario="sober" unassignedSpent={0} canManage />
 */
export async function LinesTable({
  dossierId,
  locale,
  lines,
  scenario,
  unassignedSpent,
  canManage,
}: Props) {
  const t = await getTranslations('lines');
  const tLevel = await getTranslations('budget.level');
  const money = (n: number) => formatXaf(n, locale);
  const totals = scenarioTotals(lines);
  const spentTotal = lines.reduce((sum, l) => sum + l.spent, 0) + unassignedSpent;
  const levelHeader = (level: Level) =>
    scenario === level ? `${tLevel(level)} (${t('table.retained')})` : tLevel(level);
  const cell = (level: Level) =>
    `px-3 py-2 text-right tabular-nums ${scenario === level ? 'font-bold' : ''}`;
  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[36rem] text-sm">
          <caption className="text-foreground mb-2 text-left font-semibold">
            {t('table.caption')}
          </caption>
          <thead>
            <tr className="border-border border-b">
              <th scope="col" className="text-foreground px-3 py-2 text-left">
                {t('table.line')}
              </th>
              {LEVELS.map((level) => (
                <th key={level} scope="col" className="text-foreground px-3 py-2 text-right">
                  {levelHeader(level)}
                </th>
              ))}
              <th scope="col" className="text-foreground px-3 py-2 text-right">
                {t('table.spent')}
              </th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => (
              <tr key={line.id} className="border-border border-b">
                <th scope="row" className="text-foreground px-3 py-2 text-left font-normal">
                  {line.label}
                  {line.edited && line.gridKey && <span> · {t('table.edited')}</span>}
                </th>
                {LEVELS.map((level) => (
                  <td key={level} className={cell(level)}>
                    {money(line.amounts[level])}
                  </td>
                ))}
                <td className="px-3 py-2 text-right tabular-nums">{money(line.spent)}</td>
              </tr>
            ))}
            {unassignedSpent > 0 && (
              <tr className="border-border border-b">
                <th scope="row" className="text-foreground px-3 py-2 text-left font-normal">
                  {t('table.unassigned')}
                </th>
                {LEVELS.map((level) => (
                  <td key={level} className={cell(level)} />
                ))}
                <td className="px-3 py-2 text-right tabular-nums">{money(unassignedSpent)}</td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row" className="text-foreground px-3 py-2 text-left">
                {t('table.total')}
              </th>
              {LEVELS.map((level) => (
                <td key={level} className={`${cell(level)} font-semibold`}>
                  {money(totals[level])}
                </td>
              ))}
              <td className="px-3 py-2 text-right font-semibold tabular-nums">
                {money(spentTotal)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
      {canManage && (
        <ul className="space-y-3">
          {lines.map((line) => (
            <li key={line.id} className="border-border space-y-3 rounded-2xl border p-4">
              <details>
                <summary className="text-foreground cursor-pointer font-semibold">
                  {t('form.editTitle', { label: line.label })}
                </summary>
                <div className="mt-4">
                  <LineForm dossierId={dossierId} line={line} />
                </div>
              </details>
              {line.spent === 0 && (
                <DeleteLineButton dossierId={dossierId} lineId={line.id} label={line.label} />
              )}
            </li>
          ))}
          <li className="border-border rounded-2xl border p-4">
            <details>
              <summary className="text-foreground cursor-pointer font-semibold">
                {t('form.addTitle')}
              </summary>
              <div className="mt-4">
                <LineForm dossierId={dossierId} />
              </div>
            </details>
          </li>
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Étape 8 : page « Postes »**

`apps/web/src/app/[locale]/(dossier)/dossier/[id]/cotisations/postes/page.tsx` :

```tsx
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { z } from 'zod';
import { Link } from '@/i18n/navigation';
import { LEVELS, type Level } from '@/journey/options';
import { isStepOpen } from '@/journey/registry';
import { formatXaf } from '@/modules/budget/format';
import { canManageLedger } from '@/modules/budget/ledger/contributions-view';
import { lineViews, scenarioTotals } from '@/modules/budget/lines/model';
import { getScenario, listLines, spentByLine } from '@/modules/budget/lines/repo';
import { LedgerTabs } from '@/modules/budget/lines/ui/LedgerTabs';
import { LinesActions } from '@/modules/budget/lines/ui/LinesActions';
import { LinesTable } from '@/modules/budget/lines/ui/LinesTable';
import { ScenarioForm } from '@/modules/budget/lines/ui/ScenarioForm';
import { getDossier, getMyRole } from '@/modules/dossier/repo';

export const metadata: Metadata = { robots: { index: false, follow: false } };

const IdSchema = z.string().uuid();

export default async function BudgetLinesPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  if (!IdSchema.safeParse(id).success) notFound();

  const [dossier, role] = await Promise.all([getDossier(id), getMyRole(id)]);
  if (!dossier || !isStepOpen(dossier.entryPoint, 'attendance')) notFound();

  const [t, tLevel, tPage, lines, scenario, spent] = await Promise.all([
    getTranslations('lines'),
    getTranslations('budget.level'),
    getTranslations('ledger.page'),
    listLines(id),
    getScenario(id),
    spentByLine(id),
  ]);
  // WHY: des postes ou des dépenses faux seraient pires qu'un écran d'erreur ; error.tsx prend le relais.
  if (lines.error || scenario.error || spent.error) throw new Error('budget lines unreadable');

  const canManage = canManageLedger(role);
  const views = lineViews(lines.data, spent.data);
  const totals = scenarioTotals(lines.data);
  const formatted = Object.fromEntries(
    LEVELS.map((level) => [level, formatXaf(totals[level], locale)]),
  ) as Record<Level, string>;
  const hasLines = views.length > 0;
  return (
    <div className="mx-auto w-full max-w-4xl space-y-8 px-4 py-8 sm:px-6 lg:py-12">
      <header className="space-y-2">
        <h1 className="font-display text-foreground text-3xl font-bold">{t('page.title')}</h1>
        <p className="text-foreground">{t('page.intro')}</p>
        <p className="text-foreground text-sm">{t('page.estimateNote')}</p>
      </header>

      <LedgerTabs dossierId={id} current="lines" />

      {!canManage && scenario.data && (
        <p className="text-foreground font-semibold">
          {t('scenario.current', { level: tLevel(scenario.data) })}
        </p>
      )}
      {canManage && hasLines && (
        <ScenarioForm dossierId={id} scenario={scenario.data} totals={formatted} />
      )}

      {hasLines ? (
        <LinesTable
          dossierId={id}
          locale={locale}
          lines={views}
          scenario={scenario.data}
          unassignedSpent={spent.data.get('') ?? 0}
          canManage={canManage}
        />
      ) : (
        <p className="text-foreground">{canManage ? t('page.emptyManager') : t('page.empty')}</p>
      )}

      {canManage && <LinesActions dossierId={id} hasLines={hasLines} />}

      <Link
        href={`/dossier/${id}`}
        className="text-foreground text-sm underline underline-offset-2"
      >
        ← {tPage('backToDossier')}
      </Link>
    </div>
  );
}
```

Dans `cotisations/page.tsx`, importer `LedgerTabs` et ajouter `<LedgerTabs dossierId={id} current="entries" />` juste après le `<header>`.

- [ ] **Étape 9 : tests et e2e**

Tests jsdom (même mise en place que `ledger/ui/*.test.tsx` : directive `// @vitest-environment jsdom`, mocks de `next-intl` et des actions) :

- `ScenarioForm.test.tsx` : le scénario courant est coché ; « Aucun scénario retenu » coché quand null ; l'envoi passe `scenario` ; après une erreur, le choix de la personne reste coché ;
- `LineForm.test.tsx` : en modification, valeurs préremplies et `lineId` caché ; une erreur de champ s'affiche traduite avec `aria-invalid`, le focus y va et la saisie est gardée ; en ajout, succès → formulaire vidé et « Poste ajouté. » ;
- `DeleteLineButton.test.tsx` : confirmation en deux temps, focus sur « Garder », retour du focus au déclencheur, erreur `line_in_use` traduite, nom accessible « Supprimer le poste : … » ;
- `LinesActions.test.tsx` : « Créer les postes » sans poste, « Recalculer selon l'affluence » avec l'aide reliée sinon ;
- `LinesTable.test.tsx` : la colonne du scénario retenu porte « (retenu) » ; la ligne « Dépenses sans poste » n'apparaît que si elle est non nulle ; les formulaires n'apparaissent que pour un gestionnaire ; pas de bouton de suppression sur un poste qui a des dépenses.

Dans `apps/web/e2e/smoke.spec.ts`, à côté du test Cotisations :

```ts
test('Budget lines page requires sign-in', async ({ page }) => {
  await page.goto('/dossier/44444444-4444-4444-8444-444444444444/cotisations/postes');
  await expect(page).toHaveURL(/\/login\?next=.*postes/);
});
```

- [ ] **Étape 10 : vérifier et commit**

Run: `pnpm --filter @testimona/web test && pnpm --filter @testimona/web typecheck && pnpm --filter @testimona/web lint`, puis `NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder_anon_key_long_enough NEXT_PUBLIC_SITE_URL=https://example.com pnpm --filter @testimona/web build`.
Expected: PASS ; la route `/[locale]/dossier/[id]/cotisations/postes` apparaît.

```bash
git add apps/web/src/modules/budget/lines/ui "apps/web/src/app/[locale]/(dossier)/dossier/[id]/cotisations" apps/web/e2e/smoke.spec.ts
git commit -m "feat(budget): add the budget lines tab"
```

---

### Tâche 7 : budget de référence et poste des dépenses sur l'écran Cotisations et le tableau de bord

**Files:**

- Modify: `apps/web/src/app/[locale]/(dossier)/dossier/[id]/cotisations/page.tsx`
- Modify: `apps/web/src/app/[locale]/(dossier)/dossier/[id]/page.tsx`
- Modify: `apps/web/src/modules/budget/ledger/ui/LedgerSummary.tsx`, `LedgerCard.tsx` et leurs tests

- [ ] **Étape 1 : synthèse et carte**

`LedgerSummary` : la prop `budget: number | null` devient `budget: ReferenceBudget | null` (`import type { ReferenceBudget } from '../../lines/model'`) ; libellé `t('budgetRetained')` si `budget?.source === 'retained'`, `t('budget')` si `'envisaged'`, `t('budgetNone')` si null ; montant `budget.amount` ; `remaining(budget?.amount ?? null, totals)`.

`LedgerCard` : même changement de prop ; texte `t('summaryRetained', { received, budget })` pour un budget retenu, `t('summary', …)` pour un budget envisagé, `t('summaryNoBudget', …)` sinon ; `t('unavailable')` inchangé quand les totaux sont illisibles.

Tests : `LedgerSummary.test.tsx` et `LedgerCard.test.tsx` couvrent les trois cas (retenu, envisagé, aucun).

- [ ] **Étape 2 : écran Cotisations**

Dans `cotisations/page.tsx` : ajouter `listLines(id)` et `getScenario(id)` au `Promise.all` (imports depuis `@/modules/budget/lines/repo`), les ajouter à la condition qui lève l'erreur, puis :

```tsx
const budget = referenceBudget(scenario.data, lines.data, answers.data);
const lineLabels = new Map(lines.data.map((l) => [l.id, l.label]));
```

Passer `budget={budget}` à `LedgerSummary`, `lines: lines.data` à `contributionsView` (puis `lines={lineOptions}` à `EntryForms`), `lineLabels={lineLabels}` à `EntryList`. Supprimer l'import devenu inutile de `envisagedTotal`.

- [ ] **Étape 3 : tableau de bord**

Dans `dossier/[id]/page.tsx` : quand `hasBudget`, lire aussi `listLines(id)` et `getScenario(id)` dans le `Promise.all` existant (`null` sinon) ; si l'une des deux lectures échoue, passer `totals={null}` à la carte (texte « momentanément indisponibles », plutôt qu'un budget faux) ; sinon `budget={referenceBudget(scenario.data, lines.data, answers)}`.

- [ ] **Étape 4 : vérifier et commit**

Run: `pnpm --filter @testimona/web test && pnpm --filter @testimona/web typecheck && pnpm --filter @testimona/web lint && pnpm format:check`, puis le build.
Expected: PASS.

```bash
git add apps/web/src/modules/budget/ledger "apps/web/src/app/[locale]/(dossier)/dossier/[id]/page.tsx" "apps/web/src/app/[locale]/(dossier)/dossier/[id]/cotisations/page.tsx"
git commit -m "feat(budget): use the retained scenario as the reference budget"
```

---

### Tâche 8 : spec, vérification complète et PR

- [ ] **Étape 1 : mettre à jour la spec**

Dans `docs/superpowers/specs/2026-10-27-lot-2-financer-design.md` :

- `budget_line` : colonnes `amount_sober`, `amount_intermediate`, `amount_full` (avec la raison : `full` est réservé), `created_at`, `updated_at` ; au plus 100 postes ; suppression refusée si le poste porte des dépenses ; dossier et clé de grille figés ;
- `dossier_finance.scenario` : livré, écrit par `set_budget_scenario` (trésorier et plus) ;
- `ledger_entry.budget_line_id` : livré, contrôle `TL004` (poste d'un autre dossier), effacé sur une annulation ;
- `ledger_spent_by_line` : dépenses actives par poste ;
- budget de référence : total du scénario retenu s'il existe des postes, sinon budget envisagé ;
- écran : onglet « Postes » à l'adresse `/dossier/[id]/cotisations/postes`.

- [ ] **Étape 2 : vérification locale**

```bash
pnpm install --frozen-lockfile
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder_anon_key_long_enough NEXT_PUBLIC_SITE_URL=https://example.com pnpm build
```

Expected : tout vert.

- [ ] **Étape 3 : production (avec l'accord de l'utilisateur, dans cet ordre)**

1. Appliquer `20261027000700_budget_lines` en production (MCP Supabase `apply_migration`, contenu exact du fichier), vérifier tables, colonnes, policies et droits, puis `get_advisors` (sécurité) : `set_budget_scenario` sera signalée (0029), c'est voulu.
2. Mettre à jour `supabase/README.md` (état de la production) et commiter.
3. Pousser, ouvrir la PR vers `main` (Contexte / Changements / Tests effectués / Risques, ligne d'attribution habituelle), attendre la CI, fusionner avec l'accord de l'utilisateur, vérifier le déploiement Railway.
