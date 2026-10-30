import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { asAdmin, asRole, asUser } from './helpers/db';
import { DENIED, createProviderFixture, type ProviderFixture } from './helpers/providers';

const NUMBER = '+24177123456';

let f: ProviderFixture;
let verified: string;
let example: string;
let inactive: string;
let unverified: string;

const requestQuote = (userId: string, providerId: string, stepId = 'vigil-setup') =>
  asUser(f.db, userId, () =>
    f.db.query<{ whatsapp: string }>(
      `select public.request_quote($1, $2, $3, 'Bonjour, une tente pour samedi.') as whatsapp`,
      [f.dossierId, providerId, stepId],
    ),
  );

const quotesFor = (providerId: string) =>
  f.db
    .query<{ created_by: string; provider_name: string }>(
      'select created_by, provider_name from quote_request where provider_id = $1',
      [providerId],
    )
    .then(({ rows }) => rows);

beforeAll(async () => {
  f = await createProviderFixture();
  const reachable = { whatsapp: NUMBER, verified_at: new Date() };
  verified = await f.insertProvider(reachable);
  example = await f.insertProvider({ name: 'Tentes de test', is_example: true });
  inactive = await f.insertProvider({ ...reachable, active: false });
  unverified = await f.insertProvider({ whatsapp: '+24166123456' });
});

afterAll(async () => {
  await f?.db.close();
});

describe('provider.whatsapp : lecture directe fermée', () => {
  it('refuse la colonne à un utilisateur connecté, administrateur compris', async () => {
    for (const run of [
      (sql: string) => asUser(f.db, f.owner, () => f.db.query(sql)),
      (sql: string) => asAdmin(f.db, f.admin, () => f.db.query(sql)),
    ]) {
      await expect(run('select whatsapp from provider')).rejects.toMatchObject(DENIED);
      await expect(run('select * from provider')).rejects.toMatchObject(DENIED);
    }
  });

  it('refuse un filtre sur la colonne, qui permettrait de deviner le numéro', async () => {
    await expect(
      asUser(f.db, f.owner, () =>
        f.db.query(`select id from provider where whatsapp like '+241%'`),
      ),
    ).rejects.toMatchObject(DENIED);
  });

  it('laisse lire les autres colonnes de l’encadré', async () => {
    const { rows } = await asUser(f.db, f.owner, () =>
      f.db.query<{ id: string }>(
        `select id, category_key, name, city, district, price_note, is_example, verified_at, active
         from provider where id = $1`,
        [verified],
      ),
    );
    expect(rows.map((r) => r.id)).toEqual([verified]);
  });

  it('laisse un administrateur créer et modifier un prestataire avec son numéro', async () => {
    const { rows } = await asAdmin(f.db, f.admin, () =>
      f.db.query<{ id: string }>(
        `insert into provider (category_key, name, city, whatsapp)
         values ('sound', 'Sono neuve', 'Libreville', '+24177111111') returning id`,
      ),
    );
    const id = rows[0]!.id;
    await asAdmin(f.db, f.admin, () =>
      f.db.query(
        `update provider set whatsapp = '+24177222222', verified_at = now() where id = $1`,
        [id],
      ),
    );
    const { rows: stored } = await f.db.query<{ whatsapp: string }>(
      'select whatsapp from provider where id = $1',
      [id],
    );
    expect(stored[0]!.whatsapp).toBe('+24177222222');
  });
});

describe('request_quote', () => {
  it('trace la demande et renvoie le numéro en un seul appel', async () => {
    const { rows } = await requestQuote(f.coordinator, verified);
    expect(rows[0]!.whatsapp).toBe(NUMBER);
    expect(await quotesFor(verified)).toEqual([
      { created_by: f.coordinator, provider_name: 'Tentes Akanda' },
    ]);
  });

  it('refuse un contributeur, un lecteur et un non-membre (42501) avant le prestataire', async () => {
    for (const user of [f.contributor, f.viewer, f.stranger]) {
      for (const provider of [verified, example]) {
        await expect(requestQuote(user, provider)).rejects.toMatchObject(DENIED);
      }
    }
  });

  it('refuse un prestataire d’exemple, inactif, non vérifié ou inexistant (TL010)', async () => {
    for (const provider of [example, inactive, unverified, randomUUID()]) {
      await expect(requestQuote(f.owner, provider)).rejects.toMatchObject({ code: 'TL010' });
      expect(await quotesFor(provider)).toEqual([]);
    }
  });

  it('refuse une étape inconnue sans rien tracer', async () => {
    const target = await f.insertProvider({ whatsapp: '+24177333333', verified_at: new Date() });
    await expect(requestQuote(f.owner, target, 'burial')).rejects.toMatchObject({
      code: '23514',
    });
    expect(await quotesFor(target)).toEqual([]);
  });

  it('refuse un appel sans utilisateur (28000)', async () => {
    await expect(
      asRole(f.db, 'authenticated', null, () =>
        f.db.query(`select public.request_quote($1, $2, 'vigil-setup', 'Bonjour.')`, [
          f.dossierId,
          verified,
        ]),
      ),
    ).rejects.toMatchObject({ code: '28000' });
  });

  it('refuse un appel anonyme', async () => {
    await expect(
      asRole(f.db, 'anon', null, () =>
        f.db.query(`select public.request_quote($1, $2, 'vigil-setup', 'Bonjour.')`, [
          f.dossierId,
          verified,
        ]),
      ),
    ).rejects.toMatchObject(DENIED);
  });
});
