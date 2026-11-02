import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import type { PanelGroup } from '@/modules/providers/panel';
import type { QuoteHistoryItem } from '@/modules/providers/quote-service';
import { type PanelQuote, ProviderPanel } from '@/modules/providers/ui/ProviderPanel';
import { QuoteHistory } from '@/modules/providers/ui/QuoteHistory';
import { ceremonyDate, ceremonyPlaces, placeHref, sortedProgram } from '../ceremony';
import type { Answers } from '../progress';
import { CEREMONY_STEP_ID, ceremonyProgramStep } from '../steps/3-4-ceremony-program';

interface Props {
  dossierId: string;
  locale: string;
  /** Réponses de l'étape 3.4 (les autres clés sont ignorées). */
  answers: Answers;
  canAnswer: boolean;
  /** `quote` vaut null sans le rôle coordinateur ou sans prestataire contactable. */
  panel: { city: string; groups: readonly PanelGroup[]; quote: PanelQuote | null };
  /** « Devis demandés » de l'étape ; vide sans demande ou si la lecture échoue. */
  quotes: readonly QuoteHistoryItem[];
}

// WHY: « Écrire le programme » ouvre directement la question du programme (`?q=<index>`).
const PROGRAM_INDEX = ceremonyProgramStep.questions.findIndex(
  (question) => question.key === 'ceremony.program',
);

/** Lien d'itinéraire Google Maps, dans un nouvel onglet, au nom accessible explicite. */
function DirectionsLink({ href, label, text }: { href: string; label: string; text: string }) {
  return (
    <a
      href={href}
      target="_blank"
      // WHY: le site ouvert ne doit ni piloter cet onglet (`opener`) ni recevoir l'adresse du
      // dossier (`referer`), qui contient son identifiant.
      rel="noopener noreferrer"
      aria-label={label}
      className="text-primary whitespace-nowrap text-sm font-semibold hover:underline"
    >
      {text}
    </a>
  );
}

/**
 * Synthèse de l'étape 3.4 : date des obsèques, lieux avec itinéraire Maps, programme trié par
 * heure, puis encadré prestataires et devis demandés, comme les synthèses 3.1 et 3.2.
 *
 * @example
 * <CeremonySynthesis dossierId={id} locale="fr" answers={answers} canAnswer panel={panel} quotes={[]} />
 */
export function CeremonySynthesis(props: Props) {
  const { dossierId, locale, answers, canAnswer, panel, quotes } = props;
  const t = useTranslations('journey');
  const date = ceremonyDate(answers['ceremony.date'], locale);
  const places = ceremonyPlaces(answers);
  const program = sortedProgram(answers['ceremony.program']);
  const stepHref = `/dossier/${dossierId}/etape/${CEREMONY_STEP_ID}`;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header className="space-y-2">
        <h1 className="font-display text-foreground text-3xl font-bold">
          {t(`steps.${CEREMONY_STEP_ID}.title`)}
        </h1>
      </header>

      <section aria-labelledby="ceremony-date-title" className="space-y-1">
        <h2 id="ceremony-date-title" className="font-display text-foreground text-lg font-semibold">
          {t('synthesis.ceremony.dateTitle')}
        </h2>
        <p className={date ? 'text-foreground' : 'text-muted-foreground'}>
          {date ?? t('synthesis.ceremony.dateUnknown')}
        </p>
      </section>

      <section aria-labelledby="ceremony-places-title" className="space-y-3">
        <h2
          id="ceremony-places-title"
          className="font-display text-foreground text-lg font-semibold"
        >
          {t('synthesis.ceremony.placesTitle')}
        </h2>
        {places.length === 0 ? (
          <p className="text-muted-foreground">{t('synthesis.ceremony.noPlaces')}</p>
        ) : (
          <dl className="space-y-3">
            {places.map((place) => {
              const label = t(`synthesis.ceremony.places.${place.key}`);
              return (
                <div key={place.key} className="space-y-0.5">
                  <dt className="text-muted-foreground text-sm">{label}</dt>
                  <dd className="text-foreground flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="break-words [overflow-wrap:anywhere]">{place.text}</span>
                    {place.href && (
                      <DirectionsLink
                        href={place.href}
                        text={t('synthesis.ceremony.directions')}
                        label={t('synthesis.ceremony.directionsLabel', { target: label })}
                      />
                    )}
                  </dd>
                </div>
              );
            })}
          </dl>
        )}
      </section>

      <section aria-labelledby="ceremony-program-title" className="space-y-3">
        <h2
          id="ceremony-program-title"
          className="font-display text-foreground text-lg font-semibold"
        >
          {t('synthesis.ceremony.programTitle')}
        </h2>
        {program.length === 0 ? (
          <div className="border-border space-y-3 rounded-2xl border p-5">
            <p className="text-foreground">{t('synthesis.ceremony.noProgram')}</p>
            {canAnswer && (
              <Link
                href={`${stepHref}?q=${PROGRAM_INDEX}`}
                className="text-primary text-sm font-semibold hover:underline"
              >
                {t('synthesis.ceremony.writeProgram')}
              </Link>
            )}
          </div>
        ) : (
          <div className="border-border overflow-x-auto rounded-2xl border">
            <table aria-labelledby="ceremony-program-title" className="w-full text-sm">
              <thead className="text-muted-foreground text-left">
                <tr className="border-border border-b">
                  <th scope="col" className="px-4 py-2 font-semibold">
                    {t('synthesis.ceremony.columns.time')}
                  </th>
                  <th scope="col" className="px-4 py-2 font-semibold">
                    {t('synthesis.ceremony.columns.moment')}
                  </th>
                  <th scope="col" className="px-4 py-2 font-semibold">
                    {t('synthesis.ceremony.columns.place')}
                  </th>
                  <th scope="col" className="px-4 py-2 font-semibold">
                    {t('synthesis.ceremony.columns.lead')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {program.map((item, index) => {
                  const href = item.place ? placeHref(item.place) : null;
                  return (
                    // WHY: deux moments peuvent partager heure et intitulé ; l'index (liste triée
                    // côté serveur, rendu statique) distingue les lignes.
                    <tr
                      key={`${index}-${item.time}`}
                      className="border-border border-b last:border-0"
                    >
                      <td className="px-4 py-2 align-top tabular-nums">{item.time}</td>
                      <th scope="row" className="px-4 py-2 text-left align-top font-normal">
                        {item.moment}
                      </th>
                      <td className="px-4 py-2 align-top">
                        {item.place && (
                          <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                            <span className="break-words [overflow-wrap:anywhere]">
                              {item.place}
                            </span>
                            {href && (
                              <DirectionsLink
                                href={href}
                                text={t('synthesis.ceremony.directions')}
                                // WHY: plusieurs moments peuvent porter le même intitulé ;
                                // l'heure distingue leurs liens pour un lecteur d'écran.
                                label={t('synthesis.ceremony.directionsLabel', {
                                  target: `${item.time} ${item.moment}`,
                                })}
                              />
                            )}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 align-top">{item.lead}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <ProviderPanel city={panel.city} groups={panel.groups} quote={panel.quote} />
      <QuoteHistory items={quotes} locale={locale} />

      <div className="flex flex-wrap justify-between gap-3 text-sm">
        {canAnswer && (
          <Link
            href={stepHref}
            className="text-secondary font-semibold underline underline-offset-2"
          >
            {t('synthesis.editAnswers')}
          </Link>
        )}
        <Link
          href={`/dossier/${dossierId}`}
          className="text-foreground underline underline-offset-2"
        >
          ← {t('synthesis.backToDossier')}
        </Link>
      </div>
    </div>
  );
}
