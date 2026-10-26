import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { getCurrentUser, getSupabaseServer } from '@/lib/supabase/server';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { EmptyState } from '@/components/EmptyState';
import { findProduct } from '@/lib/shop/catalog';
import { ContributionGroup, type Contributor } from './ContributionGroup';

interface MemorialSummary {
  donationTotal: number;
  donationCount: number;
  donationCurrency: string;
  donors: Contributor[];
  shopTotal: number;
  shopCount: number;
  shopBuyers: Contributor[];
}

export const metadata: Metadata = {
  title: 'Notifications',
  robots: { index: false, follow: false },
};

interface MemorialLite {
  id: string;
  slug: string;
  firstname: string;
  lastname: string;
}

interface TestimonialReceived {
  id: string;
  memorialId: string;
  authorName: string;
  authorId: string;
  createdAt: string;
}

interface MyTestimonialLite {
  id: string;
  memorialId: string;
}

interface LikeRow {
  testimonialId: string;
  userId: string;
  createdAt: string;
}

interface CommentRow {
  id: string;
  testimonialId: string;
  authorId: string;
  authorName: string;
  createdAt: string;
}

interface DonationRow {
  id: string;
  memorialId: string;
  donorName: string | null;
  amount: number;
  currency: string;
  createdAt: string;
}

