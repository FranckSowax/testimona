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
    <div className="border-border rounded-lg border bg-white shadow-sm">
      <div className="border-border border-b px-4 py-3">
        <h3 className="font-display text-foreground/70 text-sm font-semibold uppercase tracking-widest">
          {t('donorsTitle')}
        </h3>
        <p className="text-muted-foreground mt-0.5 text-xs">{t('subtitle')}</p>
      </div>
      {donations.length === 0 ? (
        <p className="text-muted-foreground px-4 py-6 text-center text-sm italic">{t('empty')}</p>
      ) : (
        <ul className="divide-border divide-y">
          {donations.map((d, i) => (
            <li key={`${d.createdAt}-${i}`} className="space-y-1 px-4 py-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-foreground font-medium">
                  {d.donorName?.trim() || t('noEmail')}
                  {d.isAnonymous && (
                    <span className="bg-surface font-display text-muted-foreground ml-2 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                      {t('anonymousBadge')}
                    </span>
                  )}
                </p>
                <span className="text-foreground font-semibold">
                  {formatMoney(d.amount, d.currency, locale)}
                </span>
              </div>
              <p className="text-muted-foreground text-xs">{d.donorEmail || t('noEmail')}</p>
              <p className="text-muted-foreground text-xs italic">{d.message || t('noMessage')}</p>
              <p className="text-muted-foreground text-xs">
                {new Date(d.createdAt).toLocaleString(locale)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
