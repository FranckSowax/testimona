import { beforeEach, describe, expect, it, vi } from 'vitest';

const m = vi.hoisted(() => ({
  getMyRole: vi.fn(),
  getPersonResult: vi.fn(),
  listAnswersResult: vi.fn(),
  getCurrentPhoto: vi.fn(),
  documentStarterTexts: vi.fn(),
  isAiEnabled: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('@/modules/dossier/repo', () => ({
  getMyRole: m.getMyRole,
  getPersonResult: m.getPersonResult,
}));
vi.mock('@/modules/dossier/answers/repo', () => ({ listAnswersResult: m.listAnswersResult }));
vi.mock('./photo/repo', () => ({ getCurrentPhoto: m.getCurrentPhoto }));
vi.mock('./templates', () => ({ documentStarterTexts: m.documentStarterTexts }));
vi.mock('@/modules/ai/config', () => ({ isAiEnabled: m.isAiEnabled }));

const { loadDocumentsSynthesis } = await import('./load');

const DOSSIER = '11111111-1111-4111-8111-111111111111';
const PARAMS = { dossierId: DOSSIER, dossierTitle: 'Famille Mba', locale: 'fr' };
const PERSON = {
  firstName: 'Jean',
  lastName: 'Mba',
  nickname: null,
  birthDate: null,
  deathDate: null,
};

beforeEach(() => {
  vi.resetAllMocks();
  m.getMyRole.mockResolvedValue('contributor');
  m.getPersonResult.mockResolvedValue({ data: PERSON, error: null });
  m.listAnswersResult.mockResolvedValue({
    data: {
      'announce.tone': 'believer',
      'documents.style': 'color',
      'documents.booklet.cover': 'Couverture',
      'ceremony.program': [{ time: '10:00', moment: 'Office' }],
    },
    error: null,
  });
  m.getCurrentPhoto.mockResolvedValue({
    data: { id: 'p1', dossierId: DOSSIER, path: 'x' },
    error: null,
  });
  m.documentStarterTexts.mockResolvedValue({ cover: 'C0', thanks: 'T0' });
  m.isAiEnabled.mockReturnValue(true);
});

describe('loadDocumentsSynthesis', () => {
  it('rassemble rôle, photo, textes et éléments manquants par format', async () => {
    const props = await loadDocumentsSynthesis(PARAMS);
    expect(props).toMatchObject({
      dossierId: DOSSIER,
      locale: 'fr',
      style: 'color',
      photoId: 'p1',
      canEdit: true,
      canEditPhoto: false,
      aiEnabled: true,
      texts: {
        cover: { saved: 'Couverture', starter: 'C0' },
        tribute: { saved: null, starter: '' },
        thanks: { saved: null, starter: 'T0' },
      },
      readiness: {
        'booklet.pdf': ['tribute', 'thanks'],
        'poster.pdf': [],
        'poster.png': [],
      },
    });
    // Sans ton de cérémonie valide, le ton de l'annonce sert aux textes de départ.
    expect(m.documentStarterTexts).toHaveBeenCalledWith('believer', 'fr');
  });

  it('préfère le ton de la cérémonie et masque une photo illisible', async () => {
    m.listAnswersResult.mockResolvedValue({
      data: { 'ceremony.tone': 'neutral', 'announce.tone': 'believer' },
      error: null,
    });
    m.getCurrentPhoto.mockResolvedValue({ data: null, error: { code: 'x' } });
    m.getMyRole.mockResolvedValue('viewer');
    const props = await loadDocumentsSynthesis({ ...PARAMS, locale: 'en' });
    expect(m.documentStarterTexts).toHaveBeenCalledWith('neutral', 'en');
    expect(props.photoId).toBeNull();
    expect(props.canEdit).toBe(false);
  });

  it('lève quand les réponses sont illisibles', async () => {
    m.listAnswersResult.mockResolvedValue({ data: null, error: { code: 'x' } });
    await expect(loadDocumentsSynthesis(PARAMS)).rejects.toThrow('documents summary unreadable');
  });
});
