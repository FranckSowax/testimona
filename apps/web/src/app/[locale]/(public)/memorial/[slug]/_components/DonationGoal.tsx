import { getTranslations } from 'next-intl/server';
import { getSupabaseServer } from '@/lib/supabase/server';

interface DonationRow {
  amount: number;
  currency: string;
}

async function getDonationStats(memorialId: string): Promise<{
  goalCents: number;
  raisedCents: number;
  currency: string;
  count: number;
}> {
  const supabase = await getSupabaseServer();

  const { data: memorial } = await supabase
    .from('Memorial')
    .select('donationGoalCents')
    .eq('id', memorialId)
    .maybeSingle<{ donationGoalCents: number }>();

  const { data: donations } = await supabase
    .from('Donation')
    .select('amount, currency')
    .eq('memorialId', memorialId)
    .eq('status', 'Succeeded')
    .returns<DonationRow[]>();

  const list = donations ?? [];
  const raisedCents = list.reduce((acc, d) => acc + (d.amount ?? 0), 0);
  const currency = list[0]?.currency ?? 'EUR';
  return {
    goalCents: memorial?.donationGoalCents ?? 0,
    raisedCents,
    currency,
    count: list.length,
  };
}

function format(cents: number, currency: string): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export async function DonationGoal({ memorialId }: { memorialId: string }) {
  const stats = await getDonationStats(memorialId);
  const t = await getTranslations('donate');

  if (stats.goalCents === 0 && stats.raisedCents === 0 && stats.count === 0) return null;

  const pct =
    stats.goalCents > 0
      ? Math.min(100, Math.round((stats.raisedCents / stats.goalCents) * 100))
      : 0;

  const raised = format(stats.raisedCents, stats.currency);
  const goal = stats.goalCents > 0 ? format(stats.goalCents, stats.currency) : null;

  return (
    <div className="rounded-lg border border-border bg-white p-5 shadow-sm">
      <p className="font-display text-sm font-semibold uppercase tracking-widest text-foreground/70">
        {t('goalTitle')}
      </p>
      <p className="mt-2 text-2xl font-bold text-foreground">
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
