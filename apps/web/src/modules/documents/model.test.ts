import { describe, expect, it } from 'vitest';
import {
  bookletData,
  DOCUMENT_KINDS,
  type DocumentLabels,
  documentInputs,
  documentReadiness,
  posterData,
  posterMoments,
} from './model';

const person = {
  firstName: 'Marie',
  lastName: 'Ndong',
  nickname: 'Maman Marie',
  birthDate: '1950-03-03',
  deathDate: '2026-10-12',
};

const program = [
  { time: '14:00', moment: 'Inhumation', place: 'Cimetière de Lalala' },
  { time: '08:00', moment: 'Levée du corps', lead: 'Famille Ndong' },
  { time: '10:00', moment: 'Messe' },
];

const texts = {
  'documents.booklet.cover': 'Ta lumière demeure',
  'documents.booklet.tribute': 'Une vie de partage.',
  'documents.booklet.thanks': 'Merci à tous.',
};

const labels: DocumentLabels = {
  tribute: 'Hommage',
  program: 'Programme',
  thanks: 'Remerciements',
  time: 'Heure',
  moment: 'Moment',
  place: 'Lieu',
  lead: 'Responsable',
  dateToBeConfirmed: 'Date à préciser',
  places: { liftPlace: 'Levée du corps', servicePlace: 'Cérémonie', burialPlace: 'Inhumation' },
};

const base = {
  person,
  dossierTitle: 'Obsèques de Marie',
  answers: { 'ceremony.program': program, 'ceremony.date': '2026-11-14', ...texts },
  locale: 'fr',
};

describe('documentInputs', () => {
  it('liste les trois documents', () => {
    expect(DOCUMENT_KINDS).toEqual(['booklet.pdf', 'poster.pdf', 'poster.png']);
  });

  it('prend le nom de la fiche, sinon le titre du dossier', () => {
    expect(documentInputs(base).fullName).toBe('Marie Ndong');
    expect(documentInputs({ ...base, person: null }).fullName).toBe('Obsèques de Marie');
    expect(
      documentInputs({ ...base, person: { ...person, firstName: ' ', lastName: '' } }).fullName,
    ).toBe('Obsèques de Marie');
    expect(documentInputs({ ...base, person: null, dossierTitle: '  ' }).fullName).toBeNull();
  });

  it('fait primer la date de décès répondue sur celle de la fiche', () => {
    const inputs = documentInputs({
      ...base,
      answers: { ...base.answers, 'death.date': '2026-10-20' },
    });
    expect(inputs.lifeDates).toBe('3 mars 1950 – 20 octobre 2026');
  });

  it('retombe sur la date de la fiche quand la date répondue est invalide', () => {
    for (const answered of ['n/a', '2026-02-31', '  ']) {
      const inputs = documentInputs({
        ...base,
        answers: { ...base.answers, 'death.date': answered },
      });
      expect(inputs.lifeDates).toBe('3 mars 1950 – 12 octobre 2026');
    }
  });

  it('écrit les dates en français et en anglais', () => {
    expect(documentInputs(base).lifeDates).toBe('3 mars 1950 – 12 octobre 2026');
    expect(documentInputs(base).ceremonyDate).toBe('samedi 14 novembre 2026');
    const en = documentInputs({ ...base, locale: 'en' });
    expect(en.lifeDates).toBe('3 March 1950 – 12 October 2026');
    expect(en.ceremonyDate).toBe('Saturday, 14 November 2026');
  });

  it('garde une seule date, ou aucune', () => {
    expect(documentInputs({ ...base, person: { ...person, birthDate: null } }).lifeDates).toBe(
      '12 octobre 2026',
    );
    expect(
      documentInputs({ ...base, person: { ...person, birthDate: 'n/a', deathDate: null } })
        .lifeDates,
    ).toBeNull();
  });

  it('retombe sur le style sobre pour une valeur inconnue', () => {
    expect(documentInputs(base).style).toBe('sober');
    const color = { ...base, answers: { ...base.answers, 'documents.style': 'color' } };
    expect(documentInputs(color).style).toBe('color');
    const odd = { ...base, answers: { ...base.answers, 'documents.style': 'neon' } };
    expect(documentInputs(odd).style).toBe('sober');
  });

  it('reprend les lieux et le programme trié', () => {
    const inputs = documentInputs({
      ...base,
      answers: { ...base.answers, 'ceremony.servicePlace': 'Cathédrale Sainte-Marie' },
    });
    expect(inputs.places.map((p) => p.key)).toEqual(['servicePlace']);
    expect(inputs.program.map((item) => item.time)).toEqual(['08:00', '10:00', '14:00']);
  });
});

describe('posterMoments', () => {
  it('garde les cinq premiers moments par heure', () => {
    const many = ['18:00', '07:00', '12:00', '09:00', '15:00', '08:00'].map((time) => ({
      time,
      moment: `Moment ${time}`,
    }));
    const inputs = documentInputs({ ...base, answers: { 'ceremony.program': many } });
    expect(posterMoments(inputs.program).map((m) => m.time)).toEqual([
      '07:00',
      '08:00',
      '09:00',
      '12:00',
      '15:00',
    ]);
    expect(posterMoments([])).toEqual([]);
  });
});

