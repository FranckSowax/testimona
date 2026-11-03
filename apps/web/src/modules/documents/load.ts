import 'server-only';
import { TONES } from '@/journey/options';
import { isAiEnabled } from '@/modules/ai/config';
import { listAnswersResult } from '@/modules/dossier/answers/repo';
import { getMyRole, getPersonResult } from '@/modules/dossier/repo';
import { canWrite, hasRole } from '@/modules/dossier/roles';
import {
  DOCUMENT_KINDS,
  type DocumentKind,
  type DocumentMissing,
  documentInputs,
  documentReadiness,
} from './model';
import { getCurrentPhoto } from './photo/repo';
import { documentStarterTexts } from './templates';
import { DOCUMENT_TEXT_KINDS, readDocumentTexts } from './texts';
import type { DocumentsSynthesisProps } from './ui/DocumentsSynthesis';

/**
 * Données de la synthèse de l'étape 3.5 : rôle, photo courante, textes enregistrés et textes
 * de départ, puis éléments manquants par format.
 * WHY: une fiche ou des réponses illisibles lèvent (error.tsx prend le relais) plutôt que
 * d'afficher des documents « prêts » ou « incomplets » à tort ; une photo illisible est
 * simplement masquée, car elle est facultative.
 *
 * @example
 * const props = await loadDocumentsSynthesis({ dossierId: id, dossierTitle: dossier.title, locale });
 */
export async function loadDocumentsSynthesis(params: {
  dossierId: string;
  dossierTitle: string;
  locale: string;
}): Promise<DocumentsSynthesisProps> {
  const { dossierId, dossierTitle } = params;
  const locale = params.locale === 'en' ? 'en' : 'fr';
  const [role, person, answers, photo] = await Promise.all([
    getMyRole(dossierId),
    getPersonResult(dossierId),
    listAnswersResult(dossierId),
    getCurrentPhoto(dossierId),
  ]);
  if (person.error || answers.error) throw new Error('documents summary unreadable');

  const inputs = documentInputs({
    person: person.data,
    dossierTitle,
    answers: answers.data,
    locale,
  });
  const readiness = Object.fromEntries(
    DOCUMENT_KINDS.map((kind) => [kind, documentReadiness(kind, inputs)]),
  ) as Record<DocumentKind, DocumentMissing[]>;

  // WHY: même ordre que les faits de l'IA : le ton de la cérémonie, sinon celui de l'annonce.
  const ceremonyTone = answers.data['ceremony.tone'];
  const tone = TONES.some((code) => code === ceremonyTone)
    ? ceremonyTone
    : answers.data['announce.tone'];
  const starters = await documentStarterTexts(tone, locale);
  const saved = readDocumentTexts(answers.data);
  const texts = Object.fromEntries(
    DOCUMENT_TEXT_KINDS.map((kind) => [
      kind,
      // WHY: l'hommage n'a pas de texte de départ ; il se nourrit de la biographie (IA).
      { saved: saved[kind], starter: kind === 'tribute' ? '' : starters[kind] },
    ]),
  ) as DocumentsSynthesisProps['texts'];

  return {
    dossierId,
    locale,
    style: inputs.style,
    photoId: photo.error ? null : (photo.data?.id ?? null),
    canEdit: canWrite(role),
    canEditPhoto: hasRole(role, 'coordinator'),
    aiEnabled: isAiEnabled(),
    texts,
    readiness,
  };
}
