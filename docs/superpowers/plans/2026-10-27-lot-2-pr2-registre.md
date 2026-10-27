# Lot 2 · PR 2 — Registre des cotisations : plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** la famille tient un registre fiable des promesses, cotisations reçues et dépenses, en ajout seul, avec des droits par rôle et une visibilité des montants individuels réglable, sur un écran « Cotisations ».

**Architecture:** une migration ajoute `dossier_finance` (réglage de visibilité) et `ledger_entry` (registre en ajout seul : pas d'UPDATE ni de DELETE, corrections par annulation, clé d'idempotence, contrôles par trigger) et une fonction `ledger_totals` qui ne renvoie que des sommes. Le module `apps/web/src/modules/budget/ledger/` (schéma Zod, modèle pur, dépôt, service, actions) alimente la page `/dossier/[id]/cotisations` et une carte du tableau de bord.

**Tech Stack:** Supabase (Postgres 17, RLS, PGlite pour les tests SQL), Next.js 15 (Server Components, server actions), React 19, next-intl 3, Zod 3, Vitest.

Spec : `docs/superpowers/specs/2026-10-27-lot-2-financer-design.md` (§ 1 `dossier_finance`, `ledger_entry`, `ledger_totals` ; § 2 écran Cotisations ; § 4 erreurs et tests).

---

## Décisions de ce plan (à valider dans la PR)

