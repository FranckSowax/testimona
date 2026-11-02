import { describe, expect, it } from 'vitest';
import fr from '../../../messages/fr.json';
import { findQuestion } from '../registry';
import { answerSchema } from '../types';
import {
  CEREMONY_TEMPLATE_SIZE,
  ceremonyProgramFromAnswers,
  ceremonyProgramTemplate,
  type CeremonyMoment,
} from './ceremony-program';

const MOMENTS = fr.journey.templates.ceremony;
const translate = (moment: CeremonyMoment) => MOMENTS[moment];
const places = {
  liftPlace: 'Morgue de l’hôpital, Libreville',
  servicePlace: 'Cathédrale Sainte-Marie',
  burialPlace: 'Cimetière de Lalala',
};

const schema = () => {
  const question = findQuestion('ceremony.program')?.question;
  if (!question) throw new Error('question absente');
  return answerSchema(question);
};

describe('ceremonyProgramTemplate', () => {
  it('propose 8 moments dans l’ordre, aux heures croissantes', () => {
    const items = ceremonyProgramTemplate('believer', places, translate);
    expect(items).toHaveLength(CEREMONY_TEMPLATE_SIZE);
    expect(CEREMONY_TEMPLATE_SIZE).toBe(8);
    expect(items.map((item) => item.moment)).toEqual([
      'Accueil des proches',
      'Levée du corps',
      'Cortège',
      'Office religieux',
      'Hommages et témoignages',
      'Départ vers le cimetière',
      'Inhumation',
      'Réception',
    ]);
    const times = items.map((item) => String(item.time));
    expect([...times].sort()).toEqual(times);
    expect(new Set(times).size).toBe(times.length);
  });

  it('remplace l’office religieux par un recueillement pour le registre neutre', () => {
    const moments = ceremonyProgramTemplate('neutral', places, translate).map((i) => i.moment);
    expect(moments[3]).toBe('Cérémonie de recueillement');
    expect(moments).not.toContain('Office religieux');
  });

  it('prend le registre neutre pour un registre inconnu ou absent', () => {
    const neutral = ceremonyProgramTemplate('neutral', places, translate);
    expect(ceremonyProgramTemplate('joyful', places, translate)).toEqual(neutral);
    expect(ceremonyProgramTemplate(null, places, translate)).toEqual(neutral);
  });

  it('reprend les lieux de la levée, de la cérémonie et de l’inhumation', () => {
    const items = ceremonyProgramTemplate('believer', places, translate);
    expect(items[1]?.place).toBe(places.liftPlace);
    expect(items[3]?.place).toBe(places.servicePlace);
    expect(items[6]?.place).toBe(places.burialPlace);
    expect(items[0]?.place).toBe('');
  });

  it('laisse le lieu vide quand il manque', () => {
    const items = ceremonyProgramTemplate('believer', {}, translate);
    expect(items.every((item) => item.place === '' && item.lead === '')).toBe(true);
  });

  it('produit des éléments valides pour la question du programme', () => {
    for (const tone of ['believer', 'neutral']) {
      for (const where of [places, {}]) {
        expect(schema().safeParse(ceremonyProgramTemplate(tone, where, translate)).success).toBe(
          true,
        );
      }
    }
  });
});

describe('ceremonyProgramFromAnswers', () => {
  it('lit le registre de la cérémonie, puis celui des annonces, et les trois lieux', () => {
    const answers = {
      'ceremony.liftPlace': places.liftPlace,
      'ceremony.servicePlace': places.servicePlace,
      'ceremony.burialPlace': { skipped: true },
      'announce.tone': 'believer',
    };
    const items = ceremonyProgramFromAnswers(answers, translate);
    expect(items[3]).toMatchObject({ moment: 'Office religieux', place: places.servicePlace });
    expect(items[6]?.place).toBe('');
    const neutral = ceremonyProgramFromAnswers(
      { ...answers, 'ceremony.tone': 'neutral' },
      translate,
    );
    expect(neutral[3]?.moment).toBe('Cérémonie de recueillement');
  });

  it('reprend le registre des annonces si celui de la cérémonie est passé ou invalide, sinon neutre', () => {
    for (const own of [{ skipped: true }, 'joyful']) {
      const believer = { 'ceremony.tone': own, 'announce.tone': 'believer' };
      expect(ceremonyProgramFromAnswers(believer, translate)[3]?.moment).toBe('Office religieux');
      const alone = { 'ceremony.tone': own };
      expect(ceremonyProgramFromAnswers(alone, translate)[3]?.moment).toBe(
        'Cérémonie de recueillement',
      );
    }
  });
});
