import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { getCurrentUser, getSupabaseServer } from '@/lib/supabase/server';

interface DonationRow {
  id: string;
  memorialId: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
  message: string | null;
}

interface MemorialRow {
  id: string;
  slug: string;
  firstname: string;
  lastname: string;
}

interface ReceivedRow {
  amount: number;
  currency: string;
  status: string;
}

function formatMoney(cents: number, currency: string, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function formatDate(iso: string, locale: string): string {
  return new Date(iso).toLocaleDateString(locale);
}

const STATUS_TONE: Record<string, string> = {
  Succeeded: 'bg-primary/10 text-primary',
  Completed: 'bg-primary/10 text-primary',
  pending: 'bg-amber-100 text-amber-800',
  Failed: 'bg-destructive/10 text-destructive',
  Refunded: 'bg-foreground/10 text-foreground/70',
};

export async function DonationsHistorySection({ locale }: { locale: string }) {
  const user = await getCurrentUser();
  if (!user) return null;
  const supabase = await getSupabaseServer();

  const [t, made, ownedMemorials] = await Promise.all([
    getTranslations('dashboard.profile.donationsHistory'),
    supabase
      .from('Donation')
      .select('id, memorialId, amount, currency, status, createdAt, message')
      .eq('donorId', user.id)
      .order('createdAt', { ascending: false })
      .limit(20)
      .returns<DonationRow[]>(),
    supabase
      .from('Memorial')
      .select('id, slug, firstname, lastname')
      .eq('ownerId', user.id)
      .returns<MemorialRow[]>(),
  ]);

  const donations = made.data ?? [];
  const memorialIds = Array.from(new Set(donations.map((d) => d.memorialId)));
  const memorialsById = new Map<string, MemorialRow>();
  if (memorialIds.length > 0) {
    const { data: memorials } = await supabase
      .from('Memorial')
      .select('id, slug, firstname, lastname')
      .in('id', memorialIds)
      .returns<MemorialRow[]>();
    for (const m of memorials ?? []) memorialsById.set(m.id, m);
  }

  // Received donations on owned memorials
  const ownedIds = (ownedMemorials.data ?? []).map((m) => m.id);
  let receivedRows: ReceivedRow[] = [];
  if (ownedIds.length > 0) {
    const { data } = await supabase
      .from('Donation')
      .select('amount, currency, status')
      .in('memorialId', ownedIds)
      .returns<ReceivedRow[]>();
    receivedRows = data ?? [];
  }
  const receivedPaid = receivedRows.filter(
    (r) => r.status === 'Succeeded' || r.status === 'Completed',
  );
  const totalReceivedCents = receivedPaid.reduce((sum, r) => sum + r.amount, 0);
  const totalReceivedCurrency = receivedPaid[0]?.currency ?? 'EUR';

  const totalMadeCents = donations
    .filter((d) => d.status === 'Succeeded' || d.status === 'Completed')
    .reduce((sum, d) => sum + d.amount, 0);
  const totalMadeCurrency = donations[0]?.currency ?? 'EUR';

  return (
    <div className="space-y-6">
      {/* KPI strip */}
      <div className="grid gap-3 sm:grid-cols-2">
        <article className="rounded-lg border border-border bg-white p-4">
          <p className="font-display text-xs font-bold uppercase tracking-wide text-muted-foreground">
            {t('totalMade')}
          </p>
          <p className="mt-2 font-display text-2xl font-bold tabular text-foreground">
            {formatMoney(totalMadeCents, totalMadeCurrency, locale)}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {t('donationsCount', { count: donations.length })}
          </p>
        </article>
        <article className="rounded-lg border border-border bg-white p-4">
          <p className="font-display text-xs font-bold uppercase tracking-wide text-muted-foreground">
            {t('totalReceived')}
          </p>
          <p className="mt-2 font-display text-2xl font-bold tabular text-foreground">
            {formatMoney(totalReceivedCents, totalReceivedCurrency, locale)}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {t('donationsCount', { count: receivedPaid.length })}
          </p>
        </article>
      </div>

      {/* List of donations made */}
      <section>
        <h3 className="font-display text-base font-bold text-foreground">
          {t('madeListTitle')}
        </h3>
        <div className="mt-3 overflow-hidden rounded-md border border-border bg-white">
          {donations.length === 0 ? (
            <p className="p-6 text-center text-sm italic text-muted-foreground">
              {t('madeEmpty')}
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {donations.map((d) => {
                const memorial = memorialsById.get(d.memorialId);
                return (
                  <li
                    key={d.id}
                    className="flex flex-wrap items-baseline justify-between gap-3 p-4 text-sm"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-display font-bold text-foreground">
                        {formatMoney(d.amount, d.currency, locale)}
                        <span
                          className={[
                            'ml-2 rounded-full px-2 py-0.5 font-display text-[10px] font-bold uppercase tracking-wide',
                            STATUS_TONE[d.status] ?? 'bg-foreground/10 text-foreground/70',
                          ].join(' ')}
                        >
                          {d.status}
                        </span>
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {memorial ? (
                          <Link
                            href={`/memorial/${memorial.slug}`}
                            className="hover:text-primary"
                          >
                            {memorial.firstname} {memorial.lastname}
                          </Link>
                        ) : (
                          d.memorialId.slice(0, 8)
                        )}
                        {' · '}
                        {formatDate(d.createdAt, locale)}
                      </p>
                      {d.message && (
                        <p className="mt-1 line-clamp-2 text-xs italic text-muted-foreground">
                          “{d.message}”
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