- **Découpage du lot 2 en 5 PR.** La PR 2 de la spec est trop grosse pour une seule revue. Cette PR livre le registre. Le **scénario retenu par le trésorier**, les **postes modifiables** (`budget_line`) et le **rattachement d'une dépense à un poste** passent en PR 3 « Postes ». Les reçus deviennent la PR 4, le bilan et la clôture la PR 5. La spec est mise à jour dans cette PR.
- **Budget de référence de l'écran :** en attendant la PR 3, l'écran Cotisations affiche le **budget envisagé** (total du niveau choisi à l'étape B.2, calculé comme sur la page Budget). Sans niveau choisi, il affiche « Budget non choisi » et un lien vers la page Budget.
- **Promesse honorée :** une cotisation reçue peut viser une promesse (`pledge_id`). Une promesse est « non versée » tant qu'aucune cotisation reçue active ne la vise. Le trigger recopie alors le membre de la promesse sur la cotisation, pour que le membre la voie en mode `restricted`.
- **Annulation :** une ligne `reversal` reprend (par trigger) le montant, le nom et le membre de la ligne visée, et note son type (`reverses_kind`) ; la RLS s'en sert pour savoir qui peut voir l'annulation sans relire la table (pas de politique récursive).
- **Pas de clôture dans cette PR** (colonnes et règles en PR 5).
- **Saisie d'un membre pour une cotisation reçue :** liste des membres du dossier (nom affiché) ; « Autre personne (sans compte) » laisse le lien vide.

## Structure des fichiers

| Fichier                                                                 | Rôle                                                                        |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `supabase/migrations/20261027000600_ledger.sql`                         | `dossier_finance`, `ledger_entry`, trigger, RLS, `ledger_totals`            |
| `supabase/tests/ledger.test.ts`                                         | Droits, ajout seul, annulations, promesses, idempotence, visibilité, totaux |
| `apps/web/src/modules/budget/scenarios.ts`                              | `envisagedTotal` (budget du niveau choisi)                                  |
| `apps/web/src/modules/budget/ledger/schema.ts`                          | Zod : saisies, moyens, visibilité                                           |
| `apps/web/src/modules/budget/ledger/model.ts`                           | Pur : vues des lignes (annulée, honorée), promesses ouvertes, solde         |
| `apps/web/src/modules/budget/ledger/repo.ts`                            | Seul accès base du registre                                                 |
| `apps/web/src/modules/budget/ledger/service.ts`                         | Règles applicatives, erreurs typées                                         |
| `apps/web/src/modules/budget/ledger/actions.ts`                         | Server actions des formulaires                                              |
| `apps/web/src/modules/budget/ledger/ui/*.tsx`                           | Synthèse, liste, formulaires, annulation, visibilité, carte                 |
| `apps/web/src/app/[locale]/(dossier)/dossier/[id]/cotisations/page.tsx` | Écran Cotisations                                                           |
| `apps/web/src/app/[locale]/(dossier)/dossier/[id]/page.tsx`             | Carte « Cotisations » du tableau de bord                                    |
| `apps/web/messages/{fr,en}.json`                                        | Espace `ledger.*`                                                           |
| `apps/web/src/modules/budget/ledger/messages.test.ts`                   | Garde des textes                                                            |

Règles : accès base uniquement dans les `repo.ts` (client utilisateur, jamais service-role), 300 lignes au maximum par fichier, `pnpm exec prettier --write <fichiers>` avant chaque commit (passer les chemins un par un en zsh). Commits conventionnels en anglais terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Commentaires et JSDoc en français, `// WHY:` pour les choix. Ne jamais utiliser `git checkout --` ni `git restore` sur des fichiers que l'on n'a pas modifiés soi-même.

---

### Tâche 1 : migration du registre

**Files:**

- Create: `supabase/migrations/20261027000600_ledger.sql`
- Create: `supabase/tests/ledger.test.ts`
- Modify: `supabase/README.md`

- [ ] **Étape 1 : écrire le test SQL (il échoue)**

`supabase/tests/ledger.test.ts` :

```ts
import { randomUUID } from 'node:crypto';
import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { asRole, asUser, createTestDb, createUser } from './helpers/db';

let db: PGlite;
let owner: string;
let treasurer: string;
let contributor: string;
let other: string;
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

interface EntryFields {
  kind: 'pledge' | 'receipt' | 'expense' | 'reversal';
  amount?: number;
  method?: string | null;
  party?: string;
  member?: string | null;
  pledge?: string | null;
  reverses?: string | null;
  key?: string;
  dossier?: string;
}

async function insert(userId: string, f: EntryFields) {
  const { rows } = await asUser(db, userId, () =>
    db.query<{ id: string; amount: number; party_name: string; member_id: string | null }>(
      `insert into ledger_entry
         (dossier_id, kind, amount, method, party_name, member_id, pledge_id, reverses_id, idempotency_key)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       returning id, amount, party_name, member_id`,
      [
        f.dossier ?? dossierId,
        f.kind,
        f.amount ?? 10_000,
        f.method === undefined
          ? f.kind === 'pledge' || f.kind === 'reversal'
            ? null
            : 'cash'
          : f.method,
        f.party ?? 'Oncle Paul',
        f.member ?? null,
        f.pledge ?? null,
        f.reverses ?? null,
        f.key ?? randomUUID(),
      ],
    ),
  );
  return rows[0]!;
}

async function totals(userId: string, dossier = dossierId) {
  const { rows } = await asUser(db, userId, () =>
    db.query<{ received: string; pledged_open: string; spent: string }>(
      'select * from public.ledger_totals($1)',
      [dossier],
    ),
  );
  const row = rows[0]!;
  return {
    received: Number(row.received),
    pledgedOpen: Number(row.pledged_open),
    spent: Number(row.spent),
  };
}

beforeAll(async () => {
  db = await createTestDb();
  owner = await createUser(db, 'owner@test.local');
  treasurer = await createUser(db, 'treasurer@test.local');
  contributor = await createUser(db, 'contributor@test.local');
  other = await createUser(db, 'other@test.local');
  viewer = await createUser(db, 'viewer@test.local');
  stranger = await createUser(db, 'stranger@test.local');
  dossierId = await createDossier(owner);
  otherDossierId = await createDossier(stranger);
  await addMember(treasurer, 'treasurer');
  await addMember(contributor, 'contributor');
  await addMember(other, 'contributor');
  await addMember(viewer, 'viewer');
});

afterAll(async () => {
  await db?.close();
});

describe('ledger_entry : droits d’écriture', () => {
  it('laisse un contributeur promettre à son propre nom, pas au nom d’un autre', async () => {
    const pledge = await insert(contributor, { kind: 'pledge', member: contributor });
    expect(pledge.member_id).toBe(contributor);
    await expect(insert(contributor, { kind: 'pledge', member: other })).rejects.toMatchObject(
      DENIED,
    );
    await expect(insert(contributor, { kind: 'pledge' })).rejects.toMatchObject(DENIED);
  });

  it('réserve les cotisations reçues, dépenses et annulations au trésorier et plus', async () => {
    await expect(insert(contributor, { kind: 'receipt' })).rejects.toMatchObject(DENIED);
    await expect(insert(contributor, { kind: 'expense' })).rejects.toMatchObject(DENIED);
    await expect(insert(viewer, { kind: 'pledge', member: viewer })).rejects.toMatchObject(DENIED);
    const receipt = await insert(treasurer, { kind: 'receipt', member: contributor });
    await insert(owner, { kind: 'expense', party: 'Traiteur' });
    await expect(
      insert(contributor, { kind: 'reversal', reverses: receipt.id }),
    ).rejects.toMatchObject(DENIED);
  });

  it('exige un moyen de paiement pour une cotisation reçue ou une dépense', async () => {
    await expect(insert(treasurer, { kind: 'receipt', method: null })).rejects.toMatchObject({
      code: '23514',
    });
  });

  it('refuse un membre lié qui n’appartient pas au dossier', async () => {
    await expect(insert(treasurer, { kind: 'receipt', member: stranger })).rejects.toMatchObject({
      code: 'TL003',
    });
  });

  it('impose l’auteur de la ligne', async () => {
    const entry = await insert(treasurer, { kind: 'expense' });
    const { rows } = await db.query<{ created_by: string }>(
      'select created_by from ledger_entry where id = $1',
      [entry.id],
    );
    expect(rows[0]!.created_by).toBe(treasurer);
  });
});

describe('ledger_entry : ajout seul', () => {
  it('refuse toute modification ou suppression, même au propriétaire', async () => {
    const entry = await insert(owner, { kind: 'expense' });
    await expect(
      asUser(db, owner, () =>
        db.query('update ledger_entry set amount = 1 where id = $1', [entry.id]),
      ),
    ).rejects.toMatchObject(DENIED);
    await expect(
      asUser(db, owner, () => db.query('delete from ledger_entry where id = $1', [entry.id])),
    ).rejects.toMatchObject(DENIED);
  });
});

describe('ledger_entry : annulations', () => {
  it('reprend le montant, le nom et le membre de la ligne annulée', async () => {
    const receipt = await insert(treasurer, {
      kind: 'receipt',
      amount: 50_000,
      party: 'Cousine Léa',
      member: contributor,
    });
    const reversal = await insert(treasurer, {
      kind: 'reversal',
      reverses: receipt.id,
      amount: 1,
      party: 'autre',
    });
    expect(reversal).toMatchObject({
      amount: 50_000,
      party_name: 'Cousine Léa',
      member_id: contributor,
    });
  });

  it('refuse d’annuler deux fois, d’annuler une annulation ou une ligne d’un autre dossier', async () => {
    const expense = await insert(treasurer, { kind: 'expense' });
    const reversal = await insert(treasurer, { kind: 'reversal', reverses: expense.id });
    await expect(
      insert(treasurer, { kind: 'reversal', reverses: expense.id }),
    ).rejects.toMatchObject({ code: '23505' });
    await expect(
      insert(treasurer, { kind: 'reversal', reverses: reversal.id }),
    ).rejects.toMatchObject({ code: 'TL001' });
    await addMember(treasurer, 'treasurer', otherDossierId);
    const foreign = await insert(treasurer, { kind: 'expense', dossier: otherDossierId });
    await expect(
      insert(treasurer, { kind: 'reversal', reverses: foreign.id }),
    ).rejects.toMatchObject({ code: 'TL001' });
  });
});

describe('ledger_entry : promesses honorées', () => {
  it('lie une cotisation reçue à une promesse ouverte et y recopie le membre', async () => {
    const pledge = await insert(contributor, { kind: 'pledge', member: contributor });
    const receipt = await insert(treasurer, { kind: 'receipt', pledge: pledge.id });
    expect(receipt.member_id).toBe(contributor);
    await expect(insert(treasurer, { kind: 'receipt', pledge: pledge.id })).rejects.toMatchObject({
      code: 'TL002',
    });
    await insert(treasurer, { kind: 'reversal', reverses: receipt.id });
    await insert(treasurer, { kind: 'receipt', pledge: pledge.id });
  });

  it('refuse une promesse annulée ou une ligne qui n’est pas une promesse', async () => {
    const pledge = await insert(contributor, { kind: 'pledge', member: contributor });
    await insert(treasurer, { kind: 'reversal', reverses: pledge.id });
    await expect(insert(treasurer, { kind: 'receipt', pledge: pledge.id })).rejects.toMatchObject({
      code: 'TL002',
    });
    const expense = await insert(treasurer, { kind: 'expense' });
    await expect(insert(treasurer, { kind: 'receipt', pledge: expense.id })).rejects.toMatchObject({
      code: 'TL002',
    });
  });
});

describe('ledger_entry : idempotence', () => {
  it('refuse une seconde ligne avec la même clé dans le dossier', async () => {
    const key = randomUUID();
    await insert(treasurer, { kind: 'expense', key });
    await expect(insert(treasurer, { kind: 'expense', key })).rejects.toMatchObject({
      code: '23505',
    });
  });
});

describe('visibilité des lignes', () => {
  let fresh: string;
  let ownReceipt: string;
  let othersReceipt: string;
  let expense: string;
  let ownReversal: string;

  beforeAll(async () => {
    fresh = await createDossier(owner);
    for (const [user, role] of [
      [treasurer, 'treasurer'],
      [contributor, 'contributor'],
      [other, 'contributor'],
      [viewer, 'viewer'],
    ] as const) {
      await addMember(user, role, fresh);
    }
    ownReceipt = (await insert(treasurer, { kind: 'receipt', member: contributor, dossier: fresh }))
      .id;
    othersReceipt = (await insert(treasurer, { kind: 'receipt', member: other, dossier: fresh }))
      .id;
    expense = (await insert(treasurer, { kind: 'expense', dossier: fresh })).id;
    ownReversal = (
      await insert(treasurer, { kind: 'reversal', reverses: ownReceipt, dossier: fresh })
    ).id;
  });

  const idsIn = async (userId: string) => {
    const { rows } = await asUser(db, userId, () =>
      db.query<{ id: string }>('select id from ledger_entry where dossier_id = $1', [fresh]),
    );
    return rows.map((r) => r.id).sort();
  };

  it('montre tout au trésorier, et en mode restreint seulement ses lignes et les dépenses', async () => {
    expect(await idsIn(treasurer)).toEqual(
      [ownReceipt, othersReceipt, expense, ownReversal].sort(),
    );
    expect(await idsIn(contributor)).toEqual([ownReceipt, expense, ownReversal].sort());
    expect(await idsIn(viewer)).toEqual([expense]);
    expect(await idsIn(stranger)).toEqual([]);
  });

  it('montre tout aux membres quand le propriétaire ouvre la visibilité', async () => {
    await expect(
      asUser(db, treasurer, () =>
        db.query(
          `insert into dossier_finance (dossier_id, amounts_visibility) values ($1, 'members')`,
          [fresh],
        ),
      ),
    ).rejects.toMatchObject(DENIED);
    await asUser(db, owner, () =>
      db.query(
        `insert into dossier_finance (dossier_id, amounts_visibility) values ($1, 'members')`,
        [fresh],
      ),
    );
    expect(await idsIn(viewer)).toEqual([ownReceipt, othersReceipt, expense, ownReversal].sort());
    await asUser(db, owner, () =>
      db.query(
        `update dossier_finance set amounts_visibility = 'restricted' where dossier_id = $1`,
        [fresh],
      ),
    );
    expect(await idsIn(viewer)).toEqual([expense]);
  });
});

describe('ledger_totals', () => {
  it('renvoie reçu, promis non versé et dépensé, annulations déduites', async () => {
    const fresh = await createDossier(owner);
    await addMember(treasurer, 'treasurer', fresh);
    await addMember(contributor, 'contributor', fresh);
    await addMember(viewer, 'viewer', fresh);
    await insert(contributor, {
      kind: 'pledge',
      member: contributor,
      amount: 30_000,
      dossier: fresh,
    });
    const honoured = await insert(contributor, {
      kind: 'pledge',
      member: contributor,
      amount: 20_000,
      dossier: fresh,
    });
    await insert(treasurer, {
      kind: 'receipt',
      amount: 20_000,
      pledge: honoured.id,
      dossier: fresh,
    });
    await insert(treasurer, { kind: 'receipt', amount: 100_000, dossier: fresh });
    const cancelled = await insert(treasurer, { kind: 'receipt', amount: 5_000, dossier: fresh });
    await insert(treasurer, { kind: 'reversal', reverses: cancelled.id, dossier: fresh });
    await insert(treasurer, { kind: 'expense', amount: 40_000, dossier: fresh });
    // WHY: un lecteur ne voit que les dépenses, mais reçoit les mêmes totaux.
    expect(await totals(viewer, fresh)).toEqual({
      received: 120_000,
      pledgedOpen: 30_000,
      spent: 40_000,
    });
  });

  it('refuse un non-membre et un visiteur anonyme', async () => {
    await expect(totals(stranger)).rejects.toMatchObject(DENIED);
    await expect(
      asRole(db, 'anon', null, () =>
        db.query('select * from public.ledger_totals($1)', [dossierId]),
      ),
    ).rejects.toMatchObject(DENIED);
  });
});

describe('dossier_finance', () => {
  it('laisse tout membre lire le réglage et seul le propriétaire le changer', async () => {
    await asUser(db, owner, () =>
      db.query(
        `insert into dossier_finance (dossier_id, amounts_visibility) values ($1, 'members')
         on conflict (dossier_id) do update set amounts_visibility = excluded.amounts_visibility`,
        [dossierId],
      ),
    );
    const { rows } = await asUser(db, viewer, () =>
      db.query<{ amounts_visibility: string }>(
        'select amounts_visibility from dossier_finance where dossier_id = $1',
        [dossierId],
      ),
    );
    expect(rows[0]?.amounts_visibility).toBe('members');
    const result = await asUser(db, treasurer, () =>
      db.query(
        `update dossier_finance set amounts_visibility = 'restricted' where dossier_id = $1`,
        [dossierId],
      ),
    );
    expect(result.affectedRows ?? 0).toBe(0);
    await expect(
      asUser(db, owner, () =>
        db.query('delete from dossier_finance where dossier_id = $1', [dossierId]),
      ),
    ).rejects.toMatchObject(DENIED);
  });

  it('refuse une valeur de visibilité inconnue', async () => {
    await expect(
      asUser(db, owner, () =>
        db.query(`update dossier_finance set amounts_visibility = 'public' where dossier_id = $1`, [
          dossierId,
        ]),
      ),
    ).rejects.toMatchObject({ code: '23514' });
  });
});
```

- [ ] **Étape 2 : lancer le test**

Run: `pnpm --filter @testimona/supabase test -- ledger`
Expected: FAIL (`relation "ledger_entry" does not exist`).

- [ ] **Étape 3 : écrire la migration**

`supabase/migrations/20261027000600_ledger.sql` :

```sql
-- ============================================================================
-- Lot 2 · PR 2 — registre des cotisations et des dépenses.
--
-- WHY (choix assumés) :
--  - registre en ajout seul : aucune modification ni suppression ; une erreur se
--    corrige par une ligne « reversal » qui annule une ligne existante ;
--  - le trigger impose l'auteur, recopie dans une annulation le montant, le nom et
--    le membre de la ligne visée, et vérifie promesses et membres liés ;
--  - la RLS de lecture dépend du réglage de visibilité du dossier ; une
--    annulation porte le type de la ligne visée (reverses_kind) pour éviter une
--    politique qui relirait sa propre table ;
--  - les totaux passent par ledger_totals, qui ne renvoie que des sommes : tout
--    membre les voit, même quand les lignes individuelles lui sont masquées.
-- ============================================================================

create table public.dossier_finance (
  dossier_id uuid primary key references public.dossier (id) on delete cascade,
  amounts_visibility text not null default 'restricted'
    check (amounts_visibility in ('restricted', 'members')),
  updated_at timestamptz not null default now()
);

alter table public.dossier_finance enable row level security;
revoke all on public.dossier_finance from anon;
revoke delete, truncate, trigger, references on public.dossier_finance from authenticated;

create policy dossier_finance_select on public.dossier_finance
  for select to authenticated
  using (public.is_dossier_member(dossier_id));

create policy dossier_finance_insert on public.dossier_finance
  for insert to authenticated
  with check (public.is_dossier_member(dossier_id, 'owner'));

create policy dossier_finance_update on public.dossier_finance
  for update to authenticated
  using (public.is_dossier_member(dossier_id, 'owner'))
  with check (public.is_dossier_member(dossier_id, 'owner'));

-- ---------------------------------------------------------------------------
-- ledger_entry : une ligne par promesse, cotisation reçue, dépense ou annulation
-- ---------------------------------------------------------------------------
create table public.ledger_entry (
  id uuid primary key default gen_random_uuid(),
  dossier_id uuid not null references public.dossier (id) on delete cascade,
  kind text not null check (kind in ('pledge', 'receipt', 'expense', 'reversal')),
  amount integer not null check (amount between 1 and 100000000),
  method text check (
    method in ('cash', 'airtel_money', 'moov_money', 'transfer', 'card', 'other')
  ),
  party_name text not null check (char_length(party_name) between 1 and 120),
  member_id uuid references auth.users (id) on delete set null,
  pledge_id uuid references public.ledger_entry (id),
  note text not null default '' check (char_length(note) <= 500),
  occurred_on date not null default current_date,
  reverses_id uuid unique references public.ledger_entry (id),
  reverses_kind text check (reverses_kind in ('pledge', 'receipt', 'expense')),
  idempotency_key uuid not null,
  created_by uuid not null default auth.uid() references auth.users (id),
  created_at timestamptz not null default now(),
  unique (dossier_id, idempotency_key),
  check ((kind = 'reversal') = (reverses_id is not null)),
  check ((kind = 'reversal') = (reverses_kind is not null)),
  check (pledge_id is null or kind = 'receipt'),
  check (kind in ('pledge', 'reversal') or method is not null)
);

create index ledger_entry_dossier_idx on public.ledger_entry (dossier_id, occurred_on desc);
create index ledger_entry_member_idx on public.ledger_entry (member_id);
create index ledger_entry_pledge_idx on public.ledger_entry (pledge_id);
create index ledger_entry_created_by_idx on public.ledger_entry (created_by);

-- WHY: security definer pour lire la ligne visée ou la promesse quelle que soit la
-- RLS du lecteur ; search_path vide contre le détournement de schéma.
create function public.ledger_entry_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_target public.ledger_entry;
begin
  new.created_by := auth.uid();
  new.created_at := now();

  if new.kind = 'reversal' then
    select * into v_target from public.ledger_entry where id = new.reverses_id;
    if not found or v_target.dossier_id <> new.dossier_id or v_target.kind = 'reversal' then
      raise exception 'invalid reversal' using errcode = 'TL001';
    end if;
    new.amount := v_target.amount;
    new.party_name := v_target.party_name;
    new.member_id := v_target.member_id;
    new.reverses_kind := v_target.kind;
    new.method := null;
    new.pledge_id := null;
    return new;
  end if;
  new.reverses_kind := null;

  if new.pledge_id is not null then
    select * into v_target from public.ledger_entry where id = new.pledge_id;
    if not found
      or v_target.dossier_id <> new.dossier_id
      or v_target.kind <> 'pledge'
      or exists (select 1 from public.ledger_entry r where r.reverses_id = v_target.id)
      or exists (
        select 1 from public.ledger_entry rc
         where rc.pledge_id = v_target.id
           and rc.kind = 'receipt'
           and not exists (select 1 from public.ledger_entry rv where rv.reverses_id = rc.id)
      )
    then
      raise exception 'invalid pledge' using errcode = 'TL002';
    end if;
    -- WHY: le membre qui a promis doit voir sa cotisation, même en mode restreint.
    new.member_id := coalesce(new.member_id, v_target.member_id);
  end if;

  if new.member_id is not null and not exists (
    select 1 from public.dossier_member m
     where m.dossier_id = new.dossier_id and m.user_id = new.member_id
  ) then
    raise exception 'invalid member' using errcode = 'TL003';
  end if;
  return new;
end;
$$;

create trigger ledger_entry_before_insert
  before insert on public.ledger_entry
  for each row execute function public.ledger_entry_before_insert();

revoke execute on function public.ledger_entry_before_insert() from public, anon, authenticated;

alter table public.ledger_entry enable row level security;
revoke all on public.ledger_entry from anon;
revoke update, delete, truncate, trigger, references on public.ledger_entry from authenticated;

create policy ledger_entry_select on public.ledger_entry
  for select to authenticated
  using (
    public.is_dossier_member(dossier_id, 'treasurer')
    or (
      public.is_dossier_member(dossier_id)
      and (
        exists (
          select 1 from public.dossier_finance f
           where f.dossier_id = ledger_entry.dossier_id and f.amounts_visibility = 'members'
        )
        or kind = 'expense'
        or reverses_kind = 'expense'
        or member_id = auth.uid()
      )
    )
  );

create policy ledger_entry_insert on public.ledger_entry
  for insert to authenticated
  with check (
    public.is_dossier_member(dossier_id, 'treasurer')
    or (
      kind = 'pledge'
      and member_id = auth.uid()
      and public.is_dossier_member(dossier_id, 'contributor')
    )
  );

-- ---------------------------------------------------------------------------
-- Totaux du registre, sommes seulement, pour tout membre du dossier.
-- ---------------------------------------------------------------------------
create function public.ledger_totals(p_dossier_id uuid)
returns table (received bigint, pledged_open bigint, spent bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if not public.is_dossier_member(p_dossier_id) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  return query
  with active as (
    select e.id, e.kind, e.amount, e.pledge_id
      from public.ledger_entry e
     where e.dossier_id = p_dossier_id
       and e.kind <> 'reversal'
       and not exists (select 1 from public.ledger_entry r where r.reverses_id = e.id)
  )
  select
    (select coalesce(sum(a.amount), 0)::bigint from active a where a.kind = 'receipt'),
    (select coalesce(sum(p.amount), 0)::bigint
       from active p
      where p.kind = 'pledge'
        and not exists (select 1 from active rc where rc.kind = 'receipt' and rc.pledge_id = p.id)),
    (select coalesce(sum(a.amount), 0)::bigint from active a where a.kind = 'expense');
end;
$$;

revoke execute on function public.ledger_totals(uuid) from public, anon;
grant execute on function public.ledger_totals(uuid) to authenticated;
```

- [ ] **Étape 4 : relancer les tests SQL**

Run: `pnpm --filter @testimona/supabase test`
Expected: PASS, dont `migrations.test.ts` (RLS sur toutes les tables). Si un test échoue à cause d'un comportement de PGlite (par exemple l'ordre entre trigger BEFORE et contrôle RLS), corriger au plus juste et l'expliquer dans le rapport ; ne jamais affaiblir une règle de droits pour faire passer un test.