describe('documentReadiness', () => {
  it('rend prêt le livret complet et l’affiche sans textes', () => {
    expect(documentReadiness('booklet.pdf', documentInputs(base))).toEqual([]);
    const noTexts = documentInputs({ ...base, answers: { 'ceremony.program': program } });
    expect(documentReadiness('poster.pdf', noTexts)).toEqual([]);
    expect(documentReadiness('poster.png', noTexts)).toEqual([]);
    expect(documentReadiness('booklet.pdf', noTexts)).toEqual(['cover', 'tribute', 'thanks']);
  });

  it('signale chaque manque isolément', () => {
    const noName = documentInputs({ ...base, person: null, dossierTitle: '' });
    expect(documentReadiness('booklet.pdf', noName)).toEqual(['name']);
    expect(documentReadiness('poster.png', noName)).toEqual(['name']);

    const noProgram = documentInputs({
      ...base,
      answers: { ...texts, 'ceremony.program': [{ time: 'midi', moment: 'Messe' }] },
    });
    expect(documentReadiness('booklet.pdf', noProgram)).toEqual(['program']);
    expect(documentReadiness('poster.pdf', noProgram)).toEqual(['program']);

    for (const kind of ['cover', 'tribute', 'thanks'] as const) {
      const answers: Record<string, unknown> = { ...base.answers };
      delete answers[`documents.booklet.${kind}`];
      expect(documentReadiness('booklet.pdf', documentInputs({ ...base, answers }))).toEqual([
        kind,
      ]);
    }
  });

  it('reste prêt sans date des obsèques', () => {
    const answers: Record<string, unknown> = { ...base.answers };
    delete answers['ceremony.date'];
    const inputs = documentInputs({ ...base, answers });
    expect(inputs.ceremonyDate).toBeNull();
    expect(documentReadiness('booklet.pdf', inputs)).toEqual([]);
    expect(documentReadiness('poster.pdf', inputs)).toEqual([]);
    expect(bookletData(inputs, labels, null).ceremonyDate).toBeNull();
  });
});

describe('bookletData et posterData', () => {
  const photo = new Uint8Array([1, 2, 3]);

  it('assemble le livret', () => {
    const answers = { ...base.answers, 'ceremony.liftPlace': 'Morgue de Libreville' };
    const data = bookletData(documentInputs({ ...base, answers }), labels, photo);
    expect(data).toEqual({
      style: 'sober',
      photo,
      fullName: 'Marie Ndong',
      nickname: 'Maman Marie',
      lifeDates: '3 mars 1950 – 12 octobre 2026',
      cover: 'Ta lumière demeure',
      tribute: 'Une vie de partage.',
      thanks: 'Merci à tous.',
      ceremonyDate: 'samedi 14 novembre 2026',
      places: [{ label: 'Levée du corps', text: 'Morgue de Libreville' }],
      program: [
        { time: '08:00', moment: 'Levée du corps', lead: 'Famille Ndong' },
        { time: '10:00', moment: 'Messe' },
        { time: '14:00', moment: 'Inhumation', place: 'Cimetière de Lalala' },
      ],
      labels,
    });
  });

  it('assemble l’affiche, sans texte si besoin', () => {
    const inputs = documentInputs({ ...base, answers: { 'ceremony.program': program } });
    const data = posterData('poster.pdf', inputs, labels, null);
    expect(data).toMatchObject({
      style: 'sober',
      photo: null,
      fullName: 'Marie Ndong',
      lifeDates: '3 mars 1950 – 12 octobre 2026',
      cover: null,
      ceremonyDate: null,
      labels,
    });
    expect(data.moments).toHaveLength(3);
  });

  it('refuse d’assembler un document incomplet', () => {
    const inputs = documentInputs({ ...base, answers: { 'ceremony.program': program } });
    expect(() => bookletData(inputs, labels, null)).toThrow('cover');
  });

  it('vérifie l’affiche dans le format demandé', () => {
    const ready = documentInputs(base);
    expect(posterData('poster.png', ready, labels, null)).toEqual(
      posterData('poster.pdf', ready, labels, null),
    );
    const empty = documentInputs({ ...base, answers: {} });
    expect(() => posterData('poster.png', empty, labels, null)).toThrow(
      'poster.png not ready: program',
    );
    expect(() => posterData('poster.pdf', empty, labels, null)).toThrow(
      'poster.pdf not ready: program',
    );
  });

  it('ne laisse aucun texte remplacer un fait', () => {
    const plain = documentInputs(base);
    const tricky = documentInputs({
      ...base,
      answers: {
        ...base.answers,
        'documents.booklet.cover': 'Jean Dupont 1er janvier 1900 – 08:00 Fête',
      },
    });
    const a = bookletData(plain, labels, null);
    const b = bookletData(tricky, labels, null);
    expect(b.cover).not.toBe(a.cover);
    expect(b.fullName).toBe(a.fullName);
    expect(b.lifeDates).toBe(a.lifeDates);
    expect(b.ceremonyDate).toBe(a.ceremonyDate);
    expect(b.program).toEqual(a.program);
    expect(posterData('poster.png', tricky, labels, null).moments).toEqual(
      posterData('poster.png', plain, labels, null).moments,
    );
  });
});
