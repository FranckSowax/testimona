import { describe, expect, it } from 'vitest';
import { CreateDossierInputSchema, CreateInvitationInputSchema, parseEntryPoint } from './schema';

const valid = {
  entryPoint: 'death',
  firstName: ' Jean ',
  lastName: 'Ndong',
  countryCode: 'ga',
  city: ' Libreville ',
  relationship: 'child',
};

describe('CreateDossierInputSchema', () => {
  it('normalise une saisie valide', () => {
    expect(CreateDossierInputSchema.parse(valid)).toEqual({
      entryPoint: 'death',
      firstName: 'Jean',
      lastName: 'Ndong',
      countryCode: 'GA',
      city: 'Libreville',
      relationship: 'child',
    });
  });

  it.each([
    ['entryPoint', 'after'],
    ['firstName', '  '],
    ['countryCode', 'GAB'],
    ['city', ''],
    ['relationship', 'cousin'],
  ])('refuse %s = %j', (field, value) => {
    expect(CreateDossierInputSchema.safeParse({ ...valid, [field]: value }).success).toBe(false);
  });
});

describe('bornes de longueur', () => {
  it.each(['firstName', 'lastName', 'city'])('%s : 120 caractères passent, 121 non', (field) => {
    expect(CreateDossierInputSchema.safeParse({ ...valid, [field]: 'a'.repeat(120) }).success).toBe(
      true,
    );
    expect(CreateDossierInputSchema.safeParse({ ...valid, [field]: 'a'.repeat(121) }).success).toBe(
      false,
    );
  });
});

describe('CreateInvitationInputSchema', () => {
  const dossierId = '44444444-4444-4444-8444-444444444444';

  it('accepte une invitation sans e-mail', () => {
    expect(
      CreateInvitationInputSchema.parse({ dossierId, role: 'contributor', email: '' }),
    ).toEqual({
      dossierId,
      role: 'contributor',
      email: undefined,
    });
  });

  it('traite un e-mail fait d’espaces comme absent', () => {
    expect(
      CreateInvitationInputSchema.parse({ dossierId, role: 'viewer', email: '   ' }).email,
    ).toBeUndefined();
  });

  it('refuse un e-mail de plus de 254 caractères', () => {
    const email = `${'a'.repeat(64)}@${'b'.repeat(63)}.${'c'.repeat(63)}.${'d'.repeat(63)}.com`;
    expect(email.length).toBeGreaterThan(254);
    expect(
      CreateInvitationInputSchema.safeParse({ dossierId, role: 'viewer', email }).success,
    ).toBe(false);
  });

  it('refuse le rôle de propriétaire et un e-mail invalide', () => {
    expect(CreateInvitationInputSchema.safeParse({ dossierId, role: 'owner' }).success).toBe(false);
    expect(
      CreateInvitationInputSchema.safeParse({ dossierId, role: 'viewer', email: 'pas-un-email' })
        .success,
    ).toBe(false);
  });
});

describe('parseEntryPoint', () => {
  it('traduit le paramètre de porte', () => {
    expect(parseEntryPoint('deces')).toBe('death');
    expect(parseEntryPoint('preparer')).toBe('prepare');
    expect(parseEntryPoint('autre')).toBe('death');
    expect(parseEntryPoint(undefined)).toBe('death');
  });

  it('prend le premier élément d’un tableau', () => {
    expect(parseEntryPoint(['preparer', 'deces'])).toBe('prepare');
    expect(parseEntryPoint(['deces', 'preparer'])).toBe('death');
    expect(parseEntryPoint([])).toBe('death');
  });
});
