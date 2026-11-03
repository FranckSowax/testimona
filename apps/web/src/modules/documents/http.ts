import 'server-only';
import { getTranslations } from 'next-intl/server';
import { z } from 'zod';
import type { CeremonyPlaceKey } from '@/journey/ceremony';
import { isStepOpen } from '@/journey/registry';
import { DOCUMENTS_STEP_ID } from '@/journey/steps/3-5-funeral-documents';
import { getCurrentUser } from '@/lib/supabase/server';
import { listAnswersResult } from '@/modules/dossier/answers/repo';
import { getDossier, getMyRole, getPersonResult } from '@/modules/dossier/repo';
import {
  bookletData,
  DOCUMENT_KINDS,
  type DocumentInputs,
  type DocumentKind,
  type DocumentLabels,
  type DocumentMissing,
  documentInputs,
  documentReadiness,
  posterData,
} from './model';
import { currentPhotoBytes } from './photo/service';
import { renderBooklet, renderPosterPdf, renderPosterPng } from './render';

const DossierIdSchema = z.string().uuid();
const DocumentKindSchema = z.enum(DOCUMENT_KINDS);
// WHY: une langue absente ou inconnue retombe sur le français, langue par défaut de l'application.
const LangSchema = z.enum(['fr', 'en']).catch('fr');
type Lang = z.infer<typeof LangSchema>;

const NO_STORE = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
const TEXT = { 'Content-Type': 'text/plain; charset=utf-8', ...NO_STORE };

const PLACE_KEYS: readonly CeremonyPlaceKey[] = ['liftPlace', 'servicePlace', 'burialPlace'];

const FILES: Record<DocumentKind, { name: 'booklet' | 'poster'; ext: string; type: string }> = {
  'booklet.pdf': { name: 'booklet', ext: 'pdf', type: 'application/pdf' },
  'poster.pdf': { name: 'poster', ext: 'pdf', type: 'application/pdf' },
  'poster.png': { name: 'poster', ext: 'png', type: 'image/png' },
};

function _empty(status: 401 | 404): Response {
  return new Response(null, { status, headers: NO_STORE });
}

/** Message générique traduit d'une erreur serveur ; statut seul si la traduction échoue. */
async function _failure(status: 500 | 502, lang: Lang): Promise<Response> {
  try {
    const t = await getTranslations({ locale: lang, namespace: 'dossier.errors' });
    return new Response(t('unknown'), { status, headers: TEXT });
  } catch {
    // WHY: si la traduction échoue elle-même, le statut seul vaut mieux qu'une seconde exception.
    return new Response(null, { status, headers: NO_STORE });
  }
}

async function _labels(lang: Lang): Promise<DocumentLabels> {
  const [t, tPlaces] = await Promise.all([
    getTranslations({ locale: lang, namespace: 'documents.labels' }),
    // WHY: mêmes intitulés de lieux que la synthèse de l'étape 3.4, pour que les documents
    // impriment ce que la famille a vu à l'écran.
    getTranslations({ locale: lang, namespace: 'journey.synthesis.ceremony.places' }),
  ]);
  return {
    tribute: t('tribute'),
    program: t('program'),
    thanks: t('thanks'),
    time: t('time'),
    moment: t('moment'),
    place: t('place'),
    lead: t('lead'),
    dateToBeConfirmed: t('dateToBeConfirmed'),
    places: Object.fromEntries(PLACE_KEYS.map((key) => [key, tPlaces(key)])) as Record<
      CeremonyPlaceKey,
      string
    >,
  };
}

async function _missing(missing: DocumentMissing[], lang: Lang): Promise<Response> {
  const t = await getTranslations({ locale: lang, namespace: 'documents.missing' });
  const body = [t('intro'), ...missing.map((item) => `- ${t(item)}`)].join('\n');
  return new Response(body, { status: 409, headers: TEXT });
}

function _render(
  kind: DocumentKind,
  inputs: DocumentInputs,
  labels: DocumentLabels,
  photo: Uint8Array | null,
): Promise<Uint8Array> {
  if (kind === 'booklet.pdf') return renderBooklet(bookletData(inputs, labels, photo));
  if (kind === 'poster.pdf') return renderPosterPdf(posterData(kind, inputs, labels, photo));
  return renderPosterPng(posterData(kind, inputs, labels, photo));
}

async function _documentResponse(dossierId: string, doc: string, lang: Lang): Promise<Response> {
  if (!(await getCurrentUser())) return _empty(401);
  const kind = DocumentKindSchema.safeParse(doc);
  if (!DossierIdSchema.safeParse(dossierId).success || !kind.success) return _empty(404);

  // WHY: absent, non-membre et étape fermée donnent tous 404 sans corps, pour ne rien révéler.
  const [dossier, role] = await Promise.all([getDossier(dossierId), getMyRole(dossierId)]);
  if (!dossier || !role || !isStepOpen(dossier.entryPoint, DOCUMENTS_STEP_ID)) return _empty(404);

  const [person, answers] = await Promise.all([
    getPersonResult(dossierId),
    listAnswersResult(dossierId),
  ]);
  if (person.error || answers.error) return _failure(502, lang);

  const inputs = documentInputs({
    person: person.data,
    dossierTitle: dossier.title,
    answers: answers.data,
    locale: lang,
  });
  // WHY: jamais de document vide ou à moitié rempli : on dit ce qui manque.
  const missing = documentReadiness(kind.data, inputs);
  if (missing.length > 0) return _missing(missing, lang);

  // WHY: la photo est lue seulement quand le document sera produit ; son absence n'empêche rien.
  const [photo, labels, tFiles] = await Promise.all([
    currentPhotoBytes(dossierId),
    _labels(lang),
    getTranslations({ locale: lang, namespace: 'documents.files' }),
  ]);
  const bytes = await _render(kind.data, inputs, labels, photo.data);
  const file = FILES[kind.data];
  return new Response(bytes as BodyInit, {
    status: 200,
    headers: {
      'Content-Type': file.type,
      'Content-Disposition': `attachment; filename="${tFiles(file.name)}.${file.ext}"`,
      ...NO_STORE,
    },
  });
}

/**
 * Réponse de « Télécharger le livret / l'affiche » : session exigée, tout membre du dossier
 * (lecteur compris), étape 3.5 ouverte. 409 avec un texte traduit listant ce qui manque quand le
 * document n'est pas prêt.
 * WHY: le document est produit à la demande avec le client de l'utilisateur (RLS), jamais
 * service-role, et n'est jamais mis en cache.
 *
 * @example
 * export async function GET(req, { params }) {
 *   const { dossierId, doc } = await params;
 *   return documentResponse(dossierId, doc, new URL(req.url).searchParams.get('lang'));
 * }
 */
export async function documentResponse(
  dossierId: string,
  doc: string,
  lang: string | null,
): Promise<Response> {
  const locale = LangSchema.parse(lang ?? undefined);
  try {
    return await _documentResponse(dossierId, doc, locale);
  } catch (error) {
    // WHY: seul le nom de l'erreur est journalisé : jamais un nom ni un texte du dossier.
    console.error('[documents] download failed', {
      name: error instanceof Error ? error.name : 'unknown',
    });
    return _failure(500, locale);
  }
}
