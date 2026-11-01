import { describe, expect, it } from 'vitest';
import fr from '../../../messages/fr.json';
import { q } from '../define';
import { findQuestion } from '../registry';
import { CEREMONY_TEMPLATE_KEYS, CEREMONY_TEMPLATE_SIZE } from './ceremony-program';
import { LIST_STARTERS, starterFor } from './starters';

// WHY: traduction réelle des textes `journey.*`, comme le fait la page avec `getTranslations`.
const translate = (path: string): string => {
  const value = path
    .split('.')
    .reduce<unknown>(
      (node, part) => (node as Record<string, unknown> | undefined)?.[part],
      fr.journey,
    );
  return typeof value === 'string' ? value : path;
};

const program = () => {
  const question = findQuestion('ceremony.program')?.question;
  if (!question) throw new Error('question absente');
  return question;
};

describe('LIST_STARTERS', () => {
  it('décrit le programme de la cérémonie : taille, réponses lues, construction', () => {
    const starter = LIST_STARTERS.ceremonyProgram;
    expect(starter.size).toBe(CEREMONY_TEMPLATE_SIZE);
    expect(starter.keys).toEqual(CEREMONY_TEMPLATE_KEYS);
    const items = starter.build({ 'announce.tone': 'believer' }, translate);
    expect(items).toHaveLength(starter.size);
    expect(items[0]?.moment).toBe('Accueil des proches');
    expect(items[3]?.moment).toBe('Office religieux');
  });
});

describe('starterFor', () => {
  it('construit le programme type traduit pour une liste vide', () => {
    const items = starterFor(program(), { 'ceremony.servicePlace': 'Cathédrale' }, true, translate);
    expect(items).toHaveLength(CEREMONY_TEMPLATE_SIZE);
    expect(items?.[3]).toMatchObject({ moment: 'Cérémonie de recueillement', place: 'Cathédrale' });
  });

  it('propose aussi le modèle quand la liste a été passée', () => {
    const answers = { 'ceremony.program': { skipped: true } };
    expect(starterFor(program(), answers, true, translate)).toHaveLength(CEREMONY_TEMPLATE_SIZE);
  });

  it('ne propose rien à un lecteur', () => {
    expect(starterFor(program(), {}, false, translate)).toBeUndefined();
  });

  it('ne propose rien si la liste enregistrée a déjà un moment', () => {
    const answers = { 'ceremony.program': [{ time: '09:00', moment: 'Messe' }] };
    expect(starterFor(program(), answers, true, translate)).toBeUndefined();
  });

  it('ne propose rien pour une question sans programme type', () => {
    const list = q.list('demo.items', [{ name: 'time', kind: 'time' }], 10);
    expect(starterFor(list, {}, true, translate)).toBeUndefined();
    expect(starterFor(q.shortText('demo.text'), {}, true, translate)).toBeUndefined();
  });
});
