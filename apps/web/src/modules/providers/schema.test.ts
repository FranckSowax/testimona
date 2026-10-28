import { describe, expect, it } from 'vitest';
import { ProviderFiltersSchema, ProviderSchema, ProviderUpdateSchema } from './schema';

const PROVIDER = '66666666-6666-4666-8666-666666666666';
const base = {
  categoryKey: 'tentsChairs',
  name: 'Tentes Akanda',
  city: 'Libreville',
  district: '',
  whatsapp: '',
  priceNote: '',
  isExample: false,
  verified: false,
  active: true,
};

const messages = (input: unknown) => {
  const res = ProviderSchema.safeParse(input);
  return res.success ? {} : Object.fromEntries(res.error.issues.map((i) => [i.path[0], i.message]));
};

describe('ProviderSchema', () => {
  it('normalise le numéro et vide les champs facultatifs', () => {
    const data = ProviderSchema.parse({
      ...base,
      whatsapp: '+241 77 12-34-56',
      district: '  Akanda ',
    });
    expect(data).toMatchObject({ whatsapp: '+24177123456', district: 'Akanda', priceNote: null });
  });

  it('retire le (0) national et accepte tabulation, points et espaces', () => {
    const phone = (whatsapp: string) => ProviderSchema.parse({ ...base, whatsapp }).whatsapp;
    expect(phone('+241 (0)77 12 34 56')).toBe('+24177123456');
    expect(phone('+241\t77.12.34.56')).toBe('+24177123456');
    expect(phone('+241 77123456')).toBe('+24177123456');
  });

  it('refuse le préfixe 00 et le plus pleine largeur', () => {
    expect(messages({ ...base, whatsapp: '0024177123456' })).toEqual({ whatsapp: 'invalid phone' });
    expect(messages({ ...base, whatsapp: '＋24177123456' })).toEqual({ whatsapp: 'invalid phone' });
  });

  it('refuse un numéro sans indicatif international', () => {
    expect(messages({ ...base, whatsapp: '077123456' })).toEqual({ whatsapp: 'invalid phone' });
  });

  it('refuse un exemple avec un numéro ou une vérification', () => {
    expect(messages({ ...base, isExample: true, whatsapp: '+24177123456' })).toEqual({
      isExample: 'example with contact',
    });
    expect(messages({ ...base, isExample: true, verified: true })).toEqual({
      isExample: 'example with contact',
    });
  });

  it('refuse un prestataire vérifié sans numéro', () => {
    expect(messages({ ...base, verified: true })).toEqual({ verified: 'verified without number' });
    expect(messages({ ...base, verified: true, whatsapp: '+24177123456' })).toEqual({});
  });

  it('exige un nom et une ville', () => {
    expect(messages({ ...base, name: ' ', city: '' })).toEqual({
      name: 'required',
      city: 'required',
    });
  });

  it('compte les caractères comme la base', () => {
    expect(messages({ ...base, name: 'é'.repeat(120) })).toEqual({});
    expect(messages({ ...base, name: 'é'.repeat(121) })).toEqual({ name: 'too long' });
    expect(messages({ ...base, priceNote: 'x'.repeat(201) })).toEqual({ priceNote: 'too long' });
  });

  it('refuse une catégorie inconnue et le caractère NUL', () => {
    expect(ProviderSchema.safeParse({ ...base, categoryKey: 'flowers' }).success).toBe(false);
    expect(messages({ ...base, name: 'a\u0000b' })).toEqual({ name: 'invalid character' });
  });
});

describe('ProviderUpdateSchema', () => {
  it('exige l’identifiant du prestataire', () => {
    expect(ProviderUpdateSchema.safeParse(base).success).toBe(false);
    expect(ProviderUpdateSchema.parse({ ...base, providerId: PROVIDER }).providerId).toBe(PROVIDER);
  });

  it('refuse un exemple avec un numéro', () => {
    const res = ProviderUpdateSchema.safeParse({
      ...base,
      providerId: PROVIDER,
      isExample: true,
      whatsapp: '+24177123456',
    });
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.issues.map((i) => [i.path[0], i.message])).toEqual([
        ['isExample', 'example with contact'],
      ]);
    }
  });
});

describe('ProviderFiltersSchema', () => {
  it('ignore une ville trop longue, NUL ou non textuelle', () => {
    const city = (v: unknown) => ProviderFiltersSchema.parse({ city: v }).city;
    expect(city('é'.repeat(121))).toBeUndefined();
    expect(city('é'.repeat(120))).toBe('é'.repeat(120));
    expect(city('a\u0000b')).toBeUndefined();
    expect(city(['a', 'b'])).toBeUndefined();
  });

  it('ignore un filtre vide ou une catégorie inconnue', () => {
    expect(ProviderFiltersSchema.parse({ city: '  ', category: 'flowers' })).toEqual({
      city: undefined,
      category: undefined,
    });
    expect(ProviderFiltersSchema.parse({ city: 'Libreville', category: 'sound' })).toEqual({
      city: 'Libreville',
      category: 'sound',
    });
  });
});
