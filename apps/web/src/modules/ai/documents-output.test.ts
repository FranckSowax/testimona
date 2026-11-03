import { describe, expect, it } from 'vitest';
import {
  documentTextsIssue,
  hasInventedDate,
  hasTime,
  parseDocumentTexts,
} from './documents-output';

const TEXTS = {
  cover: 'Ton sourire restera dans nos cœurs.',
  tribute: 'Jean était un homme généreux.',
  thanks: 'La famille remercie tous ceux qui l’ont entourée.',
};

describe('parseDocumentTexts', () => {
  it('accepte le JSON nu ou dans un bloc, balise de langue en toute casse', () => {
    const json = JSON.stringify(TEXTS);
    for (const raw of [
      json,
      `\`\`\`json\n${json}\n\`\`\``,
      `\`\`\`JSON\n${json}\n\`\`\``,
      `\`\`\`json ${json}\`\`\``,
      `\`\`\`${json}\`\`\``,
    ]) {
      expect(parseDocumentTexts(raw)).toEqual(TEXTS);
    }
  });

  it('refuse un texte autour du JSON ou du bloc', () => {
    const json = JSON.stringify(TEXTS);
    expect(parseDocumentTexts(`Voici : ${json}`)).toBeNull();
    expect(parseDocumentTexts(`\`\`\`json\n${json}\n\`\`\`\nMerci`)).toBeNull();
    expect(parseDocumentTexts(`\`\`\`yaml\n${json}\n\`\`\``)).toBeNull();
  });
});

describe('hasTime', () => {
  it('ignore les références de verset', () => {
    for (const verse of [
      'Jean 11:25',
      'Jean 3:16',
      'Romains 8:28',
      '1 Corinthiens 13:4-7',
      'Psaume 23:1',
      'John 14:1-3',
      'Éphésiens 2:10',
      'Ésaïe 40:31',
      'Psaumes 121:1-2',
      '2 Timothée 4:7',
      'Ps. 23:4',
    ]) {
      expect(hasTime(`« Je suis la résurrection et la vie. » ${verse}`)).toBe(false);
    }
  });

  it('trouve une heure, même à côté d’un verset', () => {
    for (const text of [
      'Rendez-vous à 14:30.',
      'Rendez-vous à 14h30.',
      'Rendez-vous à 10 h 30.',
      'Jean 11:25. Rendez-vous à 14:30.',
      'Jean 3:16, puis 14h30.',
      'Dimanche 14:30, nous nous recueillerons.',
      'dimanche 14:30',
      'Sunday 9:15 at the church.',
      'SUNDAY 9:15',
      'Vers 9:15, accueil.',
      'Le 14:30 précisément.',
      'At 9:15 we gather.',
      'Inhumation 16:00.',
      'Messe 10:30.',
      'Cérémonie 15:00.',
      'Accueil 9:00.',
      'Dès 14:30, accueil.',
      'Rendez-vous à 15 heures.',
      'Accueil vers 10 heures.',
      '(à 9 heures) au domicile.',
      'Join us at 3 heures.',
    ]) {
      expect(hasTime(text)).toBe(true);
    }
  });

  it('trouve une heure sans minutes, en français ou en anglais', () => {
    for (const text of [
      'Rendez-vous à 15h.',
      'Rendez-vous à 9 h devant l’église.',
      'Rendez-vous à 10 heures.',
      'Rendez-vous à 1 heure.',
      'Join us at 3 pm.',
      'Join us at 10AM.',
      "Join us at 11 o'clock.",
      'Join us at 11 o’clock.',
    ]) {
      expect(hasTime(text)).toBe(true);
    }
  });

  it('laisse passer les nombres ordinaires, midi et minuit', () => {
    for (const text of [
      'Il a enseigné pendant 30 ans.',
      'Nous nous retrouverons à midi.',
      'Il veillait jusqu’à minuit.',
      'Il aimait les heures calmes du matin.',
      'He loved his 3 grandchildren.',
      '2 heures de route le séparaient de son village.',
      'Il marchait 2 heures par jour.',
      'Il était disponible 24 heures sur 24.',
    ]) {
      expect(hasTime(text)).toBe(false);
    }
  });
});

describe('hasInventedDate', () => {
  const facts = JSON.stringify({
    biography: {
      career: 'Instituteur de 1975 à 2010, marié le 12 juin.',
      passions: 'Il fêtait chaque March 3 avec ses élèves.',
      motto: 'Depuis le 1er mai, debout.',
    },
  });

  it('refuse une année ou un jour et un mois absents des faits', () => {
    for (const text of [
      'Né en 1950, il a tant donné.',
      'En 1899 déjà.',
      'Le 12 octobre restera gravé.',
      'Depuis le 1er août, il nous manque.',
      'Since October 12, we miss him.',
      'Since 12 October, we miss him.',
    ]) {
      expect(hasInventedDate(text, facts)).toBe(true);
    }
  });

  it('accepte une date reprise des faits, quelle que soit la casse', () => {
    for (const text of [
      'Instituteur de 1975 à 2010, il a tant donné.',
      'Marié le 12 Juin, fidèle toujours.',
      'Every march 3, he celebrated.',
      'Depuis le 1er mai.',
    ]) {
      expect(hasInventedDate(text, facts)).toBe(false);
    }
  });

  it('ignore les nombres hors des années 1800 à 2099', () => {
    expect(hasInventedDate('Il a eu 1500 élèves et 30 ans de carrière.', facts)).toBe(false);
    expect(hasInventedDate('Il est parti au mois de mai.', facts)).toBe(false);
  });
});

describe('documentTextsIssue', () => {
  it('nomme le premier défaut et le texte concerné', () => {
    expect(documentTextsIssue(TEXTS, '{}')).toBeNull();
    expect(documentTextsIssue({ ...TEXTS, thanks: 'À 15h.' }, '{}')).toEqual({
      issue: 'time',
      kind: 'thanks',
    });
    expect(documentTextsIssue({ ...TEXTS, tribute: 'Né en 1950.' }, '{}')).toEqual({
      issue: 'date',
      kind: 'tribute',
    });
  });
});
