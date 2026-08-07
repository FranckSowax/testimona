import { getTranslations } from 'next-intl/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

interface DonationDetailRow {
  donorName: string | null;
  donorEmail: string | null;
  message: string | null;
  amount: number;
  currency: string;
  isAnonymous: boolean;
  createdAt: string;
}

async function getDonationDetails(memorialId: string): Promise<DonationDetailRow[]> {
  // Admin client, not the RLS-bound server client: this panel shows every
  // donor's real name/email to the memorial owner, including donations they
  // didn't personally make — the public DonorsList query can't be reused here.
  const supabase = getSupabaseAdminClient();
  const { data } = await supabase
    .from('Donation')
    .select('donorName, donorEmail, message, amount, currency, isAnonymous, createdAt')
    .eq('memorialId', memorialId)
    .eq('status', 'Succeeded')
    .order('createdAt', { ascending: false })
    .limit(100)
    .returns<DonationDetailRow[]>();
  return data ?? [];
}

function formatMoney(cents: number, currency: string, locale: string): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(cents / 100);
}

/** Owner-only: full donor contact details, including anonymous donors' real names. */
export async function DonorsOwnerPanel({
  memorialId,
  isOwner,
  locale,
}: {
  memorialId: string;
  isOwner: boolean;
  locale: string;
}) {
  if (!isOwner) return null;

  const [t, donations] = await Promise.all([
    getTranslations('memorial.contributorsPanel'),
    getDonationDetails(memorialId),
  ]);

  return (
    <div className="rounded-lg border border-border bg-white shadow-sm">
      <div className="border-b border-border px-4 py-3">
        <h3 className="font-display text-sm font-semibold uppercase tracking-widest text-foreground/70">
          {t('donorsTitle')}
        </h3>
        <p className="mt-0.5 text-xs text-muted-foreground">{t('subtitle')}</p>
      </div>
      {donations.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm italic text-muted-foreground">
          {t('empty')}
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {donations.map((d, i) => (
            <li key={`${d.createdAt}-${i}`} className="space-y-1 px-4 py-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium text-foreground">
                  {d.donorName?.trim() || t('noEmail')}
                  {d.isAnonymous && (
                    <span className="ml-2 rounded-full bg-surface px-2 py-0.5 font-display text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      {t('anonymousBadge')}
                    </span>
                  )}
                </p>
                <span className="font-semibold text-foreground">
                  {formatMoney(d.amount, d.currency, locale)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{d.donorEmail || t('noEmail')}</p>
              <p className="text-xs italic text-muted-foreground">
                {d.message || t('noMessage')}
              </p>
              <p className="text-xs text-muted-foreground">
                {new Date(d.createdAt).toLocaleString(locale)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
