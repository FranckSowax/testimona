import { getTranslations } from 'next-intl/server';
import { getSupabaseServer } from '@/lib/supabase/server';
import { ShareLinkButton } from '@/components/ui/ShareLinkButton';
import { DonationBar } from '@/components/motion/DonationBar';
import { DonationSettingsModalShell } from './DonationSettingsModalShell';

interface DonationRow {
  amount: number;
  currency: string;
}

async function getDonationStats(memorialId: string): Promise<{
  goalCents: number;
  raisedCents: number;
  /** Totals in currencies other than the memorial's, shown alongside. */
  otherTotals: [string, number][];
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
  // The memorial's currency (admin setting) drives the goal/progress; other
  // currencies are NOT summed into it (100 CAD + 50 EUR is not "150 EUR") —
  // they're totalled separately and shown alongside.
  const currency = memorial?.donationCurrency || list[0]?.currency || 'EUR';
  const byCurrency = new Map<string, number>();
  for (const d of list) {
    const cur = (d.currency || currency).toUpperCase();
    byCurrency.set(cur, (byCurrency.get(cur) ?? 0) + (d.amount ?? 0));
  }
  const raisedCents = byCurrency.get(currency.toUpperCase()) ?? 0;
  const otherTotals = Array.from(byCurrency.entries()).filter(
    ([cur]) => cur !== currency.toUpperCase(),
  );
  return {
    goalCents: memorial?.donationGoalCents ?? 0,
    raisedCents,
    otherTotals,
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
    stats.goalCents === 0 && stats.raisedCents === 0 && stats.count === 0 && !stats.about;
  if (isEmpty && !isOwner) return null;

  const pct =
    stats.goalCents > 0
      ? Math.min(100, Math.round((stats.raisedCents / stats.goalCents) * 100))
      : 0;

  const raisedMain = format(stats.raisedCents, stats.currency);
  const raised =
    stats.otherTotals.length > 0
      ? `${raisedMain} · ${stats.otherTotals.map(([cur, cents]) => format(cents, cur)).join(' · ')}`
      : raisedMain;
  const goal = stats.goalCents > 0 ? format(stats.goalCents, stats.currency) : null;

  return (
    <div className="border-border rounded-lg border bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="font-display text-foreground/70 text-sm font-semibold uppercase tracking-widest">
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
        <p className="text-foreground/90 mt-2 whitespace-pre-line text-sm leading-relaxed">
          {stats.about}
        </p>
      ) : isOwner ? (
        <p className="text-muted-foreground mt-2 text-sm italic">{t('ownerAboutHint')}</p>
      ) : null}

      <p className="text-foreground mt-3 text-2xl font-bold">
        {goal ? t('goalRaised', { raised, goal }) : t('goalNoTarget', { raised })}
      </p>
      {goal && <DonationBar pct={pct} />}
      <p className="text-muted-foreground mt-2 text-xs">
        {t('goalSupporters', { count: stats.count })}
      </p>
    </div>
  );
}
