import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { asRole, asUser } from './helpers/db';
import { DENIED, createProviderFixture, type ProviderFixture } from './helpers/providers';

let f: ProviderFixture;
let verified: string;
let example: string;
let inactive: string;
let unverified: string;
let noNumber: string;

/**
 * Envoie volontairement un `created_by` falsifié (le propriétaire) : le trigger doit le remplacer
 * par l'auteur réel. `createdAt` et `stepId` permettent de tester d'autres falsifications.
 */
const requestQuoteWithForgedAuthor = (
  userId: string,
  providerId: string,
  options: { stepId?: string; createdAt?: string } = {},
) =>
  asUser(f.db, userId, () =>
    f.db.query<{ id: string; created_by: string | null; created_at: Date }>(
      `insert into quote_request (dossier_id, provider_id, step_id, message, created_by, created_at)
       values ($1, $2, $3, 'Bonjour, une tente pour samedi.', $4, coalesce($5::timestamptz, now()))
       returning id, created_by, created_at`,
      [
        f.dossierId,
        providerId,
        options.stepId ?? 'vigil-setup',
        f.owner,
        options.createdAt ?? null,
      ],
    ),
  );

const countQuotes = (userId: string) =>
  asUser(f.db, userId, () =>
    f.db.query<{ n: number }>('select count(*)::int as n from quote_request'),
  ).then(({ rows }) => rows[0]!.n);

beforeAll(async () => {
  f = await createProviderFixture();
  const reachable = { whatsapp: '+24177123456', verified_at: new Date() };
  verified = await f.insertProvider(reachable);
  example = await f.insertProvider({ name: 'Tentes de test', is_example: true });
  inactive = await f.insertProvider({ ...reachable, active: false });
  unverified = await f.insertProvider({ whatsapp: '+24166123456' });
  noNumber = await f.insertProvider({ verified_at: new Date() });
  await requestQuoteWithForgedAuthor(f.coordinator, verified);
});

afterAll(async () => {
  await f?.db.close();
});

describe('quote_request', () => {
  it('laisse un coordinateur demander un devis et impose l’auteur', async () => {
    const { rows } = await requestQuoteWithForgedAuthor(f.coordinator, verified);
    expect(rows[0]!.created_by).toBe(f.coordinator);
  });

  it('remplace une date de création falsifiée par l’heure du serveur', async () => {
    const { rows } = await requestQuoteWithForgedAuthor(f.owner, verified, {
      createdAt: '2000-01-01T00:00:00Z',
    });
    expect(rows[0]!.created_at.getFullYear()).toBeGreaterThan(2020);
  });

  it('refuse un prestataire d’exemple, inactif, non vérifié ou sans numéro (TL010)', async () => {
    for (const provider of [example, inactive, unverified, noNumber]) {
      await expect(requestQuoteWithForgedAuthor(f.owner, provider)).rejects.toMatchObject({
        code: 'TL010',
      });
    }
  });

  it('refuse un prestataire inexistant avec TL010, pas 23503', async () => {
    await expect(requestQuoteWithForgedAuthor(f.owner, randomUUID())).rejects.toMatchObject({
      code: 'TL010',
    });
  });

  it('refuse un contributeur et un non-membre avant d’examiner le prestataire', async () => {
    for (const user of [f.contributor, f.stranger]) {
      await expect(requestQuoteWithForgedAuthor(user, example)).rejects.toMatchObject(DENIED);
    }
  });

  it('refuse une étape inconnue', async () => {
    await expect(
      requestQuoteWithForgedAuthor(f.owner, verified, { stepId: 'burial' }),
    ).rejects.toMatchObject({ code: '23514' });
  });

  it('montre les demandes aux membres du dossier, lecteur compris, et à eux seuls', async () => {
    expect(await countQuotes(f.contributor)).toBeGreaterThan(0);
    expect(await countQuotes(f.viewer)).toBeGreaterThan(0);
    expect(await countQuotes(f.stranger)).toBe(0);
  });

  it('refuse tout accès anonyme', async () => {
    await expect(
      asRole(f.db, 'anon', null, () => f.db.query('select id from quote_request')),
    ).rejects.toMatchObject(DENIED);
  });

  it('interdit la modification et la suppression', async () => {
    await expect(
      asUser(f.db, f.owner, () => f.db.query(`update quote_request set message = 'x'`)),
    ).rejects.toMatchObject(DENIED);
    await expect(
      asUser(f.db, f.owner, () => f.db.query('delete from quote_request')),
    ).rejects.toMatchObject(DENIED);
  });
});
