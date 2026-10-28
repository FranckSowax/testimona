import { describe, expect, it } from 'vitest';
import en from '../../../messages/en.json';
import fr from '../../../messages/fr.json';
import { PROVIDER_CATEGORIES } from './categories';
import type { ProvidersError } from './service';

const get = (messages: unknown, path: string): unknown =>
  path
    .split('.')
    .reduce<unknown>(
      (node, part) =>
        node && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined,
      messages,
    );
const isFilled = (value: unknown) => typeof value === 'string' && value.trim() !== '';

// WHY: Record typé : ajouter une erreur au service sans texte fait échouer la compilation.
const ERRORS: Record<ProvidersError, true> = {
  validation: true,
  forbidden: true,
  not_found: true,
  unauthenticated: true,
  unknown: true,
};

const PATHS = [
  'admin.nav.providers',
  ...PROVIDER_CATEGORIES.map((k) => `providers.category.${k}`),
  ...[
    'title',
    'new',
    'edit',
    'filterCity',
    'filterCategory',
    'allCategories',
    'filter',
    'empty',
    'name',
    'category',
    'place',
    'whatsapp',
    'status',
    'example',
    'verifiedOn',
    'unverified',
    'inactive',
    'editLink',
    'back',
  ].map((k) => `providers.admin.${k}`),
  ...[
    'category',
    'name',
    'city',
    'district',
    'whatsapp',
    'whatsappHint',
    'priceNote',
    'priceNoteHint',
    'isExample',
    'isExampleHint',
    'verified',
    'active',
    'save',
    'saving',
    'saved',
  ].map((k) => `providers.form.${k}`),
  ...['required', 'tooLong', 'invalidCharacter', 'invalidPhone', 'exampleWithContact'].map(
    (k) => `providers.errors.${k}`,
  ),
  ...Object.keys(ERRORS).map((k) => `dossier.errors.${k}`),
];

describe('textes des prestataires', () => {
  it.each([
    ['fr', fr],
    ['en', en],
  ])('sont tous présents en %s', (_, messages) => {
    expect(PATHS.filter((path) => !isFilled(get(messages, path)))).toEqual([]);
  });

  it('gardent le paramètre de date de la vérification', () => {
    for (const messages of [fr, en]) {
      expect(get(messages, 'providers.admin.verifiedOn')).toContain('{date}');
    }
  });
});
