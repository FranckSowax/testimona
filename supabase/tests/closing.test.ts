import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { asRole, asUser, createUser } from './helpers/db';
import { type ClosingFixture, createClosingFixture, DENIED } from './helpers/finance';

let f: ClosingFixture;

beforeAll(async () => {
  f = await createClosingFixture();
});

afterAll(async () => {
  await f?.db.close();
});

/** Appelle une fonction de clôture sans utilisateur, en visiteur ou en connecté. */
const anonymous = (role: 'anon' | 'authenticated', fn: string, dossier: string) =>
  asRole(f.db, role, null, () => f.db.query(`select public.${fn}($1)`, [dossier]));

describe('close_ledger', () => {
  it('clôture par un trésorier, une seule fois, et le journalise', async () => {
    const id = await f.freshDossier();
    const first = await f.close(f.treasurer, id);
    const state = await f.closure(id);
    expect(state.closed_by).toBe(f.treasurer);
    expect(state.closed_at).not.toBeNull();
    // WHY: une seconde clôture (double clic, autre trésorier) garde la date et l'auteur.
    const second = await f.close(f.coordinator, id);
    expect(new Date(second.rows[0]!.closed_at).getTime()).toBe(
      new Date(first.rows[0]!.closed_at).getTime(),
    );
    expect((await f.closure(id)).closed_by).toBe(f.treasurer);
    expect(await f.events(id)).toEqual([{ action: 'close', actor_id: f.treasurer }]);
  });

  it('refuse un contributeur, un lecteur, un non-membre, un visiteur et une session sans utilisateur', async () => {
    const id = await f.freshDossier();
    for (const user of [f.contributor, f.viewer, f.stranger]) {
      await expect(f.close(user, id)).rejects.toMatchObject(DENIED);
    }
    await expect(anonymous('anon', 'close_ledger', id)).rejects.toMatchObject(DENIED);
    await expect(anonymous('authenticated', 'close_ledger', id)).rejects.toMatchObject({
      code: '28000',
    });
    expect((await f.closure(id)).closed_at).toBeNull();
  });

  it('garde le scénario et la visibilité d’une ligne dossier_finance existante', async () => {
    const id = await f.freshDossier();
    await asUser(f.db, f.treasurer, () =>
      f.db.query('select public.set_budget_scenario($1, $2)', [id, 'full']),
    );
    await asUser(f.db, f.owner, () =>
      f.db.query('update dossier_finance set amounts_visibility = $2 where dossier_id = $1', [
        id,
        'members',
      ]),
    );
    await f.close(f.treasurer, id);
    const { rows } = await f.db.query<{ scenario: string; amounts_visibility: string }>(
      'select scenario, amounts_visibility from dossier_finance where dossier_id = $1',
      [id],
    );
    expect(rows).toEqual([{ scenario: 'full', amounts_visibility: 'members' }]);
    expect((await f.closure(id)).closed_by).toBe(f.treasurer);
  });

  it('clôture de nouveau après une réouverture, avec le nouvel auteur', async () => {
    const id = await f.freshDossier();
    await f.close(f.treasurer, id);
    await f.reopen(f.owner, id);
    await f.close(f.coordinator, id);
    expect((await f.closure(id)).closed_by).toBe(f.coordinator);
    expect(await f.events(id)).toEqual([
      { action: 'close', actor_id: f.treasurer },
      { action: 'reopen', actor_id: f.owner },
      { action: 'close', actor_id: f.coordinator },
    ]);
  });
});

describe('reopen_ledger', () => {
  it('rouvre par le propriétaire seul et le journalise', async () => {
    const id = await f.freshDossier();
    await f.close(f.treasurer, id);
    for (const user of [f.treasurer, f.coordinator]) {
      await expect(f.reopen(user, id)).rejects.toMatchObject(DENIED);
    }
    await f.reopen(f.owner, id);
    expect(await f.closure(id)).toEqual({ closed_at: null, closed_by: null });
    expect(await f.events(id)).toEqual([
      { action: 'close', actor_id: f.treasurer },
      { action: 'reopen', actor_id: f.owner },
    ]);
  });

  it('refuse un contributeur, un lecteur, un non-membre, un visiteur et une session sans utilisateur', async () => {
    const id = await f.freshDossier();
    await f.close(f.treasurer, id);
    for (const user of [f.contributor, f.viewer, f.stranger]) {
      await expect(f.reopen(user, id)).rejects.toMatchObject(DENIED);
    }
    await expect(anonymous('anon', 'reopen_ledger', id)).rejects.toMatchObject(DENIED);
    await expect(anonymous('authenticated', 'reopen_ledger', id)).rejects.toMatchObject({
      code: '28000',
    });
    expect((await f.closure(id)).closed_by).toBe(f.treasurer);
  });

  it('ne fait rien sur un dossier ouvert', async () => {
    const id = await f.freshDossier();
    await f.reopen(f.owner, id);
    expect(await f.events(id)).toEqual([]);
  });
});

