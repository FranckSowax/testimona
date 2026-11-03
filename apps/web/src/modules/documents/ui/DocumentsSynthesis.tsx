import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { CEREMONY_STEP_ID, ceremonyProgramStep } from '@/journey/steps/3-4-ceremony-program';
import { DOCUMENTS_STEP_ID } from '@/journey/steps/3-5-funeral-documents';
import {
  DOCUMENT_KINDS,
  type DocumentKind,
  type DocumentMissing,
  type DocumentStyle,
} from '../model';
import { PhotoCapture } from '../photo/ui/PhotoCapture';
import type { DocumentTextKind } from '../texts';
import { DocumentTexts, documentTextId } from './DocumentTexts';

export interface DocumentsSynthesisProps {
  dossierId: string;
  locale: 'fr' | 'en';
  style: DocumentStyle;
  /** Identifiant de la photo courante, null sans photo (ou si elle est illisible). */
  photoId: string | null;
  /** Contributeur et plus : modifier et enregistrer les textes. */
  canEdit: boolean;
  /** Coordinateur et plus : choisir la photo. */
  canEditPhoto: boolean;
  aiEnabled: boolean;
  /** Où compléter le prénom ou la biographie quand l'IA manque de faits. */
  factsHref: string;
  /** Texte enregistré (ou null) et texte de départ de chaque type. */
  texts: Record<DocumentTextKind, { saved: string | null; starter: string }>;
  /** Éléments manquants par format ; liste vide quand le document est prêt. */
  readiness: Record<DocumentKind, readonly DocumentMissing[]>;
}

// WHY: les clés next-intl ne peuvent pas contenir de point ; on nomme chaque format autrement.
const FORMAT_KEYS = {
  'booklet.pdf': 'booklet',
  'poster.pdf': 'posterPdf',
  'poster.png': 'posterPng',
} as const satisfies Record<DocumentKind, string>;

// WHY: « Écrire le programme » ouvre directement la question du programme (`?q=<index>`).
const PROGRAM_INDEX = ceremonyProgramStep.questions.findIndex(
  (question) => question.key === 'ceremony.program',
);
// WHY: un index -1 donnerait un lien `?q=-1` silencieusement faux ; on échoue au chargement.
if (PROGRAM_INDEX < 0) throw new Error('ceremony.program question not found in step 3.4');

const H2 = 'font-display text-foreground text-lg font-semibold';
const LINK = 'text-primary text-sm font-semibold hover:underline';

/** Lien pour compléter un élément manquant : dossier, programme (3.4) ou champ de texte. */
function FixLink({
  dossierId,
  item,
  text,
}: {
  dossierId: string;
  item: DocumentMissing;
  text: string;
}) {
  if (item === 'name' || item === 'program') {
    const href =
      item === 'name'
        ? `/dossier/${dossierId}`
        : `/dossier/${dossierId}/etape/${CEREMONY_STEP_ID}?q=${PROGRAM_INDEX}`;
    return (
      <Link href={href} className={LINK}>
        {text}
      </Link>
    );
  }
  // WHY: ancre sur la même page ; un `<a>` simple évite tout préfixe de langue ajouté par Link.
  return (
    <a href={`#${documentTextId(item)}`} className={LINK}>
      {text}
    </a>
  );
}

/**
 * Synthèse de l'étape 3.5 : présentation choisie, photo, les trois textes du livret, puis un
 * encadré par format avec ce qui manque ou le lien de téléchargement.
 *
 * @example
 * <DocumentsSynthesis {...(await loadDocumentsSynthesis({ dossierId, dossierTitle, locale }))} />
 */