- [ ] **Étape 5 : documenter**

Dans `supabase/README.md` : ajouter au tableau des migrations
`| \`20261027000600_ledger.sql\` | Lot 2 : registre des cotisations et des dépenses, visibilité, totaux |`;
sous « État de la production », dans « Pas encore en production » (créer le bloc s'il n'existe plus) : «`ledger`(lot 2, PR 2) : à appliquer avant de déployer le web de la PR. Après application,`get_advisors`signalera`ledger_totals`comme security definer exécutable par`authenticated` (0029), c'est voulu. »

- [ ] **Étape 6 : commit**

```bash
git add supabase/migrations/20261027000600_ledger.sql supabase/tests/ledger.test.ts supabase/README.md
git commit -m "feat(db): add the append-only contributions ledger"
```

---

### Tâche 2 : schéma des saisies et modèle du registre

**Files:**

- Modify: `apps/web/src/modules/budget/scenarios.ts` (ajout `envisagedTotal`), `apps/web/src/modules/budget/scenarios.test.ts`
- Create: `apps/web/src/modules/budget/ledger/schema.ts`, `schema.test.ts`, `model.ts`, `model.test.ts`

- [ ] **Étape 1 : écrire les tests (ils échouent)**

À la fin de `apps/web/src/modules/budget/scenarios.test.ts` :

```ts
describe('envisagedTotal', () => {
  it('donne le total du niveau envisagé, ou null sans niveau', () => {
    const withLevel = { ...answers, 'budget.level': 'sober' };
    expect(envisagedTotal(withLevel)).toBe(scenariosFor(attendanceFrom(withLevel)).totals.sober);
    expect(envisagedTotal(answers)).toBeNull();
  });
});
```

(ajouter `envisagedTotal` à l'import depuis `./scenarios` ; `answers` est l'objet de référence déjà défini en tête du fichier).

`apps/web/src/modules/budget/ledger/schema.test.ts` :

```ts
import { describe, expect, it } from 'vitest';
import {
  ExpenseSchema,
  PledgeSchema,
  ReceiptSchema,
  ReversalSchema,
  VisibilitySchema,
} from './schema';

const DOSSIER = '44444444-4444-4444-8444-444444444444';
const KEY = '55555555-5555-4555-8555-555555555555';
const base = {
  dossierId: DOSSIER,
  idempotencyKey: KEY,
  partyName: '  Oncle Paul ',
  amount: '200 000',
  note: '',
  occurredOn: '2026-10-20',
};

describe('schémas du registre', () => {
  it('nettoie le nom et lit un montant saisi avec des espaces', () => {
    expect(PledgeSchema.parse(base)).toMatchObject({ partyName: 'Oncle Paul', amount: 200_000 });
  });

  it('refuse un montant nul, trop grand ou mal formé', () => {
    const issue = (amount: string) =>
      PledgeSchema.safeParse({ ...base, amount }).error?.issues[0]?.message;
    expect(issue('0')).toBe('out of range');
    expect(issue('100000001')).toBe('out of range');
    expect(issue('12,5')).toBe('invalid number');
    expect(issue('')).toBe('invalid number');
  });

  it('refuse une date future ou mal formée, accepte une date vide comme aujourd’hui', () => {
    const issue = (occurredOn: string) =>
      PledgeSchema.safeParse({ ...base, occurredOn }).error?.issues[0]?.message;
    expect(issue('2999-01-01')).toBe('invalid date');
    expect(issue('2026-02-30')).toBe('invalid date');
    expect(PledgeSchema.parse({ ...base, occurredOn: '' }).occurredOn).toMatch(
      /^\d{4}-\d{2}-\d{2}$/,
    );
  });

  it('exige un moyen de paiement connu pour une cotisation reçue ou une dépense', () => {
    expect(ReceiptSchema.safeParse({ ...base, method: 'bitcoin' }).success).toBe(false);
    expect(ExpenseSchema.parse({ ...base, method: 'airtel_money' }).method).toBe('airtel_money');
  });

  it('transforme un membre ou une promesse vide en null', () => {
    const parsed = ReceiptSchema.parse({ ...base, method: 'cash', memberId: '', pledgeId: '' });
    expect(parsed).toMatchObject({ memberId: null, pledgeId: null });
  });

  it('valide une annulation et un réglage de visibilité', () => {
    expect(
      ReversalSchema.safeParse({ dossierId: DOSSIER, idempotencyKey: KEY, entryId: KEY }).success,
    ).toBe(true);
    expect(VisibilitySchema.safeParse({ dossierId: DOSSIER, visibility: 'public' }).success).toBe(
      false,
    );
  });
});
```

`apps/web/src/modules/budget/ledger/model.test.ts` :

```ts
import { describe, expect, it } from 'vitest';
import {
  balance,
  canReverse,
  entryViews,
  openPledges,
  pledgeRemaining,
  remaining,
  type LedgerEntry,
} from './model';

const entry = (over: Partial<LedgerEntry>): LedgerEntry => ({
  id: 'x',
  kind: 'receipt',
  amount: 10_000,
  method: 'cash',
  partyName: 'Oncle Paul',
  memberId: null,
  pledgeId: null,
  note: '',
  occurredOn: '2026-10-20',
  reversesId: null,
  reversesKind: null,
  createdAt: '2026-10-20T10:00:00Z',
  ...over,
});

describe('entryViews', () => {
  it('marque les lignes annulées et les promesses honorées, et trie par date', () => {
    const views = entryViews([
      entry({ id: 'p1', kind: 'pledge', method: null, occurredOn: '2026-10-18' }),
      entry({ id: 'r1', pledgeId: 'p1', occurredOn: '2026-10-19' }),
      entry({ id: 'e1', kind: 'expense', occurredOn: '2026-10-21' }),
      entry({
        id: 'x1',
        kind: 'reversal',
        method: null,
        reversesId: 'e1',
        reversesKind: 'expense',
        occurredOn: '2026-10-21',
        createdAt: '2026-10-21T12:00:00Z',
      }),
    ]);
    expect(views.map((v) => v.id)).toEqual(['x1', 'e1', 'r1', 'p1']);
    expect(views.find((v) => v.id === 'e1')).toMatchObject({ reversed: true });
    expect(views.find((v) => v.id === 'p1')).toMatchObject({ fulfilled: true, reversed: false });
  });

  it('rouvre une promesse dont la cotisation a été annulée', () => {
    const views = entryViews([
      entry({ id: 'p1', kind: 'pledge', method: null }),
      entry({ id: 'r1', pledgeId: 'p1' }),
      entry({
        id: 'x1',
        kind: 'reversal',
        method: null,
        reversesId: 'r1',
        reversesKind: 'receipt',
      }),
    ]);
    expect(views.find((v) => v.id === 'p1')?.fulfilled).toBe(false);
    expect(openPledges(views).map((v) => v.id)).toEqual(['p1']);
  });

  it('cumule les versements partiels d’une promesse', () => {
    const views = entryViews([
      entry({ id: 'p1', kind: 'pledge', method: null, amount: 10_000 }),
      entry({ id: 'r1', pledgeId: 'p1', amount: 4_000 }),
    ]);
    const pledge = views.find((v) => v.id === 'p1')!;
    expect(pledge).toMatchObject({ paid: 4_000, fulfilled: false });
    expect(pledgeRemaining(pledge)).toBe(6_000);
    const paidOff = entryViews([
      entry({ id: 'p1', kind: 'pledge', method: null, amount: 10_000 }),
      entry({ id: 'r1', pledgeId: 'p1', amount: 4_000 }),
      entry({ id: 'r2', pledgeId: 'p1', amount: 6_000 }),
    ]).find((v) => v.id === 'p1')!;
    expect(paidOff).toMatchObject({ paid: 10_000, fulfilled: true });
    expect(pledgeRemaining(paidOff)).toBe(0);
  });
});

describe('canReverse', () => {
  it('n’autorise l’annulation que d’une ligne active qui n’est pas une annulation', () => {
    const views = entryViews([
      entry({ id: 'r1' }),
      entry({
        id: 'x1',
        kind: 'reversal',
        method: null,
        reversesId: 'r1',
        reversesKind: 'receipt',
        createdAt: '2026-10-21T00:00:00Z',
      }),
    ]);
    expect(canReverse(views.find((v) => v.id === 'x1')!)).toBe(false);
    expect(canReverse(views.find((v) => v.id === 'r1')!)).toBe(false);
    expect(canReverse(entryViews([entry({ id: 'e1', kind: 'expense' })])[0]!)).toBe(true);
  });
});

describe('balance et remaining', () => {
  const totals = { received: 120_000, pledgedOpen: 30_000, spent: 40_000 };
  it('calcule le solde et le reste à réunir, jamais négatif', () => {
    expect(balance(totals)).toBe(80_000);
    expect(remaining(500_000, totals)).toBe(380_000);
    expect(remaining(100_000, totals)).toBe(0);
    expect(remaining(null, totals)).toBeNull();
  });
});
```

- [ ] **Étape 2 : lancer les tests**

Run: `pnpm --filter @testimona/web test -- src/modules/budget`
Expected: FAIL (modules et `envisagedTotal` absents).

- [ ] **Étape 3 : `envisagedTotal`**

À la fin de `apps/web/src/modules/budget/scenarios.ts` :

```ts
/**
 * Total du budget du niveau envisagé à l'étape B.2, ou null sans niveau choisi.
 * WHY: en attendant le scénario retenu par le trésorier (lot 2, PR 3), c'est la référence de
 * l'écran Cotisations et du tableau de bord.
 *
 * @example
 * envisagedTotal(answers); // 2 409 000
 */
export function envisagedTotal(answers: Answers): number | null {
  const level = chosenLevel(answers);
  return level ? scenariosFor(attendanceFrom(answers)).totals[level] : null;
}
```

- [ ] **Étape 4 : schéma**

`apps/web/src/modules/budget/ledger/schema.ts` :

```ts
import { z } from 'zod';
import { AMOUNT_MAX } from '../scenarios';

export const ENTRY_KINDS = ['pledge', 'receipt', 'expense', 'reversal'] as const;
export type EntryKind = (typeof ENTRY_KINDS)[number];

/** Moyens de paiement notés dans le registre (aucun paiement ne passe par Testimona). */
export const ENTRY_METHODS = [
  'cash',
  'airtel_money',
  'moov_money',
  'transfer',
  'card',
  'other',
] as const;
export type EntryMethod = (typeof ENTRY_METHODS)[number];

export const VISIBILITIES = ['restricted', 'members'] as const;
export type Visibility = (typeof VISIBILITIES)[number];

// WHY: text refuse le caractère NUL ; on le refuse avant la base.
const noNul = (s: string) => !s.includes('\u0000');

const uuid = z.string().uuid();

// WHY: un montant se saisit souvent avec des espaces (« 200 000 ») ; on ne retire que ceux-là.
const amount = z
  .string()
  .transform((s) => s.replace(/[\s  ]/g, ''))
  .pipe(z.string().regex(/^\d{1,9}$/, 'invalid number'))
  .transform(Number)
  .pipe(z.number().int().min(1, 'out of range').max(AMOUNT_MAX, 'out of range'));

const partyName = z
  .string()
  .trim()
  .min(1, 'required')
  .max(120, 'too long')
  .refine(noNul, 'invalid character');

const note = z.string().trim().max(500, 'too long').refine(noNul, 'invalid character').default('');

const today = () => new Date().toISOString().slice(0, 10);

// WHY: une date vide vaut aujourd'hui ; un jour de marge couvre les fuseaux horaires.
const occurredOn = z
  .string()
  .optional()
  .transform((s) => (s && s.trim() ? s.trim() : today()))
  .pipe(
    z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'invalid date')
      .refine((s) => {
        const date = new Date(`${s}T00:00:00Z`);
        const max = Date.now() + 24 * 60 * 60 * 1000;
        return (
          !Number.isNaN(date.getTime()) &&
          date.toISOString().slice(0, 10) === s &&
          Number(s.slice(0, 4)) >= 2000 &&
          date.getTime() <= max
        );
      }, 'invalid date'),
  );

const optionalId = z
  .union([uuid, z.literal('')])
  .optional()
  .transform((v) => (v ? v : null));

export const PledgeSchema = z.object({
  dossierId: uuid,
  idempotencyKey: uuid,
  partyName,
  amount,
  note,
  occurredOn,
});
export type PledgeInput = z.infer<typeof PledgeSchema>;

export const ReceiptSchema = PledgeSchema.extend({
  method: z.enum(ENTRY_METHODS),
  memberId: optionalId,
  pledgeId: optionalId,
});
export type ReceiptInput = z.infer<typeof ReceiptSchema>;

export const ExpenseSchema = PledgeSchema.extend({ method: z.enum(ENTRY_METHODS) });
export type ExpenseInput = z.infer<typeof ExpenseSchema>;

export const ReversalSchema = z.object({ dossierId: uuid, idempotencyKey: uuid, entryId: uuid });
export type ReversalInput = z.infer<typeof ReversalSchema>;

export const VisibilitySchema = z.object({ dossierId: uuid, visibility: z.enum(VISIBILITIES) });
export type VisibilityInput = z.infer<typeof VisibilitySchema>;
```