type Event =
  | {
      kind: 'testimonial';
      createdAt: string;
      memorial: MemorialLite;
      authorName: string;
      testimonialId: string;
    }
  | {
      kind: 'like';
      createdAt: string;
      memorial: MemorialLite;
      testimonialId: string;
    }
  | {
      kind: 'comment';
      createdAt: string;
      memorial: MemorialLite;
      authorName: string;
      testimonialId: string;
    }
  | {
      kind: 'donation';
      createdAt: string;
      memorial: MemorialLite;
      donorName: string | null;
      amount: number;
      currency: string;
      donationId: string;
    };

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/dashboard/notifications');

  const t = await getTranslations('dashboard.notifications');
  const supabase = await getSupabaseServer();

  const { data: ownedMemorials } = await supabase
    .from('Memorial')
    .select('id, slug, firstname, lastname')
    .eq('ownerId', user.id)
    .returns<MemorialLite[]>();

  const ownedIds = (ownedMemorials ?? []).map((m) => m.id);
  const memorialMap = new Map<string, MemorialLite>();
  for (const m of ownedMemorials ?? []) memorialMap.set(m.id, m);

  const { data: myTestimonials } = await supabase
    .from('Testimonial')
    .select('id, memorialId')
    .eq('authorId', user.id)
    .returns<MyTestimonialLite[]>();

  const myTestimonialIds = (myTestimonials ?? []).map((tt) => tt.id);
  const myTestimonialMemorialMap = new Map<string, string>();
  for (const tt of myTestimonials ?? []) myTestimonialMemorialMap.set(tt.id, tt.memorialId);

  const missingIds = Array.from(new Set((myTestimonials ?? []).map((tt) => tt.memorialId))).filter(
    (id) => !memorialMap.has(id),
  );
  if (missingIds.length > 0) {
    const { data: extra } = await supabase
      .from('Memorial')
      .select('id, slug, firstname, lastname')
      .in('id', missingIds)
      .returns<MemorialLite[]>();
    for (const m of extra ?? []) memorialMap.set(m.id, m);
  }

  const [receivedRes, likesRes, commentsRes, donationsRes] = await Promise.all([
    ownedIds.length > 0
      ? supabase
          .from('Testimonial')
          .select('id, memorialId, authorName, authorId, createdAt')
          .in('memorialId', ownedIds)
          .neq('authorId', user.id)
          .order('createdAt', { ascending: false })
          .limit(20)
          .returns<TestimonialReceived[]>()
      : Promise.resolve({ data: [] as TestimonialReceived[] }),
    myTestimonialIds.length > 0
      ? supabase
          .from('TestimonialLike')
          .select('testimonialId, userId, createdAt')
          .in('testimonialId', myTestimonialIds)
          .neq('userId', user.id)
          .order('createdAt', { ascending: false })
          .limit(20)
          .returns<LikeRow[]>()
      : Promise.resolve({ data: [] as LikeRow[] }),
    myTestimonialIds.length > 0
      ? supabase
          .from('TestimonialComment')
          .select('id, testimonialId, authorId, authorName, createdAt')
          .in('testimonialId', myTestimonialIds)
          .neq('authorId', user.id)
          .order('createdAt', { ascending: false })
          .limit(20)
          .returns<CommentRow[]>()
      : Promise.resolve({ data: [] as CommentRow[] }),
    ownedIds.length > 0
      ? supabase
          .from('Donation')
          .select('id, memorialId, donorName, amount, currency, createdAt')
          .in('memorialId', ownedIds)
          .eq('status', 'Succeeded')
          .order('createdAt', { ascending: false })
          .limit(20)
          .returns<DonationRow[]>()
      : Promise.resolve({ data: [] as DonationRow[] }),
  ]);

  const events: Event[] = [];

  for (const r of receivedRes.data ?? []) {
    const memorial = memorialMap.get(r.memorialId);
    if (!memorial) continue;
    events.push({
      kind: 'testimonial',
      createdAt: r.createdAt,
      memorial,
      authorName: r.authorName || t('anonymous'),
      testimonialId: r.id,
    });
  }
  for (const l of likesRes.data ?? []) {
    const memorialId = myTestimonialMemorialMap.get(l.testimonialId);
    if (!memorialId) continue;
    const memorial = memorialMap.get(memorialId);
    if (!memorial) continue;
    events.push({
      kind: 'like',
      createdAt: l.createdAt,
      memorial,
      testimonialId: l.testimonialId,
    });
  }
  for (const c of commentsRes.data ?? []) {
    const memorialId = myTestimonialMemorialMap.get(c.testimonialId);
    if (!memorialId) continue;
    const memorial = memorialMap.get(memorialId);
    if (!memorial) continue;
    events.push({
      kind: 'comment',
      createdAt: c.createdAt,
      memorial,
      authorName: c.authorName || t('anonymous'),
      testimonialId: c.testimonialId,
    });
  }
  for (const d of donationsRes.data ?? []) {
    const memorial = memorialMap.get(d.memorialId);
    if (!memorial) continue;
    events.push({
      kind: 'donation',
      createdAt: d.createdAt,
      memorial,
      donorName: d.donorName,
      amount: d.amount,
      currency: d.currency,
      donationId: d.id,
    });
  }

  events.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  const top = events.slice(0, 50);

  // N1-N3 — per-memorial contribution summary: total + recent donors/buyers.
  const summaries = new Map<string, MemorialSummary>();
  function ensureSummary(memorialId: string): MemorialSummary {
    let s = summaries.get(memorialId);
    if (!s) {
      s = {
        donationTotal: 0,
        donationCount: 0,
        donationCurrency: 'EUR',
        donors: [],
        shopTotal: 0,
        shopCount: 0,
        shopBuyers: [],
      };
      summaries.set(memorialId, s);
    }
    return s;
  }

  if (ownedIds.length > 0) {
    const [allDonationsRes, shopItemsRes] = await Promise.all([
      supabase
        .from('Donation')
        .select('memorialId, donorName, amount, currency, createdAt')
        .in('memorialId', ownedIds)
        .eq('status', 'Succeeded')
        .order('createdAt', { ascending: false })
        .limit(500)
        .returns<
          {
            memorialId: string;
            donorName: string | null;
            amount: number;
            currency: string;
            createdAt: string;
          }[]
        >(),
      supabase
        .from('MemorialShopItem')
        .select('id, memorialId, productId')
        .in('memorialId', ownedIds)
        .returns<{ id: string; memorialId: string; productId: string }[]>(),
    ]);

    for (const d of allDonationsRes.data ?? []) {
      const s = ensureSummary(d.memorialId);
      s.donationTotal += d.amount ?? 0;
      s.donationCount += 1;
      s.donationCurrency = d.currency || s.donationCurrency;
      s.donors.push({
        name: d.donorName || t('anonymous'),
        amountCents: d.amount ?? 0,
        currency: d.currency || 'EUR',
        createdAt: d.createdAt,
      });
    }

    const shopItems = shopItemsRes.data ?? [];
    const shopItemMemorial = new Map(shopItems.map((it) => [it.id, it.memorialId]));
    const shopItemName = new Map(
      shopItems.map((it) => [it.id, findProduct(it.productId)?.name ?? it.productId]),
    );
    if (shopItems.length > 0) {
      const { data: contribs } = await supabase
        .from('ShopContribution')
        .select('shopItemId, donorName, amountCents, createdAt')
        .in(
          'shopItemId',
          shopItems.map((it) => it.id),
        )
        .eq('status', 'Succeeded')
        .order('createdAt', { ascending: false })
        .limit(500)
        .returns<
          {
            shopItemId: string;
            donorName: string | null;
            amountCents: number;
            createdAt: string;
          }[]
        >();
      for (const c of contribs ?? []) {
        const memorialId = shopItemMemorial.get(c.shopItemId);
        if (!memorialId) continue;
        const s = ensureSummary(memorialId);
        s.shopTotal += c.amountCents ?? 0;
        s.shopCount += 1;
        s.shopBuyers.push({
          name: c.donorName || t('anonymous'),
          amountCents: c.amountCents ?? 0,
          currency: 'EUR',
          createdAt: c.createdAt,
          detail: shopItemName.get(c.shopItemId),
        });
      }
    }
  }

  const summaryCards = (ownedMemorials ?? [])
    .map((m) => ({ memorial: m, summary: summaries.get(m.id) }))
    .filter(
      (x): x is { memorial: MemorialLite; summary: MemorialSummary } =>
        !!x.summary && (x.summary.donationCount > 0 || x.summary.shopCount > 0),
    );

  // N4 — "Votre réseau": when someone who has posted on one of YOUR memorials
  // also posts on another memorial (that you don't own), surface it so you can
  // recognise them and join the conversation.
  const networkEvents: {
    authorName: string;
    memorial: MemorialLite;
    testimonialId: string;
    createdAt: string;
  }[] = [];
  if (ownedIds.length > 0) {
    // People who engaged with my memorials (authors of testimonials on them).
    const { data: engagerRows } = await supabase
      .from('Testimonial')
      .select('authorId')
      .in('memorialId', ownedIds)
      .not('authorId', 'is', null)
      .neq('authorId', user.id)
      .limit(500)
      .returns<{ authorId: string }[]>();
    const engagerIds = Array.from(
      new Set((engagerRows ?? []).map((r) => r.authorId).filter(Boolean)),
    ).slice(0, 200);

    if (engagerIds.length > 0) {
      const { data: crossRows } = await supabase
        .from('Testimonial')
        .select('id, memorialId, authorName, createdAt')
        .in('authorId', engagerIds)
        .eq('status', 'approved')
        .order('createdAt', { ascending: false })
        .limit(40)
        .returns<{ id: string; memorialId: string; authorName: string; createdAt: string }[]>();
      const cross = (crossRows ?? []).filter((r) => !ownedIds.includes(r.memorialId));
      const crossMemorialIds = Array.from(new Set(cross.map((r) => r.memorialId)));
      const crossMemorials = new Map<string, MemorialLite>();
      if (crossMemorialIds.length > 0) {
        const { data: mems } = await supabase
          .from('Memorial')
          .select('id, slug, firstname, lastname')
          .in('id', crossMemorialIds)
          .eq('isPublic', true)
          .returns<MemorialLite[]>();
        for (const m of mems ?? []) crossMemorials.set(m.id, m);
      }
      for (const r of cross) {
        const memorial = crossMemorials.get(r.memorialId);
        if (!memorial) continue;
        networkEvents.push({
          authorName: r.authorName || t('anonymous'),
          memorial,
          testimonialId: r.id,
          createdAt: r.createdAt,
        });
      }
    }
  }
  const networkTop = networkEvents.slice(0, 15);

  return (
    <DashboardShell title={t('title')}>
      <p className="text-muted-foreground -mt-4 mb-6 text-sm">{t('subtitle')}</p>

      {summaryCards.length > 0 && (
        <section className="mb-8 space-y-4">
          <h2 className="font-display text-foreground text-base font-bold">
            {t('sectionContributions')}
          </h2>
          <div className="space-y-4">
            {summaryCards.map(({ memorial, summary }) => {
              const name = [memorial.firstname, memorial.lastname].filter(Boolean).join(' ');
              return (
                <div
                  key={memorial.id}
                  className="border-border rounded-xl border bg-white p-4 shadow-sm"
                >
                  <div className="mb-3 flex items-baseline justify-between gap-2">
                    <Link
                      href={`/memorial/${memorial.slug}`}
                      className="font-display text-foreground hover:text-primary text-sm font-bold"
                    >
                      {name}
                    </Link>
                  </div>
                  <div className="space-y-2">
                    <ContributionGroup
                      label={t('contribDonations')}
                      icon="donation"
                      totalCents={summary.donationTotal}
                      currency={summary.donationCurrency}
                      count={summary.donationCount}
                      contributors={summary.donors}
                    />
                    <ContributionGroup
                      label={t('contribShop')}
                      icon="shop"
                      totalCents={summary.shopTotal}
                      currency="EUR"
                      count={summary.shopCount}
                      contributors={summary.shopBuyers}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {networkTop.length > 0 && (
        <section className="mb-8 space-y-3">
          <h2 className="font-display text-foreground text-base font-bold">{t('networkTitle')}</h2>
          <p className="text-muted-foreground -mt-1 text-xs">{t('networkSubtitle')}</p>
          <ul className="space-y-2">
            {networkTop.map((ev, i) => {
              const name = [ev.memorial.firstname, ev.memorial.lastname].filter(Boolean).join(' ');
              return (
                <li
                  key={`net-${ev.testimonialId}-${i}`}
                  className="border-border flex items-start justify-between gap-3 rounded-lg border bg-white p-4 shadow-sm"
                >
                  <p className="text-foreground min-w-0 text-sm leading-relaxed">
                    <span className="font-display font-bold">{ev.authorName}</span>{' '}
                    {t('networkPostedOn')}{' '}
                    <Link
                      href={`/memorial/${ev.memorial.slug}`}
                      className="font-display text-foreground hover:text-primary font-bold"
                    >
                      {name}
                    </Link>
                  </p>
                  <Link
                    href={`/memorial/${ev.memorial.slug}#testimonial-${ev.testimonialId}`}
                    className="text-primary shrink-0 text-xs font-medium hover:underline"
                  >
                    {t('viewMemorial')} →
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {top.length === 0 ? (
        <EmptyState title={t('emptyTitle')} description={t('emptyBody')} />
      ) : (
        <ul className="space-y-3">
          {top.map((event, i) => {
            const memorialName = [event.memorial.firstname, event.memorial.lastname]
              .filter(Boolean)
              .join(' ');
            const dotColor =
              event.kind === 'testimonial'
                ? 'bg-primary'
                : event.kind === 'like'
                  ? 'bg-accent'
                  : event.kind === 'donation'
                    ? 'bg-accent'
                    : 'bg-secondary';

            let message: string;
            let href: string;
            if (event.kind === 'donation') {
              const amount = new Intl.NumberFormat('fr-FR', {
                style: 'currency',
                currency: event.currency,
                maximumFractionDigits: 0,
              }).format(event.amount / 100);
              message = t('eventDonationReceived', {
                author: event.donorName || t('anonymous'),
                memorial: memorialName,
                amount,
              });
              href = `/memorial/${event.memorial.slug}?tab=donate`;
            } else {
              const authorName =
                event.kind === 'like' ? t('anonymous') : (event.authorName ?? t('anonymous'));
              const messageKey =
                event.kind === 'testimonial'
                  ? 'eventTestimonialReceived'
                  : event.kind === 'like'
                    ? 'eventLikeReceived'
                    : 'eventCommentReceived';
              message = t(messageKey, { author: authorName, memorial: memorialName });
              href = `/memorial/${event.memorial.slug}#testimonial-${event.testimonialId}`;
            }

            const itemKey =
              event.kind === 'donation'
                ? `donation-${event.donationId}`
                : `${event.kind}-${event.testimonialId}-${i}`;

            return (
              <li
                key={itemKey}
                className="animate-fade-in-up border-border flex items-start gap-3 rounded-lg border bg-white p-4 shadow-sm"
                style={{ animationDelay: `${Math.min(i * 25, 200)}ms` }}
              >
                <span
                  aria-hidden="true"
                  className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${dotColor}`}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-foreground text-sm leading-relaxed">{message}</p>
                  <p
                    className="text-muted-foreground tabular mt-1 text-xs"
                    suppressHydrationWarning
                  >
                    {new Date(event.createdAt).toLocaleString('fr-FR', {
                      timeZone: 'Europe/Paris',
                    })}
                  </p>
                </div>
                <Link
                  href={href}
                  className="text-primary shrink-0 text-xs font-medium hover:underline"
                >
                  {t('viewMemorial')} →
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </DashboardShell>
  );
}
