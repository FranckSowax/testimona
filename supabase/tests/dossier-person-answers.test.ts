import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { applyMigrations, asRole, asUser, createTestDb, createUser } from './helpers/db';

let db: PGlite;
let owner: string;
let coordinator: string;
let viewer: string;
let outsider: string;
let dossierId: string;
let outsiderDossierId: string;

const RLS_DENIED = { code: '42501' };
const CHECK_VIOLATION = { code: '23514' };

function createDossier(userId: string, firstName: string, lastName: string) {
  return asUser(db, userId, () =>
    db.query<{ id: string }>(
      `select public.create_dossier_with_person('death', $1, $2, 'GA', 'Libreville', '') as id`,
      [firstName, lastName],
    ),
  );
}

function addMember(by: string, userId: string, role: string, displayName: string | null = null) {
  return asUser(db, by, () =>
    db.query(
      `insert into dossier_member (dossier_id, user_id, role, display_name) values ($1, $2, $3, $4)`,
      [dossierId, userId, role, displayName],
    ),
  );
}

async function displayNameOf(userId: string, dossier = dossierId) {
  const { rows } = await db.query<{ display_name: string | null }>(
    'select display_name from dossier_member where dossier_id = $1 and user_id = $2',
    [dossier, userId],
  );
  return rows[0]?.display_name;
}

