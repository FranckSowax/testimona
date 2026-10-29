import { getTranslations } from 'next-intl/server';
import { buttonClasses } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Link } from '@/i18n/navigation';
import { summaryPath } from '../paths';
import { nextQuestion, stepProgress, type Answers } from '../progress';
import type { Step } from '../types';

interface Props {
  dossierId: string;
  steps: readonly Step[];
  answers: Answers;
  name: string;
  status: 'alive' | 'deceased';
  canAnswer: boolean;
}

/**
 * Carte « Prochaine question » et avancement de chaque étape (questions passées « à compléter »).
 * Un lecteur (`canAnswer` faux) est mené au début de l'étape pour la consulter dans l'ordre.
 */
export async function JourneyOverview({
  dossierId,
  steps,
  answers,
  name,
  status,
  canAnswer,
}: Props) {
  const t = await getTranslations('journey');
  const next = nextQuestion(steps, answers);
  const nextKey = next
    ? steps.find((step) => step.id === next.stepId)?.questions[next.index]?.key
    : undefined;
  const firstSkipped = next
    ? undefined
    : steps.find((step) => stepProgress(step, answers).skipped > 0);

  return (
    <div className="space-y-4">
      <div className="bg-secondary text-secondary-foreground rounded-2xl p-6">
        <h3 className="font-display text-lg font-semibold">{t('dashboard.nextTitle')}</h3>
        {next && nextKey ? (
          <>
            <p className="mt-2 text-white/80">{t(`q.${nextKey}.title`, { name, status })}</p>
            <Link
              href={`/dossier/${dossierId}/etape/${next.stepId}?q=${canAnswer ? next.index : 0}`}
              className={`${buttonClasses({ variant: 'primary', size: 'md' })} mt-4`}
            >
              {t(canAnswer ? 'dashboard.answer' : 'dashboard.view')}
            </Link>
          </>
        ) : (
          <>
            <p className="mt-2 text-white/80">{t('dashboard.allDone')}</p>
            {firstSkipped && (
              <Link
                href={`/dossier/${dossierId}/etape/${firstSkipped.id}`}
                className={`${buttonClasses({ variant: 'primary', size: 'md' })} mt-4`}
              >
                {t('dashboard.completeSkipped')}
              </Link>
            )}
          </>
        )}
      </div>

      <ul className="border-border divide-border divide-y rounded-2xl border">
        {steps.map((step, position) => {
          // WHY: B.1 et B.2 mènent à la même page ; un seul lien « Voir le budget », sur la
          // dernière étape qui porte cette synthèse. Une synthèse propre a son lien par étape.
          const summaryHref = summaryPath(dossierId, step);
          const showSummary =
            summaryHref !== null &&
            (step.summary === 'step' ||
              steps.findLastIndex((other) => other.summary === step.summary) === position);
          const progress = stepProgress(step, answers);
          const title = t(`steps.${step.id}.title`);
          return (
            <li key={step.id} className="space-y-2 px-5 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Link
                  href={`/dossier/${dossierId}/etape/${step.id}`}
                  className="text-foreground font-semibold hover:underline"
                >
                  {title}
                </Link>
                {progress.total > 0 && (
                  <span className="text-muted-foreground text-sm">
                    {t('dashboard.stepProgress', {
                      answered: progress.answered,
                      total: progress.total,
                    })}
                  </span>
                )}
              </div>
              <p className="text-muted-foreground text-sm">{t(`steps.${step.id}.description`)}</p>
              {step.draft && (
                <Link
                  href={`/dossier/${dossierId}/etape/${step.id}/brouillon`}
                  className="text-primary text-sm font-semibold hover:underline"
                >
                  {t('dashboard.viewDraft')} <span className="sr-only">{title}</span>
                </Link>
              )}
              {showSummary && summaryHref && step.summary && (
                <Link
                  href={summaryHref}
                  className="text-primary text-sm font-semibold hover:underline"
                >
                  {t(`dashboard.summary.${step.summary}`)}
                  {step.summary === 'step' && <span className="sr-only"> {title}</span>}
                </Link>
              )}
              {progress.total > 0 && (
                <ProgressBar value={progress.answered} max={progress.total} ariaLabel={title} />
              )}
              {progress.skipped > 0 && (
                <p className="text-muted-foreground text-sm">
                  {t('dashboard.toComplete', { count: progress.skipped })}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
