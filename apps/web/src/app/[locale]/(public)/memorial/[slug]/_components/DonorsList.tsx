import { getTranslations } from 'next-intl/server';
import { getSupabaseServer } from '@/lib/supabase/server';

interface DonorRow {
  donorName: string | null;
  isAnonymous: boolean;
  amount: number;
  currency: string;
  createdAt: string;
}

async function getDonors(memorialId: string): Promise<DonorRow[]> {
  const supabase = await getSupabaseServer();
  const { data } = await supabase
    .from('Donation')
    .select('donorName, isAnonymous, amount, currency, createdAt')
    .eq('memorialId', memorialId)
    .eq('status', 'Succeeded')
    .order('createdAt', { ascending: false })
    .limit(30)
    .returns<DonorRow[]>();
  return data ?? [];
}

function format(cents: number, currency: string): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 60) return `il y a ${Math.max(1, minutes)} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.round(hours / 24);
  if (days < 30) return `il y a ${days} j`;
  return new Date(iso).toLocaleDateString('fr-FR');
}

export async function DonorsList({ memorialId }: { memorialId: string }) {
  const t = await getTranslations('donate');
  const donors = await getDonors(memorialId);

  if (donors.length === 0) {
    return (
      <p className="border-border bg-surface text-muted-foreground rounded-md border border-dashed px-4 py-6 text-center text-sm">
        {t('donorsEmpty')}
      </p>
    );
  }

  return (
    <div className="border-border rounded-lg border bg-white shadow-sm">
      <h3 className="border-border font-display text-foreground/70 border-b px-4 py-3 text-sm font-semibold uppercase tracking-widest">
        {t('donorsTitle')}
      </h3>
      <ul className="divide-border divide-y">
        {donors.map((d, i) => {
          const displayName = d.isAnonymous ? null : d.donorName?.trim();
          return (
            <li
              key={`${d.createdAt}-${i}`}
              className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="bg-surface text-foreground/70 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-medium">
                  {(displayName ?? '?')
                    .split(/\s+/)
                    .map((s) => s[0])
                    .filter(Boolean)
                    .slice(0, 2)
                    .join('')
                    .toUpperCase() || '·'}
                </span>
                <div className="min-w-0">
                  <p className="text-foreground truncate font-medium">
                    {displayName || t('donorsAnonymous')}
                  </p>
                  <p className="text-muted-foreground text-xs">{timeAgo(d.createdAt)}</p>
                </div>
              </div>
              <span className="text-foreground font-semibold">{format(d.amount, d.currency)}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
