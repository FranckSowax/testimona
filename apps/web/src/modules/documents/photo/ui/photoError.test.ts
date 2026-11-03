import { createTranslator } from 'next-intl';
import { describe, expect, it } from 'vitest';
import en from '../../../../../messages/en.json';
import fr from '../../../../../messages/fr.json';
import { photoErrorText, type PhotoCaptureError } from './photoError';

// WHY: le `Record` fait échouer le typecheck si un code est ajouté sans texte attendu ici.
const EXPECTED: Record<PhotoCaptureError, (m: typeof fr) => string> = {
  photo_type: (m) => m.documents.photo.errors.photo_type,
  photo_size: (m) => m.documents.photo.errors.photo_size,
  photo_missing: (m) => m.documents.photo.errors.photo_missing,
  photo_already_used: (m) => m.documents.photo.errors.photo_already_used,
  upload_failed: (m) => m.documents.photo.errors.upload_failed,
  unreadable: (m) => m.documents.photo.errors.unreadable,
  validation: (m) => m.dossier.errors.validation,
  forbidden: (m) => m.dossier.errors.forbidden,
  not_found: (m) => m.dossier.errors.not_found,
  unauthenticated: (m) => m.dossier.errors.unauthenticated,
  unknown: (m) => m.dossier.errors.unknown,
};

describe.each([
  ['fr', fr],
  ['en', en as typeof fr],
])('photoErrorText (%s)', (locale, messages) => {
  const translate = createTranslator({ locale, messages });
  const t = (key: string) => translate(key as never);

  it.each(Object.keys(EXPECTED) as PhotoCaptureError[])('a un texte pour %s', (error) => {
    const text = photoErrorText(error, t);
    expect(text).toBe(EXPECTED[error](messages));
    expect(text.trim()).not.toBe('');
  });
});

describe('textes de la photo', () => {
  it('ont les mêmes clés en FR et EN', () => {
    const keys = (node: unknown, prefix = ''): string[] =>
      node && typeof node === 'object'
        ? Object.entries(node).flatMap(([k, v]) => keys(v, prefix ? `${prefix}.${k}` : k))
        : [prefix];
    expect(keys(en.documents).sort()).toEqual(keys(fr.documents).sort());
  });

  it('reprennent l’aide française demandée', () => {
    expect(fr.documents.photo.hint).toBe('Facultatif. Les documents fonctionnent sans photo.');
  });
});
