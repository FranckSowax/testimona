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