describe('colonnes et journal de clôture', () => {
  it('ne laisse écrire la clôture et le journal que par les fonctions', async () => {
    const id = await f.freshDossier();
    await f.close(f.treasurer, id);
    const asOwner = (sql: string, params: unknown[]) =>
      asUser(f.db, f.owner, () => f.db.query(sql, params));
    await expect(
      asOwner('update dossier_finance set closed_at = null where dossier_id = $1', [id]),
    ).rejects.toMatchObject(DENIED);
    await expect(
      asOwner('update dossier_finance set closed_by = $2 where dossier_id = $1', [id, f.owner]),
    ).rejects.toMatchObject(DENIED);
    const other = await f.freshDossier();
    await expect(
      asOwner('insert into dossier_finance (dossier_id, closed_at) values ($1, now())', [other]),
    ).rejects.toMatchObject(DENIED);
    await expect(
      asOwner(`insert into ledger_closure_event (dossier_id, action) values ($1, 'close')`, [id]),
    ).rejects.toMatchObject(DENIED);
    await expect(
      asOwner(`update ledger_closure_event set action = 'reopen' where dossier_id = $1`, [id]),
    ).rejects.toMatchObject(DENIED);
    await expect(
      asOwner('delete from ledger_closure_event where dossier_id = $1', [id]),
    ).rejects.toMatchObject(DENIED);
    expect(await f.events(id)).toEqual([{ action: 'close', actor_id: f.treasurer }]);
  });

  it('garde le réglage de visibilité modifiable par le propriétaire, même clôturé', async () => {
    const id = await f.freshDossier();
    await f.close(f.treasurer, id);
    // WHY: requête de l'upsert de PostgREST (supabase-js), qui réécrit aussi dossier_id.
    await asUser(f.db, f.owner, () =>
      f.db.query(
        `insert into dossier_finance (dossier_id, amounts_visibility) values ($1, 'members')
         on conflict (dossier_id) do update
           set dossier_id = excluded.dossier_id, amounts_visibility = excluded.amounts_visibility`,
        [id],
      ),
    );
    const { rows } = await f.db.query<{ amounts_visibility: string }>(
      'select amounts_visibility from dossier_finance where dossier_id = $1',
      [id],
    );
    expect(rows[0]?.amounts_visibility).toBe('members');
    expect((await f.closure(id)).closed_by).toBe(f.treasurer);
  });

  it('ouvre le journal au trésorier et plus, pas aux autres membres', async () => {
    const id = await f.freshDossier();
    await f.close(f.treasurer, id);
    const count = async (user: string) =>
      (
        await asUser(f.db, user, () =>
          f.db.query('select id from ledger_closure_event where dossier_id = $1', [id]),
        )
      ).rows.length;
    expect(await count(f.treasurer)).toBe(1);
    expect(await count(f.coordinator)).toBe(1);
    expect(await count(f.owner)).toBe(1);
    expect(await count(f.contributor)).toBe(0);
    expect(await count(f.viewer)).toBe(0);
    expect(await count(f.stranger)).toBe(0);
  });

  it('laisse lire les totaux d’un dossier clôturé', async () => {
    const id = await f.freshDossier();
    await f.addEntry(f.treasurer, id, 'receipt');
    await f.close(f.treasurer, id);
    const { rows } = await asUser(f.db, f.viewer, () =>
      f.db.query<{ received: number | string }>('select received from public.ledger_totals($1)', [
        id,
      ]),
    );
    expect(Number(rows[0]!.received)).toBe(10_000);
  });

  it('garde le dossier clôturé quand l’auteur de la clôture supprime son compte', async () => {
    const id = await f.freshDossier();
    const leaver = await createUser(f.db, 'closer-leaver@test.local');
    await f.addMember(id, leaver, 'treasurer');
    await f.close(leaver, id);
    await f.db.query('delete from auth.users where id = $1', [leaver]);
    const state = await f.closure(id);
    expect(state.closed_at).not.toBeNull();
    expect(state.closed_by).toBeNull();
    expect(await f.events(id)).toEqual([{ action: 'close', actor_id: null }]);
  });
});
