import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { asUser, createUser } from './helpers/db';
import { CLOSED, type ClosingFixture, createClosingFixture, DENIED } from './helpers/finance';

let f: ClosingFixture;

beforeAll(async () => {
  f = await createClosingFixture();
});

afterAll(async () => {
  await f?.db.close();
});

describe('écritures refusées une fois clôturé', () => {
  it('refuse toute ligne du registre, annulations et promesses comprises', async () => {
    const id = await f.freshDossier();
    const key = randomUUID();
    const entry = await f.addEntry(f.treasurer, id, 'receipt', key);
    await f.close(f.treasurer, id);
    await expect(f.addEntry(f.treasurer, id, 'receipt')).rejects.toMatchObject(CLOSED);
    await expect(f.addEntry(f.treasurer, id, 'expense')).rejects.toMatchObject(CLOSED);
    await expect(f.addEntry(f.contributor, id, 'pledge')).rejects.toMatchObject(CLOSED);
    await expect(f.reverse(f.treasurer, id, entry)).rejects.toMatchObject(CLOSED);
    // WHY: le rejeu d'une ligne déjà enregistrée reste un double envoi (23505), pour que le dépôt
    // renvoie la ligne existante.
    await expect(f.addEntry(f.treasurer, id, 'receipt', key)).rejects.toMatchObject({
      code: '23505',
    });
    // WHY: le rôle est vérifié avant la clôture : un non-membre ou un lecteur ne sonde pas l'état.
    await expect(f.addEntry(f.stranger, id, 'receipt')).rejects.toMatchObject(DENIED);
    await expect(f.addEntry(f.viewer, id, 'pledge')).rejects.toMatchObject(DENIED);
  });

  it('refuse de créer, modifier ou supprimer un poste, et de changer le scénario', async () => {
    const id = await f.freshDossier();
    const line = await f.addLine(f.treasurer, id);
    await f.close(f.treasurer, id);
    await expect(f.addLine(f.treasurer, id)).rejects.toMatchObject(CLOSED);
    await expect(
      asUser(f.db, f.treasurer, () =>
        f.db.query(`update budget_line set label = 'Gerbes' where id = $1`, [line]),
      ),
    ).rejects.toMatchObject(CLOSED);
    await expect(
      asUser(f.db, f.treasurer, () => f.db.query('delete from budget_line where id = $1', [line])),
    ).rejects.toMatchObject(CLOSED);
    await expect(
      asUser(f.db, f.treasurer, () =>
        f.db.query('select public.set_budget_scenario($1, $2)', [id, 'sober']),
      ),
    ).rejects.toMatchObject(CLOSED);
    // WHY: la RLS écarte la ligne avant le trigger : un contributeur obtient une mise à jour sans
    // effet, pas TL009.
    const ignored = await asUser(f.db, f.contributor, () =>
      f.db.query(`update budget_line set label = 'Gerbes' where id = $1`, [line]),
    );
    expect(ignored.affectedRows ?? 0).toBe(0);
    await expect(f.addLine(f.stranger, id)).rejects.toMatchObject(DENIED);
  });

  it('refuse de préparer ou de rattacher un reçu', async () => {
    const id = await f.freshDossier();
    const receipt = await f.prepareReceipt(f.treasurer, id);
    await f.upload(receipt.storage_path);
    const expense = await f.addEntry(f.treasurer, id, 'expense');
    await f.close(f.treasurer, id);
    await expect(f.prepareReceipt(f.treasurer, id)).rejects.toMatchObject(CLOSED);
    await expect(f.attach(f.treasurer, receipt.id, expense)).rejects.toMatchObject(CLOSED);
    await expect(f.prepareReceipt(f.stranger, id)).rejects.toMatchObject(DENIED);
  });

  it('laisse sans effet le rejeu d’un rattachement déjà fait, même clôturé', async () => {
    const id = await f.freshDossier();
    const receipt = await f.prepareReceipt(f.treasurer, id);
    await f.upload(receipt.storage_path);
    const expense = await f.addEntry(f.treasurer, id, 'expense');
    await f.attach(f.treasurer, receipt.id, expense);
    await f.close(f.treasurer, id);
    // WHY: un double envoi du formulaire après la clôture ne doit pas échouer : rien ne change.
    const replay = await f.attach(f.treasurer, receipt.id, expense);
    expect(replay.affectedRows).toBe(1);
    const { rows } = await f.db.query<{ entry_id: string }>(
      'select entry_id from receipt where id = $1',
      [receipt.id],
    );
    expect(rows).toEqual([{ entry_id: expense }]);
  });

  it('permet de nouveau les écritures après la réouverture', async () => {
    const id = await f.freshDossier();
    await f.close(f.treasurer, id);
    await f.reopen(f.owner, id);
    expect(await f.addEntry(f.treasurer, id, 'receipt')).toBeTruthy();
    expect(await f.addLine(f.treasurer, id)).toBeTruthy();
    expect((await f.prepareReceipt(f.treasurer, id)).id).toBeTruthy();
  });
});

describe('suppressions liées', () => {
  it('garde un dossier qui a un registre, même clôturé', async () => {
    const id = await f.freshDossier();
    await f.addEntry(f.treasurer, id, 'receipt');
    await f.close(f.treasurer, id);
    // WHY: « on delete restrict » lève restrict_violation (23001) : aucune ligne financière ne part.
    await expect(
      asUser(f.db, f.owner, () => f.db.query('delete from dossier where id = $1', [id])),
    ).rejects.toMatchObject({ code: '23001' });
  });

  it('supprime un dossier clôturé sans registre, avec ses postes et son journal', async () => {
    const id = await f.freshDossier();
    await f.addLine(f.treasurer, id);
    await f.close(f.treasurer, id);
    const result = await asUser(f.db, f.owner, () =>
      f.db.query('delete from dossier where id = $1', [id]),
    );
    expect(result.affectedRows).toBe(1);
    expect(
      (await f.db.query('select 1 from budget_line where dossier_id = $1', [id])).rows,
    ).toEqual([]);
    expect(await f.events(id)).toEqual([]);
  });

  it('met à null l’auteur d’un reçu qui supprime son compte, même clôturé', async () => {
    const id = await f.freshDossier();
    const leaver = await createUser(f.db, 'receipt-leaver@test.local');
    await f.addMember(id, leaver, 'treasurer');
    const receipt = await f.prepareReceipt(leaver, id);
    await f.upload(receipt.storage_path);
    await f.attach(leaver, receipt.id, await f.addEntry(leaver, id, 'expense'));
    await f.close(f.treasurer, id);
    await f.db.query('delete from auth.users where id = $1', [leaver]);
    const { rows } = await f.db.query<{ created_by: string | null }>(
      'select created_by from receipt where id = $1',
      [receipt.id],
    );
    expect(rows).toEqual([{ created_by: null }]);
  });
});
