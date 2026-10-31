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

// WHY: paramètres ICU attendus par `quoteMessage` pour chaque ligne du message de devis.
const QUOTE_PARAMS: Record<string, string[]> = {
  greeting: ['{name}'],
  need: ['{category}'],
  date: ['{date}'],
  dateUnknown: [],
  place: ['{place}'],
  quantities: [],
  closing: [],
};

// WHY: paramètres ICU attendus pour chaque texte de l'interface de demande de devis.
const QUOTE_UI_PARAMS: Record<string, string[]> = {
  request: [],
  messageLabel: ['{name}'],
  messageHint: [],
  open: [],
  opening: [],
  resend: [],
  cancel: [],
  opened: [],
  link: ['{name}'],
  'history.title': [],
  'history.item': ['{date}', '{provider}'],
  'history.by': ['{author}'],
  'history.unknownAuthor': [],
  'errors.unreachable': [],
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
  ...[
    'required',
    'tooLong',
    'invalidCharacter',
    'invalidPhone',
    'exampleWithContact',
    'verifiedWithoutNumber',
  ].map((k) => `providers.errors.${k}`),
  ...Object.keys(ERRORS).map((k) => `dossier.errors.${k}`),
  ...['title', 'intro', 'verified', 'example', 'exampleNotice'].map((k) => `providers.panel.${k}`),
  ...Object.keys(QUOTE_PARAMS).map((k) => `providers.quote.message.${k}`),
  ...Object.keys(QUOTE_UI_PARAMS).map((k) => `providers.quote.${k}`),
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

  it('gardent les paramètres du message de devis', () => {
    for (const messages of [fr, en]) {
      for (const [key, params] of Object.entries(QUOTE_PARAMS)) {
        const text = String(get(messages, `providers.quote.message.${key}`));
        const found = text.match(/\{[^}]+\}/g) ?? [];
        expect(found.sort()).toEqual([...params].sort());
      }
    }
  });

  it("gardent les paramètres des textes de l'interface de devis", () => {
    for (const messages of [fr, en]) {
      for (const [key, params] of Object.entries(QUOTE_UI_PARAMS)) {
        const text = String(get(messages, `providers.quote.${key}`));
        const found = text.match(/\{[^}]+\}/g) ?? [];
        expect(found.sort()).toEqual([...params].sort());
      }
    }
  });
});