- [ ] **Étape 5 : modèle**

`apps/web/src/modules/budget/ledger/model.ts` :

```ts
import type { EntryKind, EntryMethod } from './schema';

/** Ligne du registre telle que lue en base (ses colonnes utiles à l'écran). */
export interface LedgerEntry {
  id: string;
  kind: EntryKind;
  amount: number;
  method: EntryMethod | null;
  partyName: string;
  memberId: string | null;
  pledgeId: string | null;
  note: string;
  occurredOn: string;
  reversesId: string | null;
  reversesKind: Exclude<EntryKind, 'reversal'> | null;
  createdAt: string;
}

/**
 * Ligne prête à afficher : annulée ou non ; pour une promesse, montant déjà versé (`paid`) et
 * soldée (`fulfilled`) quand les versements liés atteignent le montant promis.
 */
export interface EntryView extends LedgerEntry {
  reversed: boolean;
  paid: number;
  fulfilled: boolean;
}

export interface LedgerTotals {
  received: number;
  pledgedOpen: number;
  spent: number;
}

/**
 * Lignes visibles, du plus récent au plus ancien, avec leur état.
 * WHY: l'état se déduit des autres lignes (annulations, cotisations liées) ; en mode restreint,
 * un membre ne voit que ses lignes, ce qui suffit pour ses propres promesses.
 *
 * @example
 * entryViews(entries).filter((v) => !v.reversed);
 */
export function entryViews(entries: readonly LedgerEntry[]): EntryView[] {
  const reversedIds = new Set(
    entries.filter((e) => e.kind === 'reversal' && e.reversesId).map((e) => e.reversesId),
  );
  // WHY: une promesse se paie parfois en plusieurs fois ; on cumule les versements actifs liés.
  const paidByPledge = new Map<string, number>();
  for (const e of entries) {
    if (e.kind === 'receipt' && e.pledgeId && !reversedIds.has(e.id)) {
      paidByPledge.set(e.pledgeId, (paidByPledge.get(e.pledgeId) ?? 0) + e.amount);
    }
  }
  return entries
    .map((e) => {
      const paid = e.kind === 'pledge' ? (paidByPledge.get(e.id) ?? 0) : 0;
      return {
        ...e,
        reversed: reversedIds.has(e.id),
        paid,
        fulfilled: e.kind === 'pledge' && paid >= e.amount,
      };
    })
    .sort(
      (a, b) => b.occurredOn.localeCompare(a.occurredOn) || b.createdAt.localeCompare(a.createdAt),
    );
}

/** Promesses encore attendues (ni annulées, ni soldées). */
export function openPledges(views: readonly EntryView[]): EntryView[] {
  return views.filter((v) => v.kind === 'pledge' && !v.reversed && !v.fulfilled);
}

/** Ce qu'il reste à verser sur une promesse, jamais négatif. */
export function pledgeRemaining(view: EntryView): number {
  return Math.max(0, view.amount - view.paid);
}

/** Une ligne active qui n'est pas elle-même une annulation peut être annulée. */
export function canReverse(view: EntryView): boolean {
  return view.kind !== 'reversal' && !view.reversed;
}

/** Argent disponible : reçu moins dépensé. */
export function balance(totals: LedgerTotals): number {
  return totals.received - totals.spent;
}

/** Ce qu'il reste à réunir pour atteindre le budget, ou null sans budget. */
export function remaining(budget: number | null, totals: LedgerTotals): number | null {
  return budget === null ? null : Math.max(0, budget - totals.received);
}
```

- [ ] **Étape 6 : relancer les tests**

Run: `pnpm --filter @testimona/web test -- src/modules/budget && pnpm --filter @testimona/web typecheck`
Expected: PASS.

- [ ] **Étape 7 : commit**

```bash
git add apps/web/src/modules/budget
git commit -m "feat(budget): add the ledger input schemas and view model"
```

---

### Tâche 3 : dépôt, service et actions du registre

**Files:**

- Create: `apps/web/src/modules/budget/ledger/repo.ts`, `service.ts`, `service.test.ts`, `actions.ts`

- [ ] **Étape 1 : écrire le test du service (il échoue)**

`apps/web/src/modules/budget/ledger/service.test.ts` :

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

// WHY: vi.mock est remonté en tête de fichier ; les doublures sont créées avec vi.hoisted.
const { ledgerRepo, dossierRepo } = vi.hoisted(() => ({
  ledgerRepo: { insertEntry: vi.fn(), setVisibility: vi.fn() },
  dossierRepo: { getDossier: vi.fn() },
}));

vi.mock('server-only', () => ({}));
vi.mock('./repo', () => ledgerRepo);
vi.mock('@/modules/dossier/repo', () => dossierRepo);
vi.mock('@/lib/email/resend', () => ({ sendEmail: vi.fn(), dossierInviteEmail: vi.fn() }));

const { recordExpense, recordPledge, recordReceipt, reverseEntry, setVisibility } =
  await import('./service');

const DOSSIER = '44444444-4444-4444-8444-444444444444';
const USER = '66666666-6666-4666-8666-666666666666';
const KEY = '55555555-5555-4555-8555-555555555555';
const base = {
  dossierId: DOSSIER,
  idempotencyKey: KEY,
  partyName: 'Oncle Paul',
  amount: '50000',
  note: '',
  occurredOn: '2026-10-20',
};

beforeEach(() => {
  vi.clearAllMocks();
  dossierRepo.getDossier.mockResolvedValue({
    id: DOSSIER,
    title: 'Jean Ndong',
    city: 'Libreville',
    countryCode: 'GA',
    entryPoint: 'death',
    createdAt: '2026-10-27T00:00:00Z',
  });
  ledgerRepo.insertEntry.mockResolvedValue({ data: { id: 'e1', duplicate: false }, error: null });
  ledgerRepo.setVisibility.mockResolvedValue({ data: true, error: null });
});

describe('recordPledge', () => {
  it('enregistre une promesse au nom de l’utilisateur courant', async () => {
    expect(await recordPledge(base, USER)).toEqual({ ok: true, data: { id: 'e1' } });
    expect(ledgerRepo.insertEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        dossierId: DOSSIER,
        kind: 'pledge',
        amount: 50_000,
        method: null,
        memberId: USER,
        idempotencyKey: KEY,
      }),
    );
  });

  it('refuse une saisie invalide avec ses erreurs de champ, sans écrire', async () => {
    const res = await recordPledge({ ...base, amount: '0' }, USER);
    expect(res).toMatchObject({
      ok: false,
      error: 'validation',
      fieldErrors: { amount: 'out of range' },
    });
    expect(ledgerRepo.insertEntry).not.toHaveBeenCalled();
  });

  it('refuse un dossier illisible ou une porte sans budget', async () => {
    dossierRepo.getDossier.mockResolvedValueOnce(null);
    expect(await recordPledge(base, USER)).toMatchObject({ ok: false, error: 'not_found' });
    dossierRepo.getDossier.mockResolvedValueOnce({ id: DOSSIER, entryPoint: 'prepare' });
    expect(await recordPledge(base, USER)).toMatchObject({ ok: false, error: 'validation' });
  });
});

describe('recordReceipt et recordExpense', () => {
  it('passe le moyen, le membre et la promesse', async () => {
    await recordReceipt({ ...base, method: 'airtel_money', memberId: USER, pledgeId: KEY });
    expect(ledgerRepo.insertEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'receipt',
        method: 'airtel_money',
        memberId: USER,
        pledgeId: KEY,
      }),
    );
    await recordExpense({ ...base, partyName: 'Traiteur', method: 'cash' });
    expect(ledgerRepo.insertEntry).toHaveBeenLastCalledWith(
      expect.objectContaining({ kind: 'expense', partyName: 'Traiteur', memberId: null }),
    );
  });

  it('traduit les codes de la base', async () => {
    const fail = (code: string) =>
      ledgerRepo.insertEntry.mockResolvedValueOnce({ data: null, error: { code, message: 'x' } });
    fail('42501');
    expect(await recordExpense({ ...base, method: 'cash' })).toMatchObject({ error: 'forbidden' });
    fail('TL002');
    expect(await recordReceipt({ ...base, method: 'cash', pledgeId: KEY })).toMatchObject({
      error: 'pledge_unavailable',
    });
    fail('TL003');
    expect(await recordReceipt({ ...base, method: 'cash', memberId: USER })).toMatchObject({
      error: 'validation',
    });
  });

  it('considère un double envoi comme réussi', async () => {
    ledgerRepo.insertEntry.mockResolvedValueOnce({
      data: { id: 'e9', duplicate: true },
      error: null,
    });
    expect(await recordExpense({ ...base, method: 'cash' })).toEqual({
      ok: true,
      data: { id: 'e9' },
    });
  });
});

describe('reverseEntry', () => {
  it('écrit une annulation qui vise la ligne', async () => {
    await reverseEntry({ dossierId: DOSSIER, idempotencyKey: KEY, entryId: USER });
    expect(ledgerRepo.insertEntry).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'reversal', reversesId: USER, method: null }),
    );
  });

  it('signale une ligne déjà annulée ou invalide', async () => {
    ledgerRepo.insertEntry.mockResolvedValueOnce({
      data: null,
      error: { code: '23505', message: 'x' },
    });
    expect(
      await reverseEntry({ dossierId: DOSSIER, idempotencyKey: KEY, entryId: USER }),
    ).toMatchObject({ error: 'already_reversed' });
    ledgerRepo.insertEntry.mockResolvedValueOnce({
      data: null,
      error: { code: 'TL001', message: 'x' },
    });
    expect(
      await reverseEntry({ dossierId: DOSSIER, idempotencyKey: KEY, entryId: USER }),
    ).toMatchObject({ error: 'validation' });
  });
});

describe('setVisibility', () => {
  it('enregistre le réglage et traduit un refus', async () => {
    expect(await setVisibility({ dossierId: DOSSIER, visibility: 'members' })).toEqual({
      ok: true,
      data: { visibility: 'members' },
    });
    ledgerRepo.setVisibility.mockResolvedValueOnce({
      data: null,
      error: { code: '42501', message: 'x' },
    });
    expect(await setVisibility({ dossierId: DOSSIER, visibility: 'restricted' })).toMatchObject({
      error: 'forbidden',
    });
  });
});
```

- [ ] **Étape 2 : lancer le test**

Run: `pnpm --filter @testimona/web test -- src/modules/budget/ledger/service.test.ts`
Expected: FAIL (modules absents).

- [ ] **Étape 3 : dépôt**

`apps/web/src/modules/budget/ledger/repo.ts` :

```ts
import 'server-only';
import { getSupabaseServer } from '@/lib/supabase/server';
import type { RepoResult } from '@/modules/dossier/repo';
import type { LedgerEntry, LedgerTotals } from './model';
import type { EntryKind, EntryMethod, Visibility } from './schema';

const COLUMNS =
  'id, kind, amount, method, party_name, member_id, pledge_id, note, occurred_on, reverses_id, reverses_kind, created_at';

interface EntryRow {
  id: string;
  kind: EntryKind;
  amount: number;
  method: EntryMethod | null;
  party_name: string;
  member_id: string | null;
  pledge_id: string | null;
  note: string;
  occurred_on: string;
  reverses_id: string | null;
  reverses_kind: LedgerEntry['reversesKind'];
  created_at: string;
}

/** Ligne à insérer ; auteur, dates et champs d'une annulation sont imposés par la base. */
export interface NewEntry {
  dossierId: string;
  kind: EntryKind;
  amount: number;
  method: EntryMethod | null;
  partyName: string;
  memberId: string | null;
  pledgeId: string | null;
  note: string;
  occurredOn: string;
  reversesId: string | null;
  idempotencyKey: string;
}

const toEntry = (r: EntryRow): LedgerEntry => ({
  id: r.id,
  kind: r.kind,
  amount: r.amount,
  method: r.method,
  partyName: r.party_name,
  memberId: r.member_id,
  pledgeId: r.pledge_id,
  note: r.note,
  occurredOn: r.occurred_on,
  reversesId: r.reverses_id,
  reversesKind: r.reverses_kind,
  createdAt: r.created_at,
});