beforeAll(async () => {
  db = await createTestDb();
  owner = await createUser(db, 'owner@test.local');
  coordinator = await createUser(db, 'coordinator@test.local');
  viewer = await createUser(db, 'viewer@test.local');
  outsider = await createUser(db, 'outsider@test.local');
  const { rows } = await asUser(db, owner, () =>
    db.query<{ id: string }>(
      `select public.create_dossier_with_person('death', ' Jean ', 'Ndong', 'ga', ' Libreville ', 'child') as id`,
    ),
  );
  dossierId = rows[0]!.id;
  outsiderDossierId = (await createDossier(outsider, 'Marie', 'Obame')).rows[0]!.id;
  await addMember(owner, coordinator, 'coordinator');
  await addMember(owner, viewer, 'viewer');
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

  it('tronque le titre dérivé à 200 caractères pour un nom long', async () => {
    const first = 'A'.repeat(120);
    const last = 'B'.repeat(120);
    const { rows } = await createDossier(owner, first, last);
    const dossier = await db.query<{ title: string }>('select title from dossier where id = $1', [
      rows[0]!.id,
    ]);
    expect(dossier.rows[0]?.title).toBe(`${first} ${last}`.slice(0, 200));
    const person = await db.query<{ first_name: string; last_name: string }>(
      'select first_name, last_name from person where dossier_id = $1',
      [rows[0]!.id],
    );
    expect(person.rows[0]).toEqual({ first_name: first, last_name: last });
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

describe('dossier_member.display_name', () => {
  it("n'expose pas l'e-mail : sans pseudonyme ni nom complet, le nom reste vide", async () => {
    expect(await displayNameOf(owner)).toBeNull();
  });

  it('préfère le pseudonyme, puis le nom complet', async () => {
    const nick = await createUser(db, 'nick@test.local');
    const full = await createUser(db, 'full@test.local');
    await db.query(
      `update auth.users set raw_user_meta_data = '{"nickname": "Tonton", "full_name": "Paul Mba"}' where id = $1`,
      [nick],
    );
    await db.query(
      `update auth.users set raw_user_meta_data = '{"full_name": "Paul Mba"}' where id = $1`,
      [full],
    );
    await addMember(owner, nick, 'viewer');
    await addMember(owner, full, 'viewer');
    expect(await displayNameOf(nick)).toBe('Tonton');
    expect(await displayNameOf(full)).toBe('Paul Mba');
  });

  it('écrase un nom affiché fourni à l’insertion', async () => {
    const spoofer = await createUser(db, 'spoofer@test.local');
    await addMember(owner, spoofer, 'viewer', 'Notaire officiel');
    expect(await displayNameOf(spoofer)).toBeNull();
  });

  it('empêche un coordinateur de renommer un autre membre', async () => {
    await asUser(db, coordinator, () =>
      db.query(
        `update dossier_member set display_name = 'Notaire officiel' where dossier_id = $1 and user_id = $2`,
        [dossierId, viewer],
      ),
    );
    expect(await displayNameOf(viewer)).toBeNull();
  });
});

describe('dossier_member.display_name : backfill', () => {
  it('remplit le nom affiché des membres existants', async () => {
    const stamp = '20261027000200';
    const legacy = await createTestDb({ before: stamp });
    try {
      const user = await createUser(legacy, 'ancien@test.local');
      await legacy.query(
        `update auth.users set raw_user_meta_data = '{"nickname": "Ancien"}' where id = $1`,
        [user],
      );
      const { rows } = await legacy.query<{ id: string }>(
        `insert into dossier (created_by, title, country_code, city, entry_point)
         values ($1, 'Ancien dossier', 'GA', 'Libreville', 'death') returning id`,
        [user],
      );
      await applyMigrations(legacy, (file) => file >= stamp);
      const member = await legacy.query<{ display_name: string }>(
        'select display_name from dossier_member where dossier_id = $1 and user_id = $2',
        [rows[0]!.id, user],
      );
      expect(member.rows[0]?.display_name).toBe('Ancien');
    } finally {
      await legacy.close();
    }
  });
});

describe('person et journey_answer : RLS', () => {
  it('montre la personne et les réponses aux membres', async () => {
    const person = await asUser(db, viewer, () =>
      db.query('select * from person where dossier_id = $1', [dossierId]),
    );
    const answers = await asUser(db, viewer, () =>
      db.query(
        `select * from journey_answer where dossier_id = $1 and key = 'creator.relationship'`,
        [dossierId],
      ),
    );
    expect(person.rows).toHaveLength(1);
    expect(answers.rows).toHaveLength(1);
  });

  it('cache la personne et les réponses aux non-membres', async () => {
    const person = await asUser(db, outsider, () =>
      db.query('select * from person where dossier_id = $1', [dossierId]),
    );
    const answers = await asUser(db, outsider, () =>
      db.query('select * from journey_answer where dossier_id = $1', [dossierId]),
    );
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

  it('interdit à un lecteur de modifier la personne', async () => {
    const readNickname = async () => {
      const { rows } = await db.query<{ nickname: string | null }>(
        'select nickname from person where dossier_id = $1',
        [dossierId],
      );
      return rows[0]?.nickname;
    };
    const before = await readNickname();
    const result = await asUser(db, viewer, () =>
      db.query(`update person set nickname = 'Piratage' where dossier_id = $1`, [dossierId]),
    );
    expect(result.affectedRows).toBe(0);
    expect(await readNickname()).toBe(before);
  });

  it('interdit à un lecteur de supprimer une réponse', async () => {
    const result = await asUser(db, viewer, () =>
      db.query(
        `delete from journey_answer where dossier_id = $1 and key = 'creator.relationship'`,
        [dossierId],
      ),
    );
    expect(result.affectedRows).toBe(0);
    const { rows } = await db.query(
      `select 1 from journey_answer where dossier_id = $1 and key = 'creator.relationship'`,
      [dossierId],
    );
    expect(rows).toHaveLength(1);
  });

  it("interdit à un non-membre d'écrire dans le dossier d'un autre", async () => {
    await expect(
      asUser(db, outsider, () =>
        db.query(`insert into person (dossier_id, first_name, last_name) values ($1, 'X', 'Y')`, [
          dossierId,
        ]),
      ),
    ).rejects.toMatchObject(RLS_DENIED);
    await expect(
      asUser(db, outsider, () =>
        db.query(
          `insert into journey_answer (dossier_id, key, value) values ($1, 'death.city', '"X"')`,
          [dossierId],
        ),
      ),
    ).rejects.toMatchObject(RLS_DENIED);
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
    await expect(attempt).rejects.toMatchObject(CHECK_VIOLATION);
  });

  it('refuse une réponse de plus de 64 Kio', async () => {
    const attempt = asUser(db, owner, () =>
      db.query(
        `insert into journey_answer (dossier_id, key, value) values ($1, 'death.note', to_jsonb(repeat('x', 70000)))`,
        [dossierId],
      ),
    );
    await expect(attempt).rejects.toMatchObject(CHECK_VIOLATION);
  });

  it('refuse une date de décès antérieure à la naissance', async () => {
    const attempt = asUser(db, owner, () =>
      db.query(
        `update person set birth_date = '1990-01-01', death_date = '1980-01-01' where dossier_id = $1`,
        [dossierId],
      ),
    );
    await expect(attempt).rejects.toMatchObject(CHECK_VIOLATION);
  });

  it('fige la date de création et le dossier de la personne', async () => {
    const before = await db.query<{ created_at: Date }>(
      'select created_at from person where dossier_id = $1',
      [dossierId],
    );
    const { rows } = await asUser(db, owner, () =>
      db.query<{ id: string }>(
        `insert into dossier (title, country_code, city, entry_point)
         values ('Sans personne', 'GA', 'Libreville', 'death') returning id`,
      ),
    );
    await asUser(db, owner, () =>
      db.query(
        `update person set created_at = '2000-01-01', dossier_id = $2, nickname = 'Jeannot' where dossier_id = $1`,
        [dossierId, rows[0]!.id],
      ),
    );
    const after = await db.query<{ created_at: Date; nickname: string }>(
      'select created_at, nickname from person where dossier_id = $1',
      [dossierId],
    );
    expect(after.rows[0]).toEqual({ created_at: before.rows[0]!.created_at, nickname: 'Jeannot' });
    const moved = await db.query('select 1 from person where dossier_id = $1', [rows[0]!.id]);
    expect(moved.rows).toEqual([]);
  });

  it('isole aussi le dossier du non-membre', async () => {
    const { rows } = await asUser(db, owner, () =>
      db.query('select * from person where dossier_id = $1', [outsiderDossierId]),
    );
    expect(rows).toEqual([]);
  });
});

describe('person et journey_answer : schéma', () => {
  it("indexe l'auteur des réponses", async () => {
    const { rows } = await db.query<{ indexdef: string }>(
      `select indexdef from pg_indexes where schemaname = 'public' and indexname = 'journey_answer_answered_by_idx'`,
    );
    expect(rows[0]?.indexdef).toMatch(/\(answered_by\)/);
  });

  it('retire truncate, trigger et references aux utilisateurs connectés', async () => {
    for (const table of ['public.person', 'public.journey_answer']) {
      for (const privilege of ['TRUNCATE', 'TRIGGER', 'REFERENCES']) {
        const { rows } = await db.query<{ granted: boolean }>(
          'select has_table_privilege($1, $2, $3) as granted',
          ['authenticated', table, privilege],
        );
        expect(rows[0]?.granted, `${table} ${privilege}`).toBe(false);
      }
    }
  });
});
