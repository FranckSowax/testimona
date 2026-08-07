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
      <p className="rounded-md border border-dashed border-border bg-surface px-4 py-6 text-center text-sm text-muted-foreground">
        {t('donorsEmpty')}
      </p>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-white shadow-sm">
      <h3 className="border-b border-border px-4 py-3 font-display text-sm font-semibold uppercase tracking-widest text-foreground/70">
        {t('donorsTitle')}
      </h3>
      <ul className="divide-y divide-border">
        {donors.map((d, i) => {
          const displayName = d.isAnonymous ? null : d.donorName?.trim();
          return (
            <li
              key={`${d.createdAt}-${i}`}
              className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface text-xs font-medium text-foreground/70">
                  {(displayName ?? '?')
                    .split(/\s+/)
                    .map((s) => s[0])
                    .filter(Boolean)
                    .slice(0, 2)
                    .join('')
                    .toUpperCase() || '·'}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">
                    {displayName || t('donorsAnonymous')}
                  </p>
                  <p className="text-xs text-muted-foreground">{timeAgo(d.createdAt)}</p>
                </div>
              </div>
              <span className="font-semibold text-foreground">{format(d.amount, d.currency)}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
