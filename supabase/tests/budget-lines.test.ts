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