function fail(error: { code?: string; message?: string }) {
  return {
    data: null,
    error: { code: error.code || 'unknown', message: error.message || 'ledger error' },
  };
}

/** Lignes du registre que l'utilisateur peut voir (RLS), les plus récentes d'abord. */
export async function listEntries(dossierId: string): Promise<RepoResult<LedgerEntry[]>> {
  const db = await getSupabaseServer();
  const { data, error } = await db
    .from('ledger_entry')
    .select(COLUMNS)
    .eq('dossier_id', dossierId)
    .order('occurred_on', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(500)
    .returns<EntryRow[]>();
  if (error) {
    console.error('[budget/ledger] listEntries impossible', { code: error.code });
    return fail(error);
  }
  return { data: (data ?? []).map(toEntry), error: null };
}

/**
 * Insère une ligne. Un second envoi avec la même clé d'idempotence renvoie la ligne existante
 * (`duplicate: true`) plutôt qu'une erreur.
 */
export async function insertEntry(
  entry: NewEntry,
): Promise<RepoResult<{ id: string; duplicate: boolean }>> {
  const db = await getSupabaseServer();
  const { data, error } = await db
    .from('ledger_entry')
    .insert({
      dossier_id: entry.dossierId,
      kind: entry.kind,
      amount: entry.amount,
      method: entry.method,
      party_name: entry.partyName,
      member_id: entry.memberId,
      pledge_id: entry.pledgeId,
      note: entry.note,
      occurred_on: entry.occurredOn,
      reverses_id: entry.reversesId,
      idempotency_key: entry.idempotencyKey,
    })
    .select('id')
    .single<{ id: string }>();
  if (!error) return { data: { id: data.id, duplicate: false }, error: null };
  if (error.code === '23505') {
    const existing = await db
      .from('ledger_entry')
      .select('id')
      .eq('dossier_id', entry.dossierId)
      .eq('idempotency_key', entry.idempotencyKey)
      .maybeSingle<{ id: string }>();
    if (existing.data) return { data: { id: existing.data.id, duplicate: true }, error: null };
  }
  return fail(error);
}

/** Sommes du registre (reçu, promis non versé, dépensé), visibles de tout membre. */
export async function getTotals(dossierId: string): Promise<RepoResult<LedgerTotals>> {
  const db = await getSupabaseServer();
  const { data, error } = await db.rpc('ledger_totals', { p_dossier_id: dossierId });
  if (error) {
    console.error('[budget/ledger] getTotals impossible', { code: error.code });
    return fail(error);
  }
  const row = (Array.isArray(data) ? data[0] : data) as
    | { received: number | string; pledged_open: number | string; spent: number | string }
    | undefined;
  return {
    data: {
      received: Number(row?.received ?? 0),
      pledgedOpen: Number(row?.pledged_open ?? 0),
      spent: Number(row?.spent ?? 0),
    },
    error: null,
  };
}

/** Réglage de visibilité du dossier ; `restricted` tant que le propriétaire n'a rien choisi. */
export async function getVisibility(dossierId: string): Promise<RepoResult<Visibility>> {
  const db = await getSupabaseServer();
  const { data, error } = await db
    .from('dossier_finance')
    .select('amounts_visibility')
    .eq('dossier_id', dossierId)
    .maybeSingle<{ amounts_visibility: Visibility }>();
  if (error) {
    console.error('[budget/ledger] getVisibility impossible', { code: error.code });
    return fail(error);
  }
  return { data: data?.amounts_visibility ?? 'restricted', error: null };
}

/** Change le réglage de visibilité (propriétaire seulement, vérifié par la RLS). */
export async function setVisibility(
  dossierId: string,
  visibility: Visibility,
): Promise<RepoResult<true>> {
  const db = await getSupabaseServer();
  const { error } = await db.from('dossier_finance').upsert(
    {
      dossier_id: dossierId,
      amounts_visibility: visibility,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'dossier_id' },
  );
  if (error) return fail(error);
  return { data: true, error: null };
}
```

Note : avec un upsert, PostgREST fait un INSERT … ON CONFLICT DO UPDATE ; un non-propriétaire est refusé (42501) par la policy d'insertion. L'écran relit la valeur après l'action.

- [ ] **Étape 4 : service**

`apps/web/src/modules/budget/ledger/service.ts` :

```ts
import 'server-only';
import type { z } from 'zod';
import { isStepOpen } from '@/journey/registry';
import { getDossier } from '@/modules/dossier/repo';
import { fieldErrors } from '@/modules/dossier/service';
import * as repo from './repo';
import type { NewEntry } from './repo';
import {
  ExpenseSchema,
  PledgeSchema,
  ReceiptSchema,
  ReversalSchema,
  VisibilitySchema,
  type Visibility,
} from './schema';

export type LedgerError =
  | 'validation'
  | 'forbidden'
  | 'not_found'
  | 'unauthenticated'
  | 'already_reversed'
  | 'pledge_unavailable'
  | 'unknown';

export type LedgerResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: LedgerError; fieldErrors?: Record<string, string> };

const CODES: Record<string, LedgerError> = {
  '42501': 'forbidden',
  '28000': 'unauthenticated',
  '23514': 'validation',
  '22P02': 'validation',
  '23503': 'validation',
  // WHY: hors double envoi (géré par le dépôt), une unicité violée vise une annulation.
  '23505': 'already_reversed',
  TL001: 'validation',
  TL002: 'pledge_unavailable',
  TL003: 'validation',
};

function fromRepo(error: { code: string }, scope: string): { ok: false; error: LedgerError } {
  const mapped = CODES[error.code];
  if (!mapped) console.error(`[budget/ledger] ${scope} failed`, { code: error.code });
  return { ok: false, error: mapped ?? 'unknown' };
}

function invalid(error: z.ZodError): {
  ok: false;
  error: LedgerError;
  fieldErrors: Record<string, string>;
} {
  return { ok: false, error: 'validation', fieldErrors: fieldErrors(error.issues) };
}

/** Le registre n'existe que pour un dossier lisible ouvert au budget (porte « décès »). */
async function checkDossier(dossierId: string): Promise<LedgerError | null> {
  const dossier = await getDossier(dossierId);
  if (!dossier) return 'not_found';
  return isStepOpen(dossier.entryPoint, 'attendance') ? null : 'validation';
}

async function write(entry: NewEntry, scope: string): Promise<LedgerResult<{ id: string }>> {
  const blocked = await checkDossier(entry.dossierId);
  if (blocked) return { ok: false, error: blocked };
  const res = await repo.insertEntry(entry);
  if (res.error) return fromRepo(res.error, scope);
  return { ok: true, data: { id: res.data.id } };
}

/**
 * Promesse de l'utilisateur courant (contributeur et plus, vérifié par la RLS).
 *
 * @example
 * await recordPledge({ dossierId, idempotencyKey, partyName: 'Awa', amount: '50 000' }, userId);
 */
export async function recordPledge(raw: unknown, userId: string) {
  const input = PledgeSchema.safeParse(raw);
  if (!input.success) return invalid(input.error);
  const { dossierId, idempotencyKey, partyName, amount, note, occurredOn } = input.data;
  return write(
    {
      dossierId,
      kind: 'pledge',
      amount,
      method: null,
      partyName,
      memberId: userId,
      pledgeId: null,
      note,
      occurredOn,
      reversesId: null,
      idempotencyKey,
    },
    'recordPledge',
  );
}

/** Cotisation reçue (trésorier et plus), liée ou non à un membre et à une promesse. */
export async function recordReceipt(raw: unknown) {
  const input = ReceiptSchema.safeParse(raw);
  if (!input.success) return invalid(input.error);
  const d = input.data;
  return write(
    {
      dossierId: d.dossierId,
      kind: 'receipt',
      amount: d.amount,
      method: d.method,
      partyName: d.partyName,
      memberId: d.memberId,
      pledgeId: d.pledgeId,
      note: d.note,
      occurredOn: d.occurredOn,
      reversesId: null,
      idempotencyKey: d.idempotencyKey,
    },
    'recordReceipt',
  );
}

/** Dépense (trésorier et plus) ; `partyName` est le fournisseur. */
export async function recordExpense(raw: unknown) {
  const input = ExpenseSchema.safeParse(raw);
  if (!input.success) return invalid(input.error);
  const d = input.data;
  return write(
    {
      dossierId: d.dossierId,
      kind: 'expense',
      amount: d.amount,
      method: d.method,
      partyName: d.partyName,
      memberId: null,
      pledgeId: null,
      note: d.note,
      occurredOn: d.occurredOn,
      reversesId: null,
      idempotencyKey: d.idempotencyKey,
    },
    'recordExpense',
  );
}

/**
 * Annule une ligne (trésorier et plus) : la base recopie montant, nom et membre.
 * WHY: les valeurs envoyées ici sont des valeurs de remplissage, remplacées par le trigger.
 */
export async function reverseEntry(raw: unknown) {
  const input = ReversalSchema.safeParse(raw);
  if (!input.success) return invalid(input.error);
  const { dossierId, idempotencyKey, entryId } = input.data;
  return write(
    {
      dossierId,
      kind: 'reversal',
      amount: 1,
      method: null,
      partyName: '-',
      memberId: null,
      pledgeId: null,
      note: '',
      occurredOn: new Date().toISOString().slice(0, 10),
      reversesId: entryId,
      idempotencyKey,
    },
    'reverseEntry',
  );
}

/** Réglage de visibilité des montants individuels (propriétaire seulement). */
export async function setVisibility(
  raw: unknown,
): Promise<LedgerResult<{ visibility: Visibility }>> {
  const input = VisibilitySchema.safeParse(raw);
  if (!input.success) return invalid(input.error);
  const blocked = await checkDossier(input.data.dossierId);
  if (blocked) return { ok: false, error: blocked };
  const res = await repo.setVisibility(input.data.dossierId, input.data.visibility);
  if (res.error) return fromRepo(res.error, 'setVisibility');
  return { ok: true, data: { visibility: input.data.visibility } };
}
```

Note : le dépôt n'envoie pas `reverses_kind` ; le trigger le remplit pour une annulation (la contrainte l'exige alors) et le force à null sinon.

- [ ] **Étape 5 : actions**

`apps/web/src/modules/budget/ledger/actions.ts` :

```ts
'use server';

import { revalidatePath } from 'next/cache';
import { getLocale } from 'next-intl/server';
import { localizedPath } from '@/lib/auth/redirect-target';
import { getCurrentUser } from '@/lib/supabase/server';
import * as service from './service';
import type { LedgerError } from './service';

export interface LedgerFormState {
  ok?: boolean;
  error?: LedgerError;
  fieldErrors?: Record<string, string>;
}

const field = (formData: FormData, name: string) => String(formData.get(name) ?? '');

const entryFields = (formData: FormData) => ({
  dossierId: field(formData, 'dossierId'),
  idempotencyKey: field(formData, 'idempotencyKey'),
  partyName: field(formData, 'partyName'),
  amount: field(formData, 'amount'),
  note: field(formData, 'note'),
  occurredOn: field(formData, 'occurredOn'),
});

async function done(
  dossierId: string,
  res: { ok: boolean; error?: LedgerError; fieldErrors?: Record<string, string> },
): Promise<LedgerFormState> {
  if (!res.ok) return { error: res.error, fieldErrors: res.fieldErrors };
  const locale = await getLocale();
  revalidatePath(localizedPath(`/dossier/${dossierId}/cotisations`, locale));
  revalidatePath(localizedPath(`/dossier/${dossierId}`, locale));
  return { ok: true };
}

/** Ajoute une ligne au registre selon `kind` (promesse, cotisation reçue ou dépense). */
export async function saveEntryAction(
  _prev: LedgerFormState | null,
  formData: FormData,
): Promise<LedgerFormState> {
  const user = await getCurrentUser();
  if (!user) return { error: 'unauthenticated' };
  const base = entryFields(formData);
  const kind = field(formData, 'kind');
  const method = field(formData, 'method');
  const res =
    kind === 'pledge'
      ? await service.recordPledge(base, user.id)
      : kind === 'receipt'
        ? await service.recordReceipt({
            ...base,
            method,
            memberId: field(formData, 'memberId'),
            pledgeId: field(formData, 'pledgeId'),
          })
        : kind === 'expense'
          ? await service.recordExpense({ ...base, method })
          : ({ ok: false, error: 'validation' } as const);
  return done(base.dossierId, res);
}

/** Annule une ligne du registre. */
export async function reverseEntryAction(
  _prev: LedgerFormState | null,
  formData: FormData,
): Promise<LedgerFormState> {
  if (!(await getCurrentUser())) return { error: 'unauthenticated' };
  const dossierId = field(formData, 'dossierId');
  const res = await service.reverseEntry({
    dossierId,
    idempotencyKey: field(formData, 'idempotencyKey'),
    entryId: field(formData, 'entryId'),
  });
  return done(dossierId, res);
}