export function DocumentsSynthesis(props: DocumentsSynthesisProps) {
  const { dossierId, locale, style, photoId, canEdit, readiness } = props;
  const t = useTranslations('documents.synthesis');
  const tMissing = useTranslations('documents.missing');
  const tJourney = useTranslations('journey');
  const stepHref = `/dossier/${dossierId}/etape/${DOCUMENTS_STEP_ID}`;
  // WHY: un texte manquant déjà prérempli (texte de départ) n'est pas à écrire mais à relire et
  // enregistrer.
  const fixText = (item: DocumentMissing) =>
    (item === 'cover' || item === 'thanks') && props.texts[item].starter !== ''
      ? t('fix.review')
      : t(`fix.${item}`);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header className="space-y-2">
        <h1 className="font-display text-foreground text-3xl font-bold">
          {tJourney(`steps.${DOCUMENTS_STEP_ID}.title`)}
        </h1>
        <p className="text-muted-foreground">{t('intro')}</p>
        <p className="text-foreground flex flex-wrap items-baseline gap-x-3">
          <span>{t('style', { style: tJourney(`q.documents.style.options.${style}`) })}</span>
          {canEdit && (
            <Link href={`${stepHref}?q=0`} aria-label={t('editStyle')} className={LINK}>
              {t('edit')}
            </Link>
          )}
        </p>
      </header>

      <section aria-labelledby="documents-photo-title" className="space-y-3">
        <h2 id="documents-photo-title" className={H2}>
          {t('photoTitle')}
        </h2>
        {photoId ? (
          // WHY: la route renvoie (303) vers un lien signé de courte durée, que `next/image`
          // mettrait en cache côté serveur. `v` change avec la photo et contourne le cache du
          // navigateur, l'adresse étant sinon stable.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/dossiers/${dossierId}/photo?v=${encodeURIComponent(photoId)}`}
            alt={t('photoAlt')}
            className="border-border h-40 w-32 rounded-xl border object-cover"
          />
        ) : (
          <p className="text-muted-foreground">{t('noPhoto')}</p>
        )}
        <PhotoCapture dossierId={dossierId} canEdit={props.canEditPhoto} />
      </section>

      <DocumentTexts
        dossierId={dossierId}
        texts={props.texts}
        canEdit={canEdit}
        aiEnabled={props.aiEnabled}
        factsHref={props.factsHref}
      />

      <section aria-labelledby="documents-formats-title" className="space-y-4">
        <h2 id="documents-formats-title" className={H2}>
          {t('formatsTitle')}
        </h2>
        {DOCUMENT_KINDS.map((kind) => {
          const missing = readiness[kind];
          const titleId = `documents-format-${FORMAT_KEYS[kind]}`;
          const name = t(`format.${FORMAT_KEYS[kind]}`);
          return (
            <section
              key={kind}
              aria-labelledby={titleId}
              className="border-border space-y-3 rounded-2xl border p-5"
            >
              <h3 id={titleId} className="text-foreground font-semibold">
                {name}
              </h3>
              {missing.length === 0 ? (
                <a
                  href={`/api/dossiers/${dossierId}/documents/${kind}?lang=${locale}`}
                  download
                  aria-label={t('downloadLabel', { format: name })}
                  className="bg-primary text-primary-foreground inline-block rounded-full px-5 py-2 text-sm font-semibold"
                >
                  {t('download')}
                </a>
              ) : (
                <>
                  <p className="text-muted-foreground text-sm">{tMissing('intro')}</p>
                  <ul className="space-y-1">
                    {missing.map((item) => (
                      <li key={item} className="text-foreground flex flex-wrap gap-x-3">
                        <span>{tMissing(item)}</span>
                        {canEdit && (
                          <FixLink dossierId={dossierId} item={item} text={fixText(item)} />
                        )}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </section>
          );
        })}
      </section>

      <div className="flex flex-wrap justify-between gap-3 text-sm">
        {canEdit && (
          <Link
            href={stepHref}
            className="text-secondary font-semibold underline underline-offset-2"
          >
            {tJourney('synthesis.editAnswers')}
          </Link>
        )}
        <Link
          href={`/dossier/${dossierId}`}
          className="text-foreground underline underline-offset-2"
        >
          ← {tJourney('synthesis.backToDossier')}
        </Link>
      </div>
    </div>
  );
}
