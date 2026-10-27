import { beforeEach, describe, expect, it, vi } from 'vitest';

// WHY: vi.mock est remonté en tête de fichier ; les doublures doivent donc être
// créées avec vi.hoisted pour exister au moment où les fabriques s'exécutent.
const { repo, email } = vi.hoisted(() => ({
  repo: {
    insertDossierWithPerson: vi.fn(),
    insertInvitation: vi.fn(),
    deleteInvitation: vi.fn(),
    acceptInvitationByToken: vi.fn(),
  },
  email: {
    sendEmail: vi.fn(),
    dossierInviteEmail: vi.fn(() => ({ to: 'x', subject: 's', html: 'h' })),
  },
}));

vi.mock('server-only', () => ({}));
vi.mock('./repo', () => repo);
vi.mock('@/lib/email/resend', () => email);

const service = await import('./service');
const { hashInvitationToken } = await import('./tokens');

const DOSSIER = '44444444-4444-4444-8444-444444444444';
const ctx = {
  siteUrl: 'https://exemple.test',
  locale: 'en',
  inviterName: 'Paul',
  personName: 'Jean Ndong',
};
const validDossier = {
  entryPoint: 'death',
  firstName: 'Jean',
  lastName: 'Ndong',
  countryCode: 'GA',
  city: 'Libreville',
  relationship: 'child',
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('createDossier', () => {
  it('renvoie les erreurs de champ sans toucher la base', async () => {
    const res = await service.createDossier({ entryPoint: 'death', firstName: '' });
    expect(res).toMatchObject({ ok: false, error: 'validation' });
    expect(res.ok === false && res.fieldErrors?.firstName).toBeTruthy();
    expect(repo.insertDossierWithPerson).not.toHaveBeenCalled();
  });

  it("renvoie l'identifiant du dossier créé", async () => {
    repo.insertDossierWithPerson.mockResolvedValue({ data: DOSSIER, error: null });
    expect(await service.createDossier(validDossier)).toEqual({ ok: true, data: { id: DOSSIER } });
  });

  it('traduit un refus RLS en « forbidden »', async () => {
    repo.insertDossierWithPerson.mockResolvedValue({
      data: null,
      error: { code: '42501', message: 'x' },
    });
    expect(await service.createDossier(validDossier)).toEqual({ ok: false, error: 'forbidden' });
  });
});

describe('createDossier (contrainte CHECK)', () => {
  it('traduit 23514 en « validation »', async () => {
    repo.insertDossierWithPerson.mockResolvedValue({
      data: null,
      error: { code: '23514', message: 'x' },
    });
    expect(await service.createDossier(validDossier)).toEqual({ ok: false, error: 'validation' });
  });
});

describe('createInvitation', () => {
  it("stocke l'empreinte, jamais le jeton, et renvoie un lien localisé", async () => {
    repo.insertInvitation.mockResolvedValue({ data: 'inv-1', error: null });
    const res = await service.createInvitation(
      { dossierId: DOSSIER, role: 'contributor', email: '' },
      ctx,
    );
    expect(res.ok).toBe(true);
    const { tokenHash } = repo.insertInvitation.mock.calls[0]![0];
    expect(tokenHash).toMatch(/^[0-9a-f]{64}$/);
    if (res.ok) {
      expect(res.data.url).toMatch(/^https:\/\/exemple\.test\/en\/invitation\/[A-Za-z0-9_-]{43}$/);
      expect(res.data.url).not.toContain(tokenHash);
      expect(res.data.emailSent).toBe(false);
    }
    expect(email.sendEmail).not.toHaveBeenCalled();
  });

  it("envoie l'e-mail quand une adresse est fournie", async () => {
    repo.insertInvitation.mockResolvedValue({ data: 'inv-1', error: null });
    email.sendEmail.mockResolvedValue({ ok: true });
    const res = await service.createInvitation(
      { dossierId: DOSSIER, role: 'viewer', email: 'marie@test.local' },
      ctx,
    );
    expect(res).toMatchObject({ ok: true, data: { emailSent: true } });
    expect(email.dossierInviteEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'marie@test.local', personName: 'Jean Ndong', locale: 'en' }),
    );
  });

  it('retire les barres obliques finales de siteUrl', async () => {
    repo.insertInvitation.mockResolvedValue({ data: 'inv-1', error: null });
    const res = await service.createInvitation(
      { dossierId: DOSSIER, role: 'viewer' },
      { ...ctx, siteUrl: 'https://exemple.test//' },
    );
    expect(res.ok && res.data.url).toMatch(/^https:\/\/exemple\.test\/en\/invitation\/[\w-]{43}$/);
  });

  it('ne met pas de préfixe pour la locale par défaut (fr)', async () => {
    repo.insertInvitation.mockResolvedValue({ data: 'inv-1', error: null });
    const res = await service.createInvitation(
      { dossierId: DOSSIER, role: 'viewer' },
      { ...ctx, locale: 'fr' },
    );
    expect(res.ok && res.data.url).toMatch(
      /^https:\/\/exemple\.test\/invitation\/[A-Za-z0-9_-]{43}$/,
    );
  });

  it("le jeton du lien correspond à l'empreinte stockée", async () => {
    repo.insertInvitation.mockResolvedValue({ data: 'inv-1', error: null });
    const res = await service.createInvitation({ dossierId: DOSSIER, role: 'viewer' }, ctx);
    const { tokenHash } = repo.insertInvitation.mock.calls[0]![0];
    const token = res.ok ? res.data.url.split('/').pop()! : '';
    expect(hashInvitationToken(token)).toBe(tokenHash);
  });

  it.each([
    ['non configuré', { ok: false, skipped: true }],
    ['en échec', { ok: false, error: 'boom' }],
  ])("garde l'invitation quand Resend est %s", async (_label, sent) => {
    repo.insertInvitation.mockResolvedValue({ data: 'inv-1', error: null });
    email.sendEmail.mockResolvedValue(sent);
    const res = await service.createInvitation(
      { dossierId: DOSSIER, role: 'viewer', email: 'marie@test.local' },
      ctx,
    );
    expect(repo.insertInvitation).toHaveBeenCalledTimes(1);
    expect(res).toMatchObject({ ok: true, data: { emailSent: false } });
    expect(res.ok && res.data.url).toContain('/invitation/');
  });

  it('traduit un refus RLS en « forbidden »', async () => {
    repo.insertInvitation.mockResolvedValue({ data: null, error: { code: '42501', message: 'x' } });
    const res = await service.createInvitation({ dossierId: DOSSIER, role: 'viewer' }, ctx);
    expect(res).toEqual({ ok: false, error: 'forbidden' });
  });
});