/** Change la visibilité des montants individuels. */
export async function setVisibilityAction(
  _prev: LedgerFormState | null,
  formData: FormData,
): Promise<LedgerFormState> {
  if (!(await getCurrentUser())) return { error: 'unauthenticated' };
  const dossierId = field(formData, 'dossierId');
  const res = await service.setVisibility({ dossierId, visibility: field(formData, 'visibility') });
  return done(dossierId, res);
}
```

- [ ] **Étape 6 : relancer**

Run: `pnpm --filter @testimona/web test -- src/modules/budget && pnpm --filter @testimona/web typecheck && pnpm --filter @testimona/web lint`
Expected: PASS. Vérifier que `fieldErrors` est bien exporté par `apps/web/src/modules/dossier/service.ts` et que `getCurrentUser` renvoie un objet avec `id` ; adapter les imports au code réel si besoin (et le `vi.mock` de `@/lib/email/resend` si `service.ts` du dossier en a besoin à l'import).

- [ ] **Étape 7 : commit**

```bash
git add apps/web/src/modules/budget/ledger
git commit -m "feat(budget): add the ledger repository, service and actions"
```

---

### Tâche 4 : textes du registre

**Files:**

- Modify: `apps/web/messages/fr.json`, `apps/web/messages/en.json` (nouvel espace `ledger`)
- Create: `apps/web/src/modules/budget/ledger/messages.test.ts`

- [ ] **Étape 1 : écrire la garde (elle échoue)**

`apps/web/src/modules/budget/ledger/messages.test.ts` :

```ts
import { describe, expect, it } from 'vitest';
import en from '../../../../messages/en.json';
import fr from '../../../../messages/fr.json';
import { ENTRY_KINDS, ENTRY_METHODS, VISIBILITIES } from './schema';

const get = (messages: unknown, path: string): unknown =>
  path
    .split('.')
    .reduce<unknown>(
      (node, part) =>
        node && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined,
      messages,
    );
const isFilled = (value: unknown) => typeof value === 'string' && value.trim() !== '';

const PATHS = [
  ...ENTRY_KINDS.map((k) => `ledger.kind.${k}`),
  ...ENTRY_METHODS.map((m) => `ledger.method.${m}`),
  ...VISIBILITIES.map((v) => `ledger.visibility.${v}`),
  ...['title', 'intro', 'restrictedNote', 'membersNote', 'empty', 'seeBudget', 'backToDossier'].map(
    (k) => `ledger.page.${k}`,
  ),
  ...['budget', 'budgetNone', 'received', 'pledgedOpen', 'spent', 'balance', 'remaining'].map(
    (k) => `ledger.summary.${k}`,
  ),
  ...[
    'listTitle',
    'reversed',
    'fulfilled',
    'partlyPaid',
    'reversalOf',
    'reverse',
    'confirmReverse',
    'keep',
  ].map((k) => `ledger.entry.${k}`),
  ...[
    'pledgeTitle',
    'receiptTitle',
    'expenseTitle',
    'party',
    'supplier',
    'amount',
    'method',
    'member',
    'memberNone',
    'pledge',
    'pledgeNone',
    'date',
    'note',
    'submit',
    'saved',
  ].map((k) => `ledger.form.${k}`),
  ...['title', 'save', 'saved'].map((k) => `ledger.visibility.${k}`),
  ...[
    'already_reversed',
    'pledge_unavailable',
    'invalidNumber',
    'outOfRange',
    'invalidDate',
    'required',
  ].map((k) => `ledger.errors.${k}`),
  ...['title', 'summary', 'summaryNoBudget', 'open'].map((k) => `ledger.card.${k}`),
];

function leafPaths(node: unknown, prefix = ''): string[] {
  if (node && typeof node === 'object') {
    return Object.entries(node).flatMap(([k, v]) => leafPaths(v, prefix ? `${prefix}.${k}` : k));
  }
  return [prefix];
}

describe.each([
  ['fr', fr],
  ['en', en],
])('textes du registre (%s)', (_locale, messages) => {
  it('couvrent chaque type, moyen, réglage et texte des écrans', () => {
    expect(PATHS.filter((path) => !isFilled(get(messages, path)))).toEqual([]);
  });
});

describe('parité FR/EN du registre', () => {
  it("l'espace ledger a les mêmes clés dans les deux langues", () => {
    const keys = (messages: unknown) => leafPaths(get(messages, 'ledger')).sort();
    expect(keys(en)).toEqual(keys(fr));
  });
});
```

Run: `pnpm --filter @testimona/web test -- src/modules/budget/ledger/messages.test.ts`
Expected: FAIL.

- [ ] **Étape 2 : textes**

Dans `apps/web/messages/fr.json`, ajouter l'espace de premier niveau `ledger` :

```json
"ledger": {
  "page": {
    "title": "Cotisations",
    "intro": "Promesses, cotisations reçues et dépenses de la famille, au même endroit. Aucun paiement ne passe par Testimona.",
    "restrictedNote": "Les montants individuels sont visibles des trésoriers, des coordinateurs et du propriétaire. Chacun voit ses propres lignes et toutes les dépenses.",
    "membersNote": "Les montants individuels sont visibles de tous les membres du dossier.",
    "empty": "Aucune ligne pour l'instant.",
    "seeBudget": "Voir le budget",
    "backToDossier": "Retour au dossier"
  },
  "summary": {
    "budget": "Budget envisagé",
    "budgetNone": "Budget non choisi",
    "received": "Reçu",
    "pledgedOpen": "Promis, non versé",
    "spent": "Dépensé",
    "balance": "Disponible",
    "remaining": "Reste à réunir"
  },
  "kind": {
    "pledge": "Promesse",
    "receipt": "Cotisation reçue",
    "expense": "Dépense",
    "reversal": "Annulation"
  },
  "method": {
    "cash": "Espèces",
    "airtel_money": "Airtel Money",
    "moov_money": "Moov Money",
    "transfer": "Virement",
    "card": "Carte",
    "other": "Autre"
  },
  "entry": {
    "listTitle": "Mouvements",
    "reversed": "annulée",
    "fulfilled": "versée",
    "partlyPaid": "{paid} déjà versés",
    "reversalOf": "Annulation : {kind}",
    "reverse": "Annuler cette ligne",
    "confirmReverse": "Confirmer l'annulation",
    "keep": "Garder"
  },
  "form": {
    "pledgeTitle": "Je promets une participation",
    "receiptTitle": "Ajouter une cotisation reçue",
    "expenseTitle": "Ajouter une dépense",
    "party": "Nom du cotisant",
    "supplier": "Fournisseur",
    "amount": "Montant (FCFA)",
    "method": "Moyen de paiement",
    "member": "Membre du dossier",
    "memberNone": "Autre personne (sans compte)",
    "pledge": "Promesse honorée",
    "pledgeNone": "Aucune",
    "date": "Date",
    "note": "Note (facultative)",
    "submit": "Enregistrer",
    "saved": "Ligne enregistrée."
  },
  "visibility": {
    "title": "Qui voit les montants individuels ?",
    "restricted": "Trésoriers, coordinateurs et propriétaire",
    "members": "Tous les membres du dossier",
    "save": "Enregistrer le réglage",
    "saved": "Réglage enregistré."
  },
  "errors": {
    "already_reversed": "Cette ligne a déjà été annulée.",
    "pledge_unavailable": "Cette promesse n'est plus ouverte : elle a été annulée ou déjà versée.",
    "invalidNumber": "Entrez un montant entier, en chiffres.",
    "outOfRange": "Entrez un montant entre 1 et 100 000 000 FCFA.",
    "invalidDate": "Entrez une date valide, qui n'est pas dans le futur.",
    "required": "Ce champ est obligatoire."
  },
  "card": {
    "title": "Cotisations",
    "summary": "{received} reçus sur un budget envisagé de {budget}.",
    "summaryNoBudget": "{received} reçus. Aucun budget n'est encore choisi.",
    "open": "Voir les cotisations"
  }
}
```

Dans `apps/web/messages/en.json` :

```json
"ledger": {
  "page": {
    "title": "Contributions",
    "intro": "The family's pledges, contributions received and expenses, in one place. No payment goes through Testimona.",
    "restrictedNote": "Individual amounts are visible to treasurers, coordinators and the owner. Everyone sees their own entries and all expenses.",
    "membersNote": "Individual amounts are visible to every member of the dossier.",
    "empty": "No entries yet.",
    "seeBudget": "See the budget",
    "backToDossier": "Back to the dossier"
  },
  "summary": {
    "budget": "Budget in mind",
    "budgetNone": "No budget chosen",
    "received": "Received",
    "pledgedOpen": "Pledged, not paid",
    "spent": "Spent",
    "balance": "Available",
    "remaining": "Still to raise"
  },
  "kind": {
    "pledge": "Pledge",
    "receipt": "Contribution received",
    "expense": "Expense",
    "reversal": "Reversal"
  },
  "method": {
    "cash": "Cash",
    "airtel_money": "Airtel Money",
    "moov_money": "Moov Money",
    "transfer": "Bank transfer",
    "card": "Card",
    "other": "Other"
  },
  "entry": {
    "listTitle": "Entries",
    "reversed": "reversed",
    "fulfilled": "paid",
    "partlyPaid": "{paid} paid so far",
    "reversalOf": "Reversal: {kind}",
    "reverse": "Reverse this entry",
    "confirmReverse": "Confirm reversal",
    "keep": "Keep"
  },
  "form": {
    "pledgeTitle": "I pledge a contribution",
    "receiptTitle": "Add a contribution received",
    "expenseTitle": "Add an expense",
    "party": "Contributor's name",
    "supplier": "Supplier",
    "amount": "Amount (FCFA)",
    "method": "Payment method",
    "member": "Dossier member",
    "memberNone": "Someone else (no account)",
    "pledge": "Pledge fulfilled",
    "pledgeNone": "None",
    "date": "Date",
    "note": "Note (optional)",
    "submit": "Save",
    "saved": "Entry saved."
  },
  "visibility": {
    "title": "Who sees individual amounts?",
    "restricted": "Treasurers, coordinators and owner",
    "members": "Every member of the dossier",
    "save": "Save setting",
    "saved": "Setting saved."
  },
  "errors": {
    "already_reversed": "This entry has already been reversed.",
    "pledge_unavailable": "This pledge is no longer open: it was reversed or already paid.",
    "invalidNumber": "Enter a whole amount, in digits.",
    "outOfRange": "Enter an amount between 1 and 100,000,000 FCFA.",
    "invalidDate": "Enter a valid date that is not in the future.",
    "required": "This field is required."
  },
  "card": {
    "title": "Contributions",
    "summary": "{received} received against a budget in mind of {budget}.",
    "summaryNoBudget": "{received} received. No budget has been chosen yet.",
    "open": "See contributions"
  }
}
```

Vérifier aussi que `dossier.errors` contient `validation`, `forbidden`, `not_found`, `unauthenticated` et `unknown` dans les deux langues ; ajouter `unknown` s'il manque (FR « Une erreur est survenue. Réessayez. », EN « Something went wrong. Please try again. »).

- [ ] **Étape 3 : relancer et commit**

Run: `pnpm --filter @testimona/web test -- src/modules/budget/ledger/messages.test.ts`
Expected: PASS.

```bash
git add apps/web/messages/fr.json apps/web/messages/en.json apps/web/src/modules/budget/ledger/messages.test.ts
git commit -m "feat(budget): add the ledger texts"
```

---

### Tâche 5 : écran Cotisations (synthèse, mouvements, annulation)

**Files:**

- Create: `apps/web/src/modules/budget/ledger/ui/useIdempotencyKey.ts`, `ledgerError.ts`, `LedgerSummary.tsx`, `ReverseButton.tsx`, `EntryList.tsx`
- Create: `apps/web/src/app/[locale]/(dossier)/dossier/[id]/cotisations/page.tsx`
- Modify: `apps/web/e2e/smoke.spec.ts`

Cette tâche et la tâche 6 forment l'écran : la page importe `EntryForms` et `VisibilityForm` (tâche 6). Implémenter la tâche 5, commiter sans la page, puis ajouter la page au commit de la tâche 6 (ou créer la page à la tâche 6). Le plan range la page ici pour la lisibilité.

- [ ] **Étape 1 : clé d'idempotence côté navigateur**

`apps/web/src/modules/budget/ledger/ui/useIdempotencyKey.ts` :

```ts
'use client';

import { useCallback, useState } from 'react';

/**
 * Clé d'idempotence d'un formulaire : la même tant que l'envoi n'a pas réussi, renouvelée
 * ensuite. WHY: un double clic ou un réseau lent renvoie la même clé, la base n'écrit qu'une fois.
 */
export function useIdempotencyKey(): [string, () => void] {
  const [key, setKey] = useState(() => crypto.randomUUID());
  const renew = useCallback(() => setKey(crypto.randomUUID()), []);
  return [key, renew];
}
```

- [ ] **Étape 2 : messages d'erreur communs**

`apps/web/src/modules/budget/ledger/ui/ledgerError.ts` :

```ts
import type { LedgerError } from '../service';

