import { createTranslator } from 'next-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import en from '../../../messages/en.json';
import fr from '../../../messages/fr.json';

const { auth, dossierRepo, answersRepo, photo, render } = vi.hoisted(() => ({
  auth: { getCurrentUser: vi.fn() },
  dossierRepo: { getDossier: vi.fn(), getPersonResult: vi.fn(), getMyRole: vi.fn() },
  answersRepo: { listAnswersResult: vi.fn() },
  photo: { currentPhotoBytes: vi.fn() },
  render: { renderBooklet: vi.fn(), renderPosterPdf: vi.fn(), renderPosterPng: vi.fn() },
}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase/server', () => auth);
vi.mock('@/modules/dossier/repo', () => dossierRepo);
vi.mock('@/modules/dossier/answers/repo', () => answersRepo);
vi.mock('./photo/service', () => photo);
vi.mock('./render', () => render);
// WHY: le modèle reste réel ; seuls `bookletData` et `posterData` sont espionnés pour vérifier le
// format demandé.
vi.mock('./model', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./model')>();
  return {
    ...actual,
    bookletData: vi.fn(actual.bookletData),
    posterData: vi.fn(actual.posterData),
  };
});
vi.mock('next-intl/server', () => ({
  getTranslations: async ({ locale, namespace }: { locale: 'fr' | 'en'; namespace: string }) =>
    createTranslator({
      locale,
      messages: locale === 'en' ? en : fr,
      namespace: namespace as never,
    }),
}));

const { documentResponse } = await import('./http');
const model = await import('./model');

const DOSSIER = '44444444-4444-4444-8444-444444444444';
const PHOTO = new Uint8Array([0xff, 0xd8, 0xff]);
const PDF = new Uint8Array([0x25, 0x50, 0x44, 0x46]);
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
const READY_ANSWERS = {
  'ceremony.date': '2026-11-14',
  'ceremony.liftPlace': 'Morgue de Libreville',
  'ceremony.program': [{ time: '08:00', moment: 'Levée du corps' }],
  'documents.booklet.cover': 'Son souvenir restera.',
  'documents.booklet.tribute': 'Une vie de partage.',
  'documents.booklet.thanks': 'Merci à tous.',
};

function dossier(overrides: Record<string, unknown> = {}) {
  return {
    id: DOSSIER,
    title: 'Dossier de Marie',
    city: 'Libreville',
    countryCode: 'GA',
    entryPoint: 'death',
    createdAt: '2026-10-20T10:00:00Z',
    ...overrides,
  };
}

function expectSafeHeaders(res: Response) {
  expect(res.headers.get('Cache-Control')).toBe('no-store');
  expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
}

beforeEach(() => {
  vi.clearAllMocks();
  auth.getCurrentUser.mockResolvedValue({ id: 'u1' });
  dossierRepo.getDossier.mockResolvedValue(dossier());
  dossierRepo.getMyRole.mockResolvedValue('owner');
  dossierRepo.getPersonResult.mockResolvedValue({
    data: {
      firstName: 'Marie',
      lastName: 'Ndong',
      nickname: null,
      birthDate: '1950-03-03',
      deathDate: '2026-10-12',
    },
    error: null,
  });
  answersRepo.listAnswersResult.mockResolvedValue({ data: READY_ANSWERS, error: null });
  photo.currentPhotoBytes.mockResolvedValue({ ok: true, data: PHOTO });
  render.renderBooklet.mockResolvedValue(PDF);
  render.renderPosterPdf.mockResolvedValue(PDF);
  render.renderPosterPng.mockResolvedValue(PNG);
});

describe('documentResponse', () => {
  it('exige une session, sans corps', async () => {
    auth.getCurrentUser.mockResolvedValueOnce(null);
    const res = await documentResponse(DOSSIER, 'booklet.pdf', 'fr');
    expect(res.status).toBe(401);
    expectSafeHeaders(res);
    expect(await res.text()).toBe('');
    expect(dossierRepo.getDossier).not.toHaveBeenCalled();
  });

  it.each([
    ['un identifiant invalide', 'pas-un-uuid', 'booklet.pdf'],
    ['un document inconnu', DOSSIER, 'flyer.pdf'],
    ['un document vide', DOSSIER, ''],
  ])('répond 404 sans corps pour %s', async (_case, dossierId, doc) => {
    const res = await documentResponse(dossierId, doc, 'fr');
    expect(res.status).toBe(404);
    expectSafeHeaders(res);
    expect(res.headers.get('Content-Type')).toBeNull();
    expect(await res.text()).toBe('');
    expect(dossierRepo.getDossier).not.toHaveBeenCalled();
  });

  it('répond 404 sans corps pour un dossier absent', async () => {
    dossierRepo.getDossier.mockResolvedValueOnce(null);
    const res = await documentResponse(DOSSIER, 'booklet.pdf', 'fr');
    expect(res.status).toBe(404);
    expectSafeHeaders(res);
    expect(await res.text()).toBe('');
    expect(answersRepo.listAnswersResult).not.toHaveBeenCalled();
  });

  it('répond 404 sans corps à un non-membre', async () => {
    dossierRepo.getMyRole.mockResolvedValueOnce(null);
    const res = await documentResponse(DOSSIER, 'poster.png', 'fr');
    expect(res.status).toBe(404);
    expectSafeHeaders(res);
    expect(await res.text()).toBe('');
    expect(answersRepo.listAnswersResult).not.toHaveBeenCalled();
    expect(render.renderPosterPng).not.toHaveBeenCalled();
  });

  it('répond 404 sans corps quand l’étape 3.5 est fermée', async () => {
    dossierRepo.getDossier.mockResolvedValueOnce(dossier({ entryPoint: 'prepare' }));
    const res = await documentResponse(DOSSIER, 'booklet.pdf', 'fr');
    expect(res.status).toBe(404);
    expectSafeHeaders(res);
    expect(await res.text()).toBe('');
    expect(answersRepo.listAnswersResult).not.toHaveBeenCalled();
  });

  it('autorise un lecteur (viewer)', async () => {
    dossierRepo.getMyRole.mockResolvedValueOnce('viewer');
    const res = await documentResponse(DOSSIER, 'booklet.pdf', 'fr');
    expect(res.status).toBe(200);
    expect(render.renderBooklet).toHaveBeenCalledTimes(1);
  });

  it.each([
    [
      'la fiche',
      () => dossierRepo.getPersonResult.mockResolvedValueOnce({ data: null, error: { code: 'X' } }),
    ],
    [
      'les réponses',
      () => answersRepo.listAnswersResult.mockResolvedValueOnce({ data: {}, error: { code: 'X' } }),
    ],
  ])('répond 502 avec un texte traduit si la lecture de %s échoue', async (_case, fail) => {
    fail();
    const res = await documentResponse(DOSSIER, 'booklet.pdf', 'en');
    expect(res.status).toBe(502);
    expectSafeHeaders(res);
    expect(res.headers.get('Content-Type')).toBe('text/plain; charset=utf-8');
    expect(res.headers.get('Content-Disposition')).toBeNull();
    expect(await res.text()).toBe('Something went wrong. Please try again in a moment.');
    expect(render.renderBooklet).not.toHaveBeenCalled();
  });

  it('produit le document sans photo quand il n’y en a pas', async () => {
    photo.currentPhotoBytes.mockResolvedValueOnce({ ok: true, data: null });
    const res = await documentResponse(DOSSIER, 'poster.pdf', 'fr');
    expect(res.status).toBe(200);
    expect(model.posterData).toHaveBeenCalledWith(
      'poster.pdf',
      expect.anything(),
      expect.anything(),
      null,
    );
  });

  it('répond 409 en listant en français ce qui manque, sans document', async () => {
    answersRepo.listAnswersResult.mockResolvedValueOnce({
      data: { 'documents.booklet.cover': 'Son souvenir restera.' },
      error: null,
    });
    const res = await documentResponse(DOSSIER, 'booklet.pdf', 'fr');
    expect(res.status).toBe(409);
    expectSafeHeaders(res);
    expect(res.headers.get('Content-Type')).toBe('text/plain; charset=utf-8');
    expect(res.headers.get('Content-Disposition')).toBeNull();
    expect(await res.text()).toBe(
      [
        'Ce document ne peut pas encore être créé. Il manque :',
        '- le programme de la journée',
        "- l'hommage",
        '- les remerciements',
      ].join('\n'),
    );
    expect(render.renderBooklet).not.toHaveBeenCalled();
    expect(photo.currentPhotoBytes).not.toHaveBeenCalled();
  });

  it('répond 409 en anglais, nom compris', async () => {
    dossierRepo.getDossier.mockResolvedValueOnce(dossier({ title: '  ' }));
    dossierRepo.getPersonResult.mockResolvedValueOnce({ data: null, error: null });
    answersRepo.listAnswersResult.mockResolvedValueOnce({ data: {}, error: null });
    const res = await documentResponse(DOSSIER, 'poster.png', 'en');
    expect(res.status).toBe(409);
    expectSafeHeaders(res);
    expect(await res.text()).toBe(
      [
        'This document cannot be created yet. Still missing:',
        '- the name of the deceased',
        '- the programme for the day',
      ].join('\n'),
    );
    expect(render.renderPosterPng).not.toHaveBeenCalled();
  });

  it('renvoie le livret en PDF, en pièce jointe, avec les libellés français', async () => {
    const res = await documentResponse(DOSSIER, 'booklet.pdf', 'fr');
    expect(res.status).toBe(200);
    expectSafeHeaders(res);
    expect(res.headers.get('Content-Type')).toBe('application/pdf');
    expect(res.headers.get('Content-Disposition')).toBe(
      'attachment; filename="livret-obseques.pdf"',
    );
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(PDF);
    expect(render.renderBooklet).toHaveBeenCalledTimes(1);
    expect(render.renderPosterPdf).not.toHaveBeenCalled();
    expect(render.renderPosterPng).not.toHaveBeenCalled();
    const data = render.renderBooklet.mock.calls[0]?.[0];
    expect(data.photo).toBe(PHOTO);
    expect(data.fullName).toBe('Marie Ndong');
    expect(data.lifeDates).toBe('3 mars 1950 – 12 octobre 2026');
    expect(data.labels).toEqual({
      tribute: 'Hommage',
      program: 'Programme',
      thanks: 'Remerciements',
      time: 'Heure',
      moment: 'Moment',
      place: 'Lieu',
      lead: 'Conduit par',
      dateToBeConfirmed: 'Date à préciser',
      places: { liftPlace: 'Levée du corps', servicePlace: 'Cérémonie', burialPlace: 'Inhumation' },
    });
    expect(data.places).toEqual([{ label: 'Levée du corps', text: 'Morgue de Libreville' }]);
    expect(photo.currentPhotoBytes).toHaveBeenCalledWith(DOSSIER);
  });

  it.each([
    ['poster.pdf', 'application/pdf', 'affiche-obseques.pdf', PDF, 'renderPosterPdf'],
    ['poster.png', 'image/png', 'affiche-obseques.png', PNG, 'renderPosterPng'],
  ] as const)(
    'renvoie l’affiche %s avec posterData du même format',
    async (doc, type, name, body, fn) => {
      const res = await documentResponse(DOSSIER, doc, 'fr');
      expect(res.status).toBe(200);
      expectSafeHeaders(res);
      expect(res.headers.get('Content-Type')).toBe(type);
      expect(res.headers.get('Content-Disposition')).toBe(`attachment; filename="${name}"`);
      expect(new Uint8Array(await res.arrayBuffer())).toEqual(body);
      expect(model.posterData).toHaveBeenCalledTimes(1);
      expect(model.posterData).toHaveBeenCalledWith(
        doc,
        expect.anything(),
        expect.anything(),
        PHOTO,
      );
      expect(render[fn]).toHaveBeenCalledTimes(1);
      expect(render.renderBooklet).not.toHaveBeenCalled();
      const other = fn === 'renderPosterPdf' ? 'renderPosterPng' : 'renderPosterPdf';
      expect(render[other]).not.toHaveBeenCalled();
    },
  );

  it.each([
    ['booklet.pdf', 'funeral-booklet.pdf'],
    ['poster.pdf', 'funeral-poster.pdf'],
    ['poster.png', 'funeral-poster.png'],
  ])('nomme %s « %s » en anglais, avec les libellés et dates anglais', async (doc, name) => {
    const res = await documentResponse(DOSSIER, doc, 'en');
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Disposition')).toBe(`attachment; filename="${name}"`);
    const renderer =
      doc === 'booklet.pdf'
        ? render.renderBooklet
        : doc === 'poster.pdf'
          ? render.renderPosterPdf
          : render.renderPosterPng;
    const data = renderer.mock.calls[0]?.[0];
    expect(data.labels.dateToBeConfirmed).toBe('Date to be confirmed');
    expect(data.labels.places.liftPlace).toBe('Removal of the body');
    expect(data.lifeDates).toBe('3 March 1950 – 12 October 2026');
  });

  it.each([null, 'de', 'FR', ''])('suit le français pour la langue %s', async (lang) => {
    const res = await documentResponse(DOSSIER, 'booklet.pdf', lang);
    expect(res.headers.get('Content-Disposition')).toBe(
      'attachment; filename="livret-obseques.pdf"',
    );
    const data = render.renderBooklet.mock.calls[0]?.[0];
    expect(data.labels.tribute).toBe('Hommage');
    expect(data.lifeDates).toBe('3 mars 1950 – 12 octobre 2026');
  });

  it('répond 500 avec le message générique et ne journalise que le nom de l’erreur', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    render.renderBooklet.mockRejectedValueOnce(new TypeError('Marie Ndong Une vie de partage'));
    const res = await documentResponse(DOSSIER, 'booklet.pdf', 'fr');
    expect(res.status).toBe(500);
    expectSafeHeaders(res);
    expect(res.headers.get('Content-Type')).toBe('text/plain; charset=utf-8');
    expect(res.headers.get('Content-Disposition')).toBeNull();
    expect(await res.text()).toBe('Une erreur est survenue. Réessayez dans un instant.');
    expect(log).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledWith('[documents] download failed', { name: 'TypeError' });
    log.mockRestore();
  });
});
