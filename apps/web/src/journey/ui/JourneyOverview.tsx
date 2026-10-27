import { getTranslations } from 'next-intl/server';
import { buttonClasses } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Link } from '@/i18n/navigation';
import { nextQuestion, stepProgress, type Answers } from '../progress';
import type { Step } from '../types';

interface Props {
  dossierId: string;
  steps: readonly Step[];
  answers: Answers;
  name: string;
  status: 'alive' | 'deceased';
}

/** Carte « Prochaine question » et avancement de chaque étape (questions passées « à compléter »). */
export async function JourneyOverview({ dossierId, steps, answers, name, status }: Props) {
  const t = await getTranslations('journey');
  const next = nextQuestion(steps, answers);
  const nextKey = next
    ? steps.find((step) => step.id === next.stepId)?.questions[next.index]?.key
    : undefined;

  return (
    <div className="space-y-4">
      <div className="bg-secondary text-secondary-foreground rounded-2xl p-6">
        <h3 className="font-display text-lg font-semibold">{t('dashboard.nextTitle')}</h3>
        {next && nextKey ? (
          <>
            <p className="mt-2 text-white/80">{t(`q.${nextKey}.title`, { name, status })}</p>
            <Link
              href={`/dossier/${dossierId}/etape/${next.stepId}?q=${next.index}`}
              className={`${buttonClasses({ variant: 'primary', size: 'md' })} mt-4`}
            >
              {t('dashboard.answer')}
            </Link>
          </>
        ) : (
          <p className="mt-2 text-white/80">{t('dashboard.allDone')}</p>
        )}
      </div>

      <ul className="border-border divide-border divide-y rounded-2xl border">
        {steps.map((step) => {
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
                <span className="text-muted-foreground text-sm">
                  {t('dashboard.stepProgress', {
                    answered: progress.answered,
                    total: progress.total,
                  })}
                </span>
              </div>
              <ProgressBar value={progress.answered} max={progress.total} ariaLabel={title} />
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