/** Erreurs Zod des champs du registre vers leur texte (relatif à l'espace `ledger`). */
export const FIELD_MESSAGES: Record<string, string> = {
  'invalid number': 'errors.invalidNumber',
  'out of range': 'errors.outOfRange',
  'invalid date': 'errors.invalidDate',
  required: 'errors.required',
  'too long': 'errors.tooLong',
  'invalid character': 'errors.invalidCharacter',
};

/** Erreurs propres au registre ; les autres reprennent `dossier.errors`. */
export function isLedgerSpecific(
  error: LedgerError,
): error is 'already_reversed' | 'pledge_unavailable' {
  return error === 'already_reversed' || error === 'pledge_unavailable';
}
```

(`service.ts` importe `server-only` ; ce fichier n'en importe que le type, effacé à la compilation.)

- [ ] **Étape 3 : synthèse**

`apps/web/src/modules/budget/ledger/ui/LedgerSummary.tsx` :

```tsx
import { getTranslations } from 'next-intl/server';
import { formatXaf } from '../../format';
import { balance, remaining, type LedgerTotals } from '../model';

interface Props {
  locale: string;
  budget: number | null;
  totals: LedgerTotals;
}

/** Chiffres clés du registre : budget envisagé, reçu, promis, dépensé, disponible, reste. */
export async function LedgerSummary({ locale, budget, totals }: Props) {
  const t = await getTranslations('ledger.summary');
  const money = (amount: number) => formatXaf(amount, locale);
  const rest = remaining(budget, totals);
  const items = [
    {
      label: budget === null ? t('budgetNone') : t('budget'),
      value: budget === null ? '—' : money(budget),
    },
    { label: t('received'), value: money(totals.received) },
    { label: t('pledgedOpen'), value: money(totals.pledgedOpen) },
    { label: t('spent'), value: money(totals.spent) },
    { label: t('balance'), value: money(balance(totals)) },
    { label: t('remaining'), value: rest === null ? '—' : money(rest) },
  ];
  return (
    <dl className="grid gap-3 sm:grid-cols-3">
      {items.map((item) => (
        <div key={item.label} className="border-border rounded-2xl border p-4">
          <dt className="text-muted-foreground text-sm">{item.label}</dt>
          <dd className="font-display text-foreground mt-1 text-xl font-bold tabular-nums">
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
```

- [ ] **Étape 4 : annulation**

`apps/web/src/modules/budget/ledger/ui/ReverseButton.tsx` :

```tsx
'use client';

import { useActionState, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { reverseEntryAction, type LedgerFormState } from '../actions';
import { isLedgerSpecific } from './ledgerError';
import { useIdempotencyKey } from './useIdempotencyKey';

/** Annule une ligne en deux temps (annuler, puis confirmer) ; l'annulation est définitive. */
export function ReverseButton({ dossierId, entryId }: { dossierId: string; entryId: string }) {
  const t = useTranslations('ledger');
  const tErrors = useTranslations('dossier.errors');
  const [state, formAction, pending] = useActionState<LedgerFormState | null, FormData>(
    reverseEntryAction,
    null,
  );
  const [confirming, setConfirming] = useState(false);
  const [key, renew] = useIdempotencyKey();

  useEffect(() => {
    if (state?.ok) {
      setConfirming(false);
      renew();
    }
  }, [state, renew]);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="text-primary text-sm font-semibold hover:underline"
      >
        {t('entry.reverse')}
      </button>
    );
  }
  return (
    <form action={formAction} className="flex flex-wrap items-center gap-3">
      <input type="hidden" name="dossierId" value={dossierId} />
      <input type="hidden" name="entryId" value={entryId} />
      <input type="hidden" name="idempotencyKey" value={key} />
      <button
        type="submit"
        disabled={pending}
        className="bg-accent rounded-full px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-60"
      >
        {t('entry.confirmReverse')}
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className="text-muted-foreground text-sm hover:underline"
      >
        {t('entry.keep')}
      </button>
      {state?.error && (
        <p role="alert" className="text-accent-soft w-full text-sm">
          {isLedgerSpecific(state.error) ? t(`errors.${state.error}`) : tErrors(state.error)}
        </p>
      )}
    </form>
  );
}
```

- [ ] **Étape 5 : liste des mouvements**

`apps/web/src/modules/budget/ledger/ui/EntryList.tsx` :

```tsx
import { getTranslations } from 'next-intl/server';
import { formatXaf } from '../../format';
import { canReverse, type EntryView } from '../model';
import { ReverseButton } from './ReverseButton';

interface Props {
  dossierId: string;
  locale: string;
  views: readonly EntryView[];
  canManage: boolean;
}

/** Mouvements visibles ; une annulation apparaît comme une ligne, rien ne disparaît. */
export async function EntryList({ dossierId, locale, views, canManage }: Props) {
  const t = await getTranslations('ledger');
  const date = new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : 'fr-FR', {
    dateStyle: 'medium',
    timeZone: 'UTC',
  });
  if (views.length === 0) return <p className="text-muted-foreground">{t('page.empty')}</p>;
  return (
    <ul className="border-border divide-border divide-y rounded-2xl border">
      {views.map((v) => {
        const sign = v.kind === 'expense' ? '−' : v.kind === 'reversal' ? '±' : '+';
        const label =
          v.kind === 'reversal' && v.reversesKind
            ? t('entry.reversalOf', { kind: t(`kind.${v.reversesKind}`) })
            : t(`kind.${v.kind}`);
        const struck = v.reversed ? 'line-through' : '';
        return (
          <li key={v.id} className="space-y-1 px-5 py-4">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <p className={`text-foreground font-semibold ${struck}`}>
                {v.partyName}
                <span className="text-muted-foreground font-normal"> · {label}</span>
                {v.method && (
                  <span className="text-muted-foreground font-normal">
                    {' '}
                    · {t(`method.${v.method}`)}
                  </span>
                )}
              </p>
              <p className={`font-semibold tabular-nums ${struck}`}>
                {sign}
                {formatXaf(v.amount, locale)}
              </p>
            </div>
            <p className="text-muted-foreground text-sm">
              {date.format(new Date(`${v.occurredOn}T00:00:00Z`))}
              {v.reversed && ` · ${t('entry.reversed')}`}
              {v.fulfilled && ` · ${t('entry.fulfilled')}`}
              {v.kind === 'pledge' &&
                !v.fulfilled &&
                v.paid > 0 &&
                ` · ${t('entry.partlyPaid', { paid: formatXaf(v.paid, locale) })}`}
              {v.note && ` · ${v.note}`}
            </p>
            {canManage && canReverse(v) && <ReverseButton dossierId={dossierId} entryId={v.id} />}
          </li>
        );
      })}
    </ul>
  );
}
```

- [ ] **Étape 6 : page**

`apps/web/src/app/[locale]/(dossier)/dossier/[id]/cotisations/page.tsx` :

```tsx
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { z } from 'zod';
import { Link } from '@/i18n/navigation';
import { isStepOpen } from '@/journey/registry';
import { entryViews, openPledges, pledgeRemaining } from '@/modules/budget/ledger/model';
import { getTotals, getVisibility, listEntries } from '@/modules/budget/ledger/repo';
import { EntryForms } from '@/modules/budget/ledger/ui/EntryForms';
import { EntryList } from '@/modules/budget/ledger/ui/EntryList';
import { LedgerSummary } from '@/modules/budget/ledger/ui/LedgerSummary';
import { VisibilityForm } from '@/modules/budget/ledger/ui/VisibilityForm';
import { ATTENDANCE_KEYS, envisagedTotal, LEVEL_KEY, NIGHTS_KEY } from '@/modules/budget/scenarios';
import { listAnswersResult } from '@/modules/dossier/answers/repo';
import { getDossier, getMyRole, listMembers } from '@/modules/dossier/repo';
import { canWrite, hasRole } from '@/modules/dossier/roles';

export const metadata: Metadata = { robots: { index: false, follow: false } };

const IdSchema = z.string().uuid();

export default async function ContributionsPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  if (!IdSchema.safeParse(id).success) notFound();

  const dossier = await getDossier(id);
  if (!dossier || !isStepOpen(dossier.entryPoint, 'attendance')) notFound();

  const [t, tEntry, role, totals, entries, visibility, answers, members] = await Promise.all([
    getTranslations('ledger.page'),
    getTranslations('ledger.entry'),
    getMyRole(id),
    getTotals(id),
    listEntries(id),
    getVisibility(id),
    listAnswersResult(id, [...ATTENDANCE_KEYS, NIGHTS_KEY, LEVEL_KEY]),
    listMembers(id),
  ]);
  // WHY: des totaux ou des lignes faux seraient pires qu'un écran d'erreur.
  if (totals.error || entries.error || visibility.error || answers.error) {
    throw new Error('ledger unreadable');
  }

  const views = entryViews(entries.data);
  const canManage = hasRole(role, 'treasurer');
  return (
    <div className="mx-auto w-full max-w-3xl space-y-8 px-4 py-8 sm:px-6 lg:py-12">
      <header className="space-y-2">
        <h1 className="font-display text-foreground text-3xl font-bold">{t('title')}</h1>
        <p className="text-muted-foreground">{t('intro')}</p>
        <p className="text-muted-foreground text-sm">
          {visibility.data === 'members' ? t('membersNote') : t('restrictedNote')}
        </p>
      </header>

      <LedgerSummary locale={locale} budget={envisagedTotal(answers.data)} totals={totals.data} />

      <EntryForms
        dossierId={id}
        locale={locale}
        canPledge={canWrite(role)}
        canManage={canManage}
        members={members.map((m) => ({ id: m.userId, name: m.displayName }))}
        pledges={openPledges(views).map((p) => ({
          id: p.id,
          label: p.partyName,
          amount: pledgeRemaining(p),
        }))}
      />

      <section aria-labelledby="entries-title" className="space-y-3">
        <h2 id="entries-title" className="font-display text-foreground text-lg font-semibold">
          {tEntry('listTitle')}
        </h2>
        <EntryList dossierId={id} locale={locale} views={views} canManage={canManage} />
      </section>

      {role === 'owner' && <VisibilityForm dossierId={id} visibility={visibility.data} />}

      <div className="flex flex-wrap justify-between gap-3 text-sm">
        <Link href={`/dossier/${id}/budget`} className="text-primary font-semibold hover:underline">
          {t('seeBudget')}
        </Link>
        <Link href={`/dossier/${id}`} className="text-muted-foreground hover:underline">
          ← {t('backToDossier')}
        </Link>
      </div>
    </div>
  );
}
```

Vérifier que `hasRole` est bien exporté par `apps/web/src/modules/dossier/roles.ts` (il l'est, utilisé par `canWrite`).

- [ ] **Étape 7 : e2e de fumée**

Dans `apps/web/e2e/smoke.spec.ts`, à côté du test de la page Budget, ajouter :

```ts
test('Contributions page requires sign-in', async ({ page }) => {
  await page.goto('/dossier/44444444-4444-4444-8444-444444444444/cotisations');
  await expect(page).toHaveURL(/\/login\?next=.*cotisations/);
});
```

- [ ] **Étape 8 : commit (sans la page, qui rejoint la tâche 6)**

Run: `pnpm --filter @testimona/web typecheck && pnpm --filter @testimona/web lint` (sans la page, qui dépend de la tâche 6).

```bash
git add apps/web/src/modules/budget/ledger/ui apps/web/e2e/smoke.spec.ts
git commit -m "feat(budget): add the ledger summary, entry list and reversal"
```

---

### Tâche 6 : formulaires, réglage de visibilité et page Cotisations

**Files:**

- Create: `apps/web/src/modules/budget/ledger/ui/EntryForm.tsx`, `EntryForms.tsx`, `VisibilityForm.tsx`
- Create: `apps/web/src/app/[locale]/(dossier)/dossier/[id]/cotisations/page.tsx` (code de la tâche 5, étape 6)

- [ ] **Étape 1 : formulaire de ligne**

`apps/web/src/modules/budget/ledger/ui/EntryForm.tsx` :

```tsx
'use client';

import { useActionState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { saveEntryAction, type LedgerFormState } from '../actions';
import { ENTRY_METHODS } from '../schema';
import { FIELD_MESSAGES, isLedgerSpecific } from './ledgerError';
import { useIdempotencyKey } from './useIdempotencyKey';

export interface MemberOption {
  id: string;
  name: string | null;
}
export interface PledgeOption {
  id: string;
  label: string;
  amount: number;
}

interface Props {
  dossierId: string;
  kind: 'pledge' | 'receipt' | 'expense';
  members?: readonly MemberOption[];
  pledges?: readonly PledgeOption[];
  amountLabel: (amount: number) => string;
}

const FIELD = 'border-border bg-background text-foreground w-full rounded-xl border px-3 py-2';

/** Saisie d'une promesse, d'une cotisation reçue ou d'une dépense. */
export function EntryForm({ dossierId, kind, members = [], pledges = [], amountLabel }: Props) {
  const t = useTranslations('ledger');
  const tErrors = useTranslations('dossier.errors');
  const [state, formAction, pending] = useActionState<LedgerFormState | null, FormData>(
    saveEntryAction,
    null,
  );
  const [key, renew] = useIdempotencyKey();
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
      renew();
    }
  }, [state, renew]);

  const fieldError = (name: string) => {
    const message = state?.fieldErrors?.[name];
    return message ? t(FIELD_MESSAGES[message] ?? 'errors.required') : null;
  };
  const errorId = (name: string) => `${kind}-${name}-error`;
  const input = (name: string, label: string, props: Record<string, unknown> = {}) => {
    const error = fieldError(name);
    return (
      <label className="block space-y-1">
        <span className="text-muted-foreground text-sm">{label}</span>
        <input
          name={name}
          className={FIELD}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId(name) : undefined}
          {...props}
        />
        {error && (
          <span id={errorId(name)} className="text-accent-soft text-sm">
            {error}
          </span>
        )}
      </label>
    );
  };

  return (
    <form ref={formRef} action={formAction} className="grid gap-3 sm:grid-cols-2">
      <input type="hidden" name="dossierId" value={dossierId} />
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="idempotencyKey" value={key} />
      {input('partyName', kind === 'expense' ? t('form.supplier') : t('form.party'), {
        required: true,
        maxLength: 120,
        autoComplete: 'off',
      })}
      {input('amount', t('form.amount'), {
        required: true,
        inputMode: 'numeric',
        autoComplete: 'off',
      })}
      {kind !== 'pledge' && (
        <label className="block space-y-1">
          <span className="text-muted-foreground text-sm">{t('form.method')}</span>
          <select name="method" defaultValue="cash" className={FIELD}>
            {ENTRY_METHODS.map((m) => (
              <option key={m} value={m}>
                {t(`method.${m}`)}
              </option>
            ))}
          </select>
        </label>
      )}
      {kind === 'receipt' && (
        <label className="block space-y-1">
          <span className="text-muted-foreground text-sm">{t('form.member')}</span>
          <select name="memberId" defaultValue="" className={FIELD}>
            <option value="">{t('form.memberNone')}</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name ?? m.id.slice(0, 8)}
              </option>
            ))}
          </select>
        </label>
      )}
      {kind === 'receipt' && pledges.length > 0 && (
        <label className="block space-y-1">
          <span className="text-muted-foreground text-sm">{t('form.pledge')}</span>
          <select name="pledgeId" defaultValue="" className={FIELD}>
            <option value="">{t('form.pledgeNone')}</option>
            {pledges.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label} · {amountLabel(p.amount)}
              </option>
            ))}
          </select>
        </label>
      )}
      {input('occurredOn', t('form.date'), { type: 'date' })}
      {input('note', t('form.note'), { maxLength: 500, autoComplete: 'off' })}
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <button
          type="submit"
          disabled={pending}
          className="bg-accent rounded-full px-5 py-2 font-semibold text-white disabled:opacity-60"
        >
          {t('form.submit')}
        </button>
        <p role="status" className="text-muted-foreground text-sm">
          {state?.ok ? t('form.saved') : ''}
        </p>
      </div>
      {state?.error && !state.fieldErrors && (
        <p role="alert" className="text-accent-soft text-sm sm:col-span-2">
          {isLedgerSpecific(state.error) ? t(`errors.${state.error}`) : tErrors(state.error)}
        </p>
      )}
    </form>
  );
}
```

- [ ] **Étape 2 : regroupement des formulaires**

`apps/web/src/modules/budget/ledger/ui/EntryForms.tsx` :

```tsx
'use client';

