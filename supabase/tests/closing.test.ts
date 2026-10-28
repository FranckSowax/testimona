import { randomUUID } from 'node:crypto';
import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { asRole, asUser, createTestDb, createUser } from './helpers/db';

let db: PGlite;
let owner: string;
let coordinator: string;
let treasurer: string;
let contributor: string;
let viewer: string;
let stranger: string;

const DENIED = { code: '42501' };
const CLOSED = { code: 'TL009' };

async function createDossier(userId: string) {
  const { rows } = await asUser(db, userId, () =>
    db.query<{ id: string }>(
      `select public.create_dossier_with_person('death', 'Jean', 'Ndong', 'GA', 'Libreville', '') as id`,
    ),
  );
  return rows[0]!.id;
}

/** Dossier neuf du propriétaire, avec un membre de chaque rôle. */
async function freshDossier() {
  const id = await createDossier(owner);
  const roles: [string, string][] = [
    [coordinator, 'coordinator'],
    [treasurer, 'treasurer'],
    [contributor, 'contributor'],
    [viewer, 'viewer'],
  ];
  for (const [user, role] of roles) {
    await db.query(`insert into dossier_member (dossier_id, user_id, role) values ($1, $2, $3)`, [
      id,
      user,
      role,
    ]);
  }
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

beforeAll(async () => {
  db = await createTestDb();
  owner = await createUser(db, 'owner@test.local');
  coordinator = await createUser(db, 'coordinator@test.local');
  treasurer = await createUser(db, 'treasurer@test.local');
  contributor = await createUser(db, 'contributor@test.local');
  viewer = await createUser(db, 'viewer@test.local');
  stranger = await createUser(db, 'stranger@test.local');
});

afterAll(async () => {
  await db?.close();
});

describe('close_ledger', () => {
  it('clôture par un trésorier, une seule fois, et le journalise', async () => {
    const id = await freshDossier();
    const first = await close(treasurer, id);
    const state = await closure(id);
    expect(state.closed_by).toBe(treasurer);
    expect(state.closed_at).not.toBeNull();
    // WHY: une seconde clôture (double clic, autre trésorier) garde la date et l'auteur.
    const second = await close(coordinator, id);
    expect(new Date(second.rows[0]!.closed_at).getTime()).toBe(
      new Date(first.rows[0]!.closed_at).getTime(),
    );
    expect((await closure(id)).closed_by).toBe(treasurer);
    expect(await events(id)).toEqual([{ action: 'close', actor_id: treasurer }]);
  });

  it('refuse un contributeur, un lecteur, un non-membre, un visiteur et une session sans utilisateur', async () => {
    const id = await freshDossier();
    for (const user of [contributor, viewer, stranger]) {
      await expect(close(user, id)).rejects.toMatchObject(DENIED);
    }
    await expect(
      asRole(db, 'anon', null, () => db.query('select public.close_ledger($1)', [id])),
    ).rejects.toMatchObject(DENIED);
    await expect(
      asRole(db, 'authenticated', null, () => db.query('select public.close_ledger($1)', [id])),
    ).rejects.toMatchObject({ code: '28000' });
    expect((await closure(id)).closed_at).toBeNull();
  });
});

describe('reopen_ledger', () => {
  it('rouvre par le propriétaire seul et le journalise', async () => {
    const id = await freshDossier();
    await close(treasurer, id);
    for (const user of [treasurer, coordinator]) {
      await expect(reopen(user, id)).rejects.toMatchObject(DENIED);
    }
    await reopen(owner, id);
    expect(await closure(id)).toEqual({ closed_at: null, closed_by: null });
    expect(await events(id)).toEqual([
      { action: 'close', actor_id: treasurer },
      { action: 'reopen', actor_id: owner },
    ]);
  });

  it('ne fait rien sur un dossier ouvert', async () => {
    const id = await freshDossier();
    await reopen(owner, id);
    expect(await events(id)).toEqual([]);
  });
});

describe('colonnes et journal de clôture', () => {
  it('ne laisse écrire la clôture et le journal que par les fonctions', async () => {
    const id = await freshDossier();
    await close(treasurer, id);
    await expect(
      asUser(db, owner, () =>
        db.query('update dossier_finance set closed_at = null where dossier_id = $1', [id]),
      ),
    ).rejects.toMatchObject(DENIED);
    await expect(
      asUser(db, owner, () =>
        db.query('update dossier_finance set closed_by = $2 where dossier_id = $1', [id, owner]),
      ),
    ).rejects.toMatchObject(DENIED);
    const other = await freshDossier();
    await expect(
      asUser(db, owner, () =>
        db.query('insert into dossier_finance (dossier_id, closed_at) values ($1, now())', [other]),
      ),
    ).rejects.toMatchObject(DENIED);
    await expect(
      asUser(db, owner, () =>
        db.query(`insert into ledger_closure_event (dossier_id, action) values ($1, 'close')`, [
          id,
        ]),
      ),
    ).rejects.toMatchObject(DENIED);
  });

  it('garde le réglage de visibilité modifiable par le propriétaire, même clôturé', async () => {
    const id = await freshDossier();
    await close(treasurer, id);
    // WHY: requête de l'upsert de PostgREST (supabase-js), qui réécrit aussi dossier_id.
    await asUser(db, owner, () =>
      db.query(
        `insert into dossier_finance (dossier_id, amounts_visibility) values ($1, 'members')
         on conflict (dossier_id) do update
           set dossier_id = excluded.dossier_id, amounts_visibility = excluded.amounts_visibility`,
        [id],
      ),
    );
    const { rows } = await db.query<{ amounts_visibility: string }>(
      'select amounts_visibility from dossier_finance where dossier_id = $1',
      [id],
    );
    expect(rows[0]?.amounts_visibility).toBe('members');
    expect((await closure(id)).closed_by).toBe(treasurer);
  });

  it('ouvre le journal au trésorier et plus, pas aux autres membres', async () => {
    const id = await freshDossier();
    await close(treasurer, id);
    const count = async (user: string) =>
      (
        await asUser(db, user, () =>
          db.query('select id from ledger_closure_event where dossier_id = $1', [id]),
        )
      ).rows.length;
    expect(await count(treasurer)).toBe(1);
    expect(await count(owner)).toBe(1);
    expect(await count(contributor)).toBe(0);
    expect(await count(viewer)).toBe(0);
    expect(await count(stranger)).toBe(0);
  });

  it('laisse lire les totaux d’un dossier clôturé', async () => {
    const id = await freshDossier();
    await addEntry(treasurer, id, 'receipt');
    await close(treasurer, id);
    const { rows } = await asUser(db, viewer, () =>
      db.query<{ received: number | string }>('select received from public.ledger_totals($1)', [
        id,
      ]),
    );
    expect(Number(rows[0]!.received)).toBe(10_000);
  });
});

describe('écritures refusées une fois clôturé', () => {
  it('refuse toute ligne du registre, annulations et promesses comprises', async () => {
    const id = await freshDossier();
    const key = randomUUID();
    const entry = await addEntry(treasurer, id, 'receipt', key);
    await close(treasurer, id);
    await expect(addEntry(treasurer, id, 'receipt')).rejects.toMatchObject(CLOSED);
    await expect(addEntry(treasurer, id, 'expense')).rejects.toMatchObject(CLOSED);
    await expect(addEntry(contributor, id, 'pledge')).rejects.toMatchObject(CLOSED);
    await expect(reverse(treasurer, id, entry)).rejects.toMatchObject(CLOSED);
    // WHY: le rejeu d'une ligne déjà enregistrée reste un double envoi (23505), pour que le dépôt
    // renvoie la ligne existante.
    await expect(addEntry(treasurer, id, 'receipt', key)).rejects.toMatchObject({
      code: '23505',
    });
    // WHY: le rôle est vérifié avant la clôture : un non-membre ou un lecteur ne sonde pas l'état.
    await expect(addEntry(stranger, id, 'receipt')).rejects.toMatchObject(DENIED);
    await expect(addEntry(viewer, id, 'pledge')).rejects.toMatchObject(DENIED);
  });

  it('refuse de créer, modifier ou supprimer un poste, et de changer le scénario', async () => {
    const id = await freshDossier();
    const line = await addLine(treasurer, id);
    await close(treasurer, id);
    await expect(addLine(treasurer, id)).rejects.toMatchObject(CLOSED);
    await expect(
      asUser(db, treasurer, () =>
        db.query(`update budget_line set label = 'Gerbes' where id = $1`, [line]),
      ),
    ).rejects.toMatchObject(CLOSED);
    await expect(
      asUser(db, treasurer, () => db.query('delete from budget_line where id = $1', [line])),
    ).rejects.toMatchObject(CLOSED);
    await expect(
      asUser(db, treasurer, () =>
        db.query('select public.set_budget_scenario($1, $2)', [id, 'sober']),
      ),
    ).rejects.toMatchObject(CLOSED);
    // WHY: la RLS écarte la ligne avant le trigger : un contributeur obtient une mise à jour sans
    // effet, pas TL009.
    const ignored = await asUser(db, contributor, () =>
      db.query(`update budget_line set label = 'Gerbes' where id = $1`, [line]),
    );
    expect(ignored.affectedRows ?? 0).toBe(0);
    await expect(addLine(stranger, id)).rejects.toMatchObject(DENIED);
  });

  it('refuse de préparer ou de rattacher un reçu', async () => {
    const id = await freshDossier();
    const receipt = await prepareReceipt(treasurer, id);
    await db.query(`insert into storage.objects (bucket_id, name) values ('receipts', $1)`, [
      receipt.storage_path,
    ]);
    const expense = await addEntry(treasurer, id, 'expense');
    await close(treasurer, id);
    await expect(prepareReceipt(treasurer, id)).rejects.toMatchObject(CLOSED);
    await expect(
      asUser(db, treasurer, () =>
        db.query('update receipt set entry_id = $2 where id = $1', [receipt.id, expense]),
      ),
    ).rejects.toMatchObject(CLOSED);
    await expect(prepareReceipt(stranger, id)).rejects.toMatchObject(DENIED);
  });

  it('permet de nouveau les écritures après la réouverture', async () => {
    const id = await freshDossier();
    await close(treasurer, id);
    await reopen(owner, id);
    expect(await addEntry(treasurer, id, 'receipt')).toBeTruthy();
    expect(await addLine(treasurer, id)).toBeTruthy();
    expect((await prepareReceipt(treasurer, id)).id).toBeTruthy();
  });
});

describe('suppression d’un dossier clôturé', () => {
  it('garde un dossier qui a un registre, même clôturé', async () => {
    const id = await freshDossier();
    await addEntry(treasurer, id, 'receipt');
    await close(treasurer, id);
    // WHY: « on delete restrict » lève restrict_violation (23001) : aucune ligne financière ne part.
    await expect(
      asUser(db, owner, () => db.query('delete from dossier where id = $1', [id])),
    ).rejects.toMatchObject({ code: '23001' });
  });

  it('supprime un dossier clôturé sans registre, avec ses postes et son journal', async () => {
    const id = await freshDossier();
    await addLine(treasurer, id);
    await close(treasurer, id);
    const result = await asUser(db, owner, () =>
      db.query('delete from dossier where id = $1', [id]),
    );
    expect(result.affectedRows).toBe(1);
    expect((await db.query('select 1 from budget_line where dossier_id = $1', [id])).rows).toEqual(
      [],
    );
    expect(await events(id)).toEqual([]);
  });
});
