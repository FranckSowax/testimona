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
  reversesKind?: string | null;
  createdBy?: string | null;
  occurredOn?: string | null;
}

async function insert(userId: string, f: EntryFields) {
  const { rows } = await asUser(db, userId, () =>
    db.query<{ id: string; amount: number; party_name: string; member_id: string | null }>(
      `insert into ledger_entry
         (dossier_id, kind, amount, method, party_name, member_id, pledge_id, reverses_id,
          idempotency_key, reverses_kind, created_by, occurred_on)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, coalesce($12::date, current_date))
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
        f.reversesKind ?? null,
        f.createdBy ?? null,
        f.occurredOn ?? null,
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

  it('impose l’auteur de la ligne, même s’il est forgé par le client', async () => {
    const entry = await insert(treasurer, { kind: 'expense', createdBy: other });
    const { rows } = await db.query<{ created_by: string }>(
      'select created_by from ledger_entry where id = $1',
      [entry.id],
    );
    expect(rows[0]!.created_by).toBe(treasurer);
  });
});

describe('ledger_entry : pas d’oracle par les codes d’erreur', () => {
  it('répond 42501 à un non-membre ou un lecteur, jamais un code TL', async () => {
    const pledge = await insert(contributor, { kind: 'pledge', member: contributor });
    await insert(treasurer, { kind: 'receipt', pledge: pledge.id });
    const foreign = await insert(stranger, { kind: 'expense', dossier: otherDossierId });
    for (const user of [stranger, viewer]) {
      await expect(insert(user, { kind: 'receipt', member: randomUUID() })).rejects.toMatchObject(
        DENIED,
      );
      await expect(insert(user, { kind: 'receipt', pledge: pledge.id })).rejects.toMatchObject(
        DENIED,
      );
      await expect(insert(user, { kind: 'reversal', reverses: foreign.id })).rejects.toMatchObject(
        DENIED,
      );
    }
  });
});

describe('ledger_entry : date de l’opération', () => {
  async function dayOffset(days: number) {
    const { rows } = await db.query<{ d: string }>('select (current_date + $1::int)::text as d', [
      days,
    ]);
    return rows[0]!.d;
  }

  it('accepte demain mais refuse plus loin dans le futur ou avant 2000', async () => {
    await insert(treasurer, { kind: 'expense', occurredOn: await dayOffset(1) });
    await expect(
      insert(treasurer, { kind: 'expense', occurredOn: await dayOffset(2) }),
    ).rejects.toMatchObject({ code: '23514' });
    await expect(
      insert(treasurer, { kind: 'expense', occurredOn: '1999-12-31' }),
    ).rejects.toMatchObject({ code: '23514' });
  });
});

describe('ledger_entry : suppressions liées', () => {
  it('garde la ligne quand son auteur supprime son compte', async () => {
    const leaver = await createUser(db, 'leaver@test.local');
    await addMember(leaver, 'treasurer');
    const entry = await insert(leaver, { kind: 'expense' });
    await db.query('delete from auth.users where id = $1', [leaver]);
    const { rows } = await db.query<{ created_by: string | null }>(
      'select created_by from ledger_entry where id = $1',
      [entry.id],
    );
    expect(rows).toEqual([{ created_by: null }]);
  });

  it('empêche de supprimer un dossier qui a un registre, pas un dossier sans ligne', async () => {
    const withLedger = await createDossier(owner);
    await insert(owner, { kind: 'expense', dossier: withLedger });
    // WHY: « on delete restrict » lève restrict_violation (23001), pas 23503.
    await expect(
      asUser(db, owner, () => db.query('delete from dossier where id = $1', [withLedger])),
    ).rejects.toMatchObject({ code: '23001' });
    const kept = await db.query('select id from ledger_entry where dossier_id = $1', [withLedger]);
    expect(kept.rows).toHaveLength(1);

    const empty = await createDossier(owner);
    await asUser(db, owner, () =>
      db.query(
        `insert into dossier_finance (dossier_id, amounts_visibility) values ($1, 'members')`,
        [empty],
      ),
    );
    const result = await asUser(db, owner, () =>
      db.query('delete from dossier where id = $1', [empty]),
    );
    expect(result.affectedRows).toBe(1);
    const finance = await db.query('select 1 from dossier_finance where dossier_id = $1', [empty]);
    expect(finance.rows).toHaveLength(0);
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
  it('accepte des versements partiels tant que la promesse n’est pas soldée, et y recopie le membre', async () => {
    const pledge = await insert(contributor, {
      kind: 'pledge',
      member: contributor,
      amount: 10_000,
    });
    const first = await insert(treasurer, { kind: 'receipt', amount: 4_000, pledge: pledge.id });
    expect(first.member_id).toBe(contributor);
    await insert(treasurer, { kind: 'receipt', amount: 6_000, pledge: pledge.id });
    // WHY: 4 000 + 6 000 = 10 000, la promesse est soldée.
    await expect(
      insert(treasurer, { kind: 'receipt', amount: 1_000, pledge: pledge.id }),
    ).rejects.toMatchObject({ code: 'TL002' });
    await insert(treasurer, { kind: 'reversal', reverses: first.id });
    await insert(treasurer, { kind: 'receipt', amount: 4_000, pledge: pledge.id });
  });

  it('accepte un dernier versement supérieur au reste, puis refuse tout versement de plus', async () => {
    const fresh = await createDossier(owner);
    await addMember(treasurer, 'treasurer', fresh);
    await addMember(contributor, 'contributor', fresh);
    const pledge = await insert(contributor, {
      kind: 'pledge',
      member: contributor,
      amount: 10_000,
      dossier: fresh,
    });
    await insert(treasurer, { kind: 'receipt', amount: 4_000, pledge: pledge.id, dossier: fresh });
    // WHY: choix produit, une famille peut donner plus que promis ; le reste dû est de 6 000.
    await insert(treasurer, { kind: 'receipt', amount: 50_000, pledge: pledge.id, dossier: fresh });
    await expect(
      insert(treasurer, { kind: 'receipt', amount: 1_000, pledge: pledge.id, dossier: fresh }),
    ).rejects.toMatchObject({ code: 'TL002' });
    expect(await totals(treasurer, fresh)).toEqual({
      received: 54_000,
      pledgedOpen: 0,
      spent: 0,
    });
  });

  it('impose le membre de la promesse même si un autre membre est transmis', async () => {
    const pledge = await insert(contributor, { kind: 'pledge', member: contributor });
    const receipt = await insert(treasurer, {
      kind: 'receipt',
      pledge: pledge.id,
      member: other,
    });
    expect(receipt.member_id).toBe(contributor);
  });

  it('accepte un versement pour la promesse d’un membre qui a quitté le dossier', async () => {
    const former = await createUser(db, 'former@test.local');
    await addMember(former, 'contributor');
    const pledge = await insert(former, { kind: 'pledge', member: former });
    await db.query('delete from dossier_member where dossier_id = $1 and user_id = $2', [
      dossierId,
      former,
    ]);
    const receipt = await insert(treasurer, { kind: 'receipt', pledge: pledge.id });
    expect(receipt.member_id).toBe(former);
  });

  it('refuse un pledge_id sur une ligne qui n’est pas une cotisation reçue', async () => {
    const pledge = await insert(contributor, { kind: 'pledge', member: contributor });
    await expect(
      insert(contributor, { kind: 'pledge', member: contributor, pledge: pledge.id }),
    ).rejects.toMatchObject({ code: '23514' });
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

  it('répond 23505 et non TL002 au second envoi d’une cotisation qui a soldé la promesse', async () => {
    const pledge = await insert(contributor, {
      kind: 'pledge',
      member: contributor,
      amount: 10_000,
    });
    const key = randomUUID();
    await insert(treasurer, { kind: 'receipt', amount: 10_000, pledge: pledge.id, key });
    await expect(
      insert(treasurer, { kind: 'receipt', amount: 10_000, pledge: pledge.id, key }),
    ).rejects.toMatchObject({ code: '23505' });
  });

  it('répond 23505 au second envoi d’une annulation avec sa clé', async () => {
    const expense = await insert(treasurer, { kind: 'expense' });
    const key = randomUUID();
    await insert(treasurer, { kind: 'reversal', reverses: expense.id, key });
    await expect(
      insert(treasurer, { kind: 'reversal', reverses: expense.id, key }),
    ).rejects.toMatchObject({ code: '23505' });
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

describe('visibilité : reverses_kind forgé', () => {
  it('ne fait pas passer une promesse pour une dépense aux yeux d’un autre contributeur', async () => {
    const fresh = await createDossier(owner);
    await addMember(contributor, 'contributor', fresh);
    await addMember(other, 'contributor', fresh);
    const pledge = await insert(contributor, {
      kind: 'pledge',
      member: contributor,
      reversesKind: 'expense',
      dossier: fresh,
    });
    const stored = await db.query<{ reverses_kind: string | null }>(
      'select reverses_kind from ledger_entry where id = $1',
      [pledge.id],
    );
    expect(stored.rows).toEqual([{ reverses_kind: null }]);
    const { rows } = await asUser(db, other, () =>
      db.query('select id from ledger_entry where dossier_id = $1', [fresh]),
    );
    expect(rows).toEqual([]);
  });
});

describe('ledger_totals', () => {
  async function freshDossier() {
    const fresh = await createDossier(owner);
    await addMember(treasurer, 'treasurer', fresh);
    await addMember(contributor, 'contributor', fresh);
    await addMember(viewer, 'viewer', fresh);
    return fresh;
  }

  it('renvoie reçu, reste promis et dépensé, annulations et versements partiels déduits', async () => {
    const fresh = await freshDossier();
    const pledge = (amount: number) =>
      insert(contributor, { kind: 'pledge', member: contributor, amount, dossier: fresh });
    // Promesse sans versement : 20 000 restent dus.
    await pledge(20_000);
    // Promesse partiellement versée : 25 000 - 15 000 = 10 000 restent dus.
    const partial = await pledge(25_000);
    await insert(treasurer, {
      kind: 'receipt',
      amount: 15_000,
      pledge: partial.id,
      dossier: fresh,
    });
    // Promesse soldée : rien ne reste dû.
    const honoured = await pledge(20_000);
    await insert(treasurer, {
      kind: 'receipt',
      amount: 20_000,
      pledge: honoured.id,
      dossier: fresh,
    });
    await insert(treasurer, { kind: 'receipt', amount: 85_000, dossier: fresh });
    const cancelled = await insert(treasurer, { kind: 'receipt', amount: 5_000, dossier: fresh });
    await insert(treasurer, { kind: 'reversal', reverses: cancelled.id, dossier: fresh });
    await insert(treasurer, { kind: 'expense', amount: 40_000, dossier: fresh });
    // WHY: reçu = 15 000 + 20 000 + 85 000 ; reste promis = 20 000 + 10 000.
    const expected = { received: 120_000, pledgedOpen: 30_000, spent: 40_000 };
    // WHY: un lecteur ne voit que les dépenses, mais reçoit les mêmes totaux.
    expect(await totals(viewer, fresh)).toEqual(expected);
    expect(await totals(treasurer, fresh)).toEqual(expected);
    await asUser(db, owner, () =>
      db.query(
        `insert into dossier_finance (dossier_id, amounts_visibility) values ($1, 'members')`,
        [fresh],
      ),
    );
    expect(await totals(viewer, fresh)).toEqual(expected);
  });

  it('rouvre la promesse quand une cotisation liée est annulée', async () => {
    const fresh = await freshDossier();
    const pledge = await insert(contributor, {
      kind: 'pledge',
      member: contributor,
      amount: 10_000,
      dossier: fresh,
    });
    const receipt = await insert(treasurer, {
      kind: 'receipt',
      amount: 10_000,
      pledge: pledge.id,
      dossier: fresh,
    });
    expect(await totals(viewer, fresh)).toEqual({ received: 10_000, pledgedOpen: 0, spent: 0 });
    await insert(treasurer, { kind: 'reversal', reverses: receipt.id, dossier: fresh });
    expect(await totals(viewer, fresh)).toEqual({ received: 0, pledgedOpen: 10_000, spent: 0 });
  });

  it('renvoie des zéros pour un dossier sans ligne', async () => {
    const fresh = await freshDossier();
    expect(await totals(viewer, fresh)).toEqual({ received: 0, pledgedOpen: 0, spent: 0 });
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