import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { formatXaf } from '../../format';
import { EntryForm, type MemberOption, type PledgeOption } from './EntryForm';

interface Props {
  dossierId: string;
  locale: string;
  canPledge: boolean;
  canManage: boolean;
  members: readonly MemberOption[];
  pledges: readonly PledgeOption[];
}

/**
 * Formulaires disponibles selon le rôle : promesse (contributeur et plus), cotisation reçue et
 * dépense (trésorier et plus). Chaque formulaire est replié dans un `<details>`.
 */
export function EntryForms({ dossierId, locale, canPledge, canManage, members, pledges }: Props) {
  const t = useTranslations('ledger.form');
  const amountLabel = (amount: number) => formatXaf(amount, locale);
  const block = (title: string, form: ReactNode) => (
    <details className="border-border rounded-2xl border p-4">
      <summary className="text-foreground cursor-pointer font-semibold">{title}</summary>
      <div className="mt-4">{form}</div>
    </details>
  );
  if (!canPledge) return null;
  return (
    <div className="space-y-3">
      {block(
        t('pledgeTitle'),
        <EntryForm dossierId={dossierId} kind="pledge" amountLabel={amountLabel} />,
      )}
      {canManage &&
        block(
          t('receiptTitle'),
          <EntryForm
            dossierId={dossierId}
            kind="receipt"
            members={members}
            pledges={pledges}
            amountLabel={amountLabel}
          />,
        )}
      {canManage &&
        block(
          t('expenseTitle'),
          <EntryForm dossierId={dossierId} kind="expense" amountLabel={amountLabel} />,
        )}
    </div>
  );
}
```

- [ ] **Étape 3 : visibilité**

`apps/web/src/modules/budget/ledger/ui/VisibilityForm.tsx` :

```tsx
'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { setVisibilityAction, type LedgerFormState } from '../actions';
import { VISIBILITIES, type Visibility } from '../schema';
import { isLedgerSpecific } from './ledgerError';

/** Réglage du propriétaire : qui voit les montants individuels. */
export function VisibilityForm({
  dossierId,
  visibility,
}: {
  dossierId: string;
  visibility: Visibility;
}) {
  const t = useTranslations('ledger.visibility');
  const tErrors = useTranslations('dossier.errors');
  const [state, formAction, pending] = useActionState<LedgerFormState | null, FormData>(
    setVisibilityAction,
    null,
  );
  return (
    <form action={formAction} className="border-border space-y-3 rounded-2xl border p-4">
      <input type="hidden" name="dossierId" value={dossierId} />
      <fieldset className="space-y-2">
        <legend className="text-foreground font-semibold">{t('title')}</legend>
        {VISIBILITIES.map((v) => (
          <label key={v} className="flex items-center gap-2 text-sm">
            <input type="radio" name="visibility" value={v} defaultChecked={visibility === v} />
            {t(v)}
          </label>
        ))}
      </fieldset>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="border-border rounded-full border px-4 py-2 text-sm font-semibold disabled:opacity-60"
        >
          {t('save')}
        </button>
        <p role="status" className="text-muted-foreground text-sm">
          {state?.ok ? t('saved') : ''}
        </p>
      </div>
      {state?.error && (
        <p role="alert" className="text-accent-soft text-sm">
          {tErrors(isLedgerSpecific(state.error) ? 'unknown' : state.error)}
        </p>
      )}
    </form>
  );
}
```

- [ ] **Étape 4 : page**

Créer `apps/web/src/app/[locale]/(dossier)/dossier/[id]/cotisations/page.tsx` avec le code de la tâche 5, étape 6.

- [ ] **Étape 5 : vérifier**

Run: `pnpm --filter @testimona/web test && pnpm --filter @testimona/web typecheck && pnpm --filter @testimona/web lint`, puis le build : `NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder_anon_key_long_enough NEXT_PUBLIC_SITE_URL=https://example.com pnpm build`.
Expected: PASS ; la route `/[locale]/dossier/[id]/cotisations` apparaît. Tous les fichiers sous 300 lignes.

- [ ] **Étape 6 : commit**

```bash
git add apps/web/src/modules/budget/ledger/ui "apps/web/src/app/[locale]/(dossier)/dossier/[id]/cotisations/page.tsx"
git commit -m "feat(budget): add the contributions screen with entry forms and visibility"
```

---

### Tâche 7 : carte du tableau de bord et lien depuis la page Budget

**Files:**

- Create: `apps/web/src/modules/budget/ledger/ui/LedgerCard.tsx`
- Modify: `apps/web/src/app/[locale]/(dossier)/dossier/[id]/page.tsx`, `apps/web/src/modules/budget/ui/BudgetOverview.tsx`, `apps/web/messages/{fr,en}.json` (`budget.page.seeContributions`), `apps/web/src/modules/budget/messages.test.ts`

- [ ] **Étape 1 : carte**

`apps/web/src/modules/budget/ledger/ui/LedgerCard.tsx` :

```tsx
import { getTranslations } from 'next-intl/server';
import { buttonClasses } from '@/components/ui/Button';
import { Link } from '@/i18n/navigation';
import { formatXaf } from '../../format';
import type { LedgerTotals } from '../model';

interface Props {
  dossierId: string;
  locale: string;
  budget: number | null;
  totals: LedgerTotals | null;
}

/** Carte « Cotisations » du tableau de bord : reçu sur budget envisagé. */
export async function LedgerCard({ dossierId, locale, budget, totals }: Props) {
  const t = await getTranslations('ledger.card');
  const received = formatXaf(totals?.received ?? 0, locale);
  return (
    <section className="border-border space-y-3 rounded-2xl border p-6">
      <h2 className="font-display text-foreground text-lg font-semibold">{t('title')}</h2>
      <p className="text-muted-foreground">
        {budget === null
          ? t('summaryNoBudget', { received })
          : t('summary', { received, budget: formatXaf(budget, locale) })}
      </p>
      <Link
        href={`/dossier/${dossierId}/cotisations`}
        className={buttonClasses({ variant: 'primary', size: 'md' })}
      >
        {t('open')}
      </Link>
    </section>
  );
}
```

- [ ] **Étape 2 : tableau de bord**

Dans `apps/web/src/app/[locale]/(dossier)/dossier/[id]/page.tsx` :

1. Importer `isStepOpen` depuis `@/journey/registry` (à côté de `personStatus, stepsFor`), `getTotals` depuis `@/modules/budget/ledger/repo`, `LedgerCard` depuis `@/modules/budget/ledger/ui/LedgerCard` et `envisagedTotal` depuis `@/modules/budget/scenarios`.
2. Après le `Promise.all` qui charge `answers`, ajouter :

```tsx
const hasBudget = isStepOpen(dossier.entryPoint, 'attendance');
// WHY: une carte sans chiffre vaut mieux qu'un tableau de bord en erreur ; la page Cotisations,
// elle, refuse d'afficher des totaux illisibles.
const ledgerTotals = hasBudget ? (await getTotals(id)).data : null;
```

3. Entre la section du parcours et celle des membres, ajouter :

```tsx
{
  hasBudget && (
    <LedgerCard
      dossierId={id}
      locale={locale}
      budget={envisagedTotal(answers)}
      totals={ledgerTotals}
    />
  );
}
```

- [ ] **Étape 3 : lien depuis la page Budget**

Dans `apps/web/src/modules/budget/ui/BudgetOverview.tsx`, à côté du lien « Retour au dossier », ajouter :

```tsx
<Link
  href={`/dossier/${dossierId}/cotisations`}
  className="text-primary text-sm font-semibold hover:underline"
>
  {t('page.seeContributions')}
</Link>
```

Ajouter la clé `budget.page.seeContributions` (FR « Suivre les cotisations », EN « Track contributions ») dans les deux fichiers de messages et `'seeContributions'` dans la liste des clés `budget.page.*` de `apps/web/src/modules/budget/messages.test.ts`.

- [ ] **Étape 4 : vérifier et commit**

Run: `pnpm --filter @testimona/web test && pnpm --filter @testimona/web typecheck && pnpm --filter @testimona/web lint && pnpm format:check`
Expected: PASS.

```bash
git add apps/web/src/modules/budget "apps/web/src/app/[locale]/(dossier)/dossier/[id]/page.tsx" apps/web/messages/fr.json apps/web/messages/en.json
git commit -m "feat(budget): show contributions on the dashboard and the budget page"
```

---

### Tâche 8 : spec, vérification complète et PR

- [ ] **Étape 1 : mettre à jour la spec**

Dans `docs/superpowers/specs/2026-10-27-lot-2-financer-design.md`, section « Livraison » : passer à 5 PR — 1. Budget (livrée) ; 2. Registre : `dossier_finance` (visibilité), `ledger_entry` (promesses, cotisations reçues liées ou non à une promesse, dépenses, annulations), `ledger_totals`, écran Cotisations, idempotence, carte du tableau de bord, budget de référence = budget envisagé ; 3. Postes : scénario retenu par le trésorier, `budget_line` (onglet « Postes »), rattachement d'une dépense à un poste ; 4. Reçus ; 5. Bilan et clôture. Dans § 1 `ledger_entry`, ajouter les colonnes `pledge_id` (promesse honorée) et `reverses_kind` ; noter que `budget_line_id` arrive en PR 3, et que `scenario`, `closed_at`, `closed_by` de `dossier_finance` arrivent en PR 3 et 5.

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

1. Appliquer `20261027000600_ledger` en production (MCP Supabase `apply_migration`, contenu exact du fichier), vérifier tables, policies et droits, puis `get_advisors` (sécurité) : `ledger_totals` sera signalée (0029), c'est voulu.
2. Mettre à jour `supabase/README.md` (état de la production) et commiter.
3. Pousser, ouvrir la PR vers `main` (Contexte / Changements / Tests effectués / Risques, ligne d'attribution habituelle), attendre la CI, fusionner avec l'accord de l'utilisateur.