describe('acceptInvitation', () => {
  it.each([
    ['TI001', 'invitation_invalid'],
    ['TI002', 'invitation_expired'],
    ['TI003', 'invitation_used'],
    ['28000', 'unauthenticated'],
  ])('traduit le code %s', async (code, error) => {
    repo.acceptInvitationByToken.mockResolvedValue({ data: null, error: { code, message: 'x' } });
    expect(await service.acceptInvitation('A'.repeat(43))).toEqual({ ok: false, error });
  });

  it('refuse un jeton mal formé sans interroger la base', async () => {
    expect(await service.acceptInvitation('court')).toEqual({
      ok: false,
      error: 'invitation_invalid',
    });
    expect(repo.acceptInvitationByToken).not.toHaveBeenCalled();
  });

  it('renvoie le dossier rejoint', async () => {
    repo.acceptInvitationByToken.mockResolvedValue({ data: DOSSIER, error: null });
    expect(await service.acceptInvitation('A'.repeat(43))).toEqual({
      ok: true,
      data: { dossierId: DOSSIER },
    });
  });
});

describe('revokeInvitation', () => {
  const INV = '55555555-5555-4555-8555-555555555555';

  it('refuse un identifiant invalide', async () => {
    expect(await service.revokeInvitation(DOSSIER, 'pas-un-uuid')).toEqual({
      ok: false,
      error: 'validation',
    });
    expect(await service.revokeInvitation('pas-un-uuid', INV)).toEqual({
      ok: false,
      error: 'validation',
    });
    expect(repo.deleteInvitation).not.toHaveBeenCalled();
  });

  it('révoque une invitation du dossier', async () => {
    repo.deleteInvitation.mockResolvedValue({ data: true, error: null });
    expect(await service.revokeInvitation(DOSSIER, INV)).toEqual({ ok: true, data: null });
    expect(repo.deleteInvitation).toHaveBeenCalledWith(DOSSIER, INV);
  });

  it("traduit « not_found » (inconnue ou d'un autre dossier)", async () => {
    repo.deleteInvitation.mockResolvedValue({
      data: null,
      error: { code: 'not_found', message: 'x' },
    });
    expect(await service.revokeInvitation(DOSSIER, INV)).toEqual({
      ok: false,
      error: 'not_found',
    });
  });

  it('traduit un refus RLS en « forbidden »', async () => {
    repo.deleteInvitation.mockResolvedValue({ data: null, error: { code: '42501', message: 'x' } });
    expect(await service.revokeInvitation(DOSSIER, INV)).toEqual({
      ok: false,
      error: 'forbidden',
    });
  });
});
