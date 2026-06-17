import { getTranslations } from 'next-intl/server';
import { getSupabaseServer } from '@/lib/supabase/server';
import { ShareLinkButton } from '@/components/ui/ShareLinkButton';
import { DonationSettingsModalShell } from './DonationSettingsModalShell';

interface DonationRow {
  amount: number;
  currency: string;
}

async function getDonationStats(memorialId: string): Promise<{
  goalCents: number;
  raisedCents: number;
  currency: string;
  count: number;
  about: string | null;
}> {
  const supabase = await getSupabaseServer();

  const { data: memorial } = await supabase
    .from('Memorial')
    .select('donationGoalCents, donationCurrency, donationAbout')
    .eq('id', memorialId)
    .maybeSingle<{
      donationGoalCents: number;
      donationCurrency: string | null;
      donationAbout: string | null;
    }>();

  const { data: donations } = await supabase
    .from('Donation')
    .select('amount, currency')
    .eq('memorialId', memorialId)
    .eq('status', 'Succeeded')
    .returns<DonationRow[]>();

  const list = donations ?? [];
  const raisedCents = list.reduce((acc, d) => acc + (d.amount ?? 0), 0);
  const currency = memorial?.donationCurrency || list[0]?.currency || 'EUR';
  return {
    goalCents: memorial?.donationGoalCents ?? 0,
    raisedCents,
    currency,
    count: list.length,
    about: memorial?.donationAbout ?? null,
  };
}

function format(cents: number, currency: string): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export async function DonationGoal({
  memorialId,
  slug,
  isOwner = false,
  shareUrl,
}: {
  memorialId: string;
  slug?: string;
  isOwner?: boolean;
  shareUrl?: string;
}) {
  const stats = await getDonationStats(memorialId);
  const t = await getTranslations('donate');

  // Public: hide the empty card. Owner: always show so they can set a goal
  // and write the "about the donation" message (D3/D4).
  const isEmpty =
    stats.goalCents === 0 &&
    stats.raisedCents === 0 &&
    stats.count === 0 &&
    !stats.about;
  if (isEmpty && !isOwner) return null;

  const pct =
    stats.goalCents > 0
      ? Math.min(100, Math.round((stats.raisedCents / stats.goalCents) * 100))
      : 0;

  const raised = format(stats.raisedCents, stats.currency);
  const goal = stats.goalCents > 0 ? format(stats.goalCents, stats.currency) : null;

  return (
    <div className="rounded-lg border border-border bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="font-display text-sm font-semibold uppercase tracking-widest text-foreground/70">
          {t('goalTitle')}
        </p>
        <div className="flex shrink-0 items-center gap-1">
          {shareUrl && <ShareLinkButton url={shareUrl} title={t('goalTitle')} />}
          {isOwner && slug && (
            <DonationSettingsModalShell
              memorialId={memorialId}
              slug={slug}
              initialGoalEuros={Math.round(stats.goalCents / 100)}
              initialCurrency={stats.currency}
              initialAbout={stats.about ?? ''}
            />
          )}
        </div>
      </div>

      {/* About the donation — owner's message to potential donors (D3). */}
      {stats.about ? (
        <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-foreground/90">
          {stats.about}
        </p>
      ) : isOwner ? (
        <p className="mt-2 text-sm italic text-muted-foreground">
          Ajoutez un mot à l&apos;attention des donateurs et un objectif de
          collecte via le bouton ✎.
        </p>
      ) : null}

      <p className="mt-3 text-2xl font-bold text-foreground">
        {goal ? t('goalRaised', { raised, goal }) : t('goalNoTarget', { raised })}
      </p>
      {goal && (
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          className="mt-3 h-2 w-full overflow-hidden rounded-full bg-surface"
        >
          <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
        </div>
      )}
      <p className="mt-2 text-xs text-muted-foreground">
        {t('goalSupporters', { count: stats.count })}
      </p>
    </div>
  );
}
