import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { Link } from '@/i18n/navigation';
import { getTranslations } from 'next-intl/server';
import { getCurrentUser, getSupabaseServer } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { EmptyState } from '@/components/EmptyState';
import { AdminRequestActions } from './AdminRequestActions';
import { MemorialInviteActions } from './MemorialInviteActions';

interface InviteRow {
  id: string;
  memorialId: string;
  invitedEmail: string | null;
  status: string;
  createdAt: string;
}

async function getMyInvites(
  userId: string,
  email: string | null,
): Promise<{ invites: InviteRow[]; memorials: Map<string, MemorialLite> }> {
  const adminDb = getSupabaseAdminClient();
  const orFilter = email
    ? `userId.eq.${userId},invitedEmail.ilike.${email}`
    : `userId.eq.${userId}`;
  const { data } = await adminDb
    .from('MemorialMember')
    .select('id, memorialId, invitedEmail, status, createdAt')
    .eq('status', 'pending')
    .or(orFilter)
    .order('createdAt', { ascending: false })
    .returns<InviteRow[]>();
  const invites = data ?? [];
  const memorials = new Map<string, MemorialLite>();
  if (invites.length > 0) {
    const ids = Array.from(new Set(invites.map((i) => i.memorialId)));
    const { data: mems } = await adminDb
      .from('Memorial')
      .select('id, slug, firstname, lastname')
      .in('id', ids)
      .returns<MemorialLite[]>();
    for (const m of mems ?? []) memorials.set(m.id, m);
  }
  return { invites, memorials };
}

export const metadata: Metadata = {
  title: 'Admin requests',
  robots: { index: false, follow: false },
};

interface MemorialLite {
  id: string;
  slug: string;
  firstname: string;
  lastname: string;
}

interface RequestRow {
  id: string;
  memorialId: string;
  userId: string;
  relationship: string;
  note: string | null;
  status: string | null;
  createdAt: string;
}

function formatDate(iso: string, locale: string): string {
  return new Date(iso).toLocaleDateString(locale);
}

export default async function AdminRequestsInboxPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/dashboard/admin-requests');
  const { locale } = await params;
  const t = await getTranslations('dashboard.adminRequests');
  const supabase = await getSupabaseServer();

  // Fetch memorials owned by the current user, then their pending requests.
  const { data: owned } = await supabase
    .from('Memorial')
    .select('id, slug, firstname, lastname')
    .eq('ownerId', user.id)
    .returns<MemorialLite[]>();
  const ownedRows = owned ?? [];
  const ownedIds = ownedRows.map((m) => m.id);
  const memorialMap = new Map(ownedRows.map((m) => [m.id, m]));

  let requests: RequestRow[] = [];
  if (ownedIds.length > 0) {
    const { data } = await supabase
      .from('MemorialAdminRequest')
      .select('id, memorialId, userId, relationship, note, status, createdAt')
      .in('memorialId', ownedIds)
      .order('createdAt', { ascending: false })
      .returns<RequestRow[]>();
    requests = data ?? [];
  }
  const pending = requests.filter((r) => !r.status || r.status === 'pending');
  const resolved = requests.filter((r) => r.status === 'accepted' || r.status === 'declined');

  // Lookup requester emails via service-role (admin can resolve anyone's email
  // — the owner role here is restricted to their own memorial's requests).
  const requesterEmails = new Map<string, string | null>();
  if (requests.length > 0) {
    const adminDb = getSupabaseAdminClient();
    const uniqueUserIds = Array.from(new Set(requests.map((r) => r.userId)));
    await Promise.all(
      uniqueUserIds.map(async (uid) => {
        const { data } = await adminDb.auth.admin.getUserById(uid);
        requesterEmails.set(uid, data?.user?.email ?? null);
      }),
    );
  }

  const labels = { accept: t('accept'), decline: t('decline') };

  // G3 — invitations the current user has received (by linked id or email).
  const { invites, memorials: inviteMemorials } = await getMyInvites(
    user.id,
    user.email ?? null,
  );

  return (
    <DashboardShell title={t('title')}>
      <p className="-mt-4 mb-6 text-sm text-muted-foreground">{t('subtitle')}</p>

      {invites.length > 0 && (
        <section className="mb-10 space-y-4">
          <header className="flex items-baseline justify-between">
            <h2 className="font-display text-base font-bold text-foreground">
              Invitations reçues
            </h2>
            <span className="rounded-full bg-accent/15 px-2.5 py-0.5 font-display text-[11px] font-bold tabular text-accent">
              {invites.length}
            </span>
          </header>
          <ul className="space-y-3">
            {invites.map((inv) => {
              const memorial = inviteMemorials.get(inv.memorialId);
              return (
                <li
                  key={inv.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-accent/30 bg-accent/5 p-4"
                >
                  <p className="text-sm text-foreground">
                    Invitation à co-administrer{' '}
                    {memorial ? (
                      <Link
                        href={`/memorial/${memorial.slug}`}
                        target="_blank"
                        className="font-display font-bold text-foreground hover:text-primary"
                      >
                        {memorial.firstname} {memorial.lastname}
                      </Link>
                    ) : (
                      'un mémorial'
                    )}
                  </p>
                  <MemorialInviteActions memberId={inv.id} labels={labels} />
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="space-y-4">
        <header className="flex items-baseline justify-between">
          <h2 className="font-display text-base font-bold text-foreground">
            {t('pendingTitle')}
          </h2>
          {pending.length > 0 && (
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 font-display text-[11px] font-bold tabular text-primary">
              {pending.length}
            </span>
          )}
        </header>
        {pending.length === 0 ? (
          <EmptyState title={t('emptyPendingTitle')} description={t('emptyPendingBody')} />
        ) : (
          <ul className="space-y-3">
            {pending.map((r) => {
              const memorial = memorialMap.get(r.memorialId);
              const requesterEmail =
                requesterEmails.get(r.userId) ?? r.userId.slice(0, 8);
              return (
                <li
                  key={r.id}
                  className="rounded-lg border border-border bg-white p-4 shadow-sm"
                >
                  <header className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-display text-sm font-bold text-foreground">
                      {requesterEmail}
                      {memorial && (
                        <>
                          {' '}
                          <span className="text-muted-foreground">·</span>{' '}
                          <Link
                            href={`/memorial/${memorial.slug}`}
                            target="_blank"
                            className="font-normal italic text-muted-foreground hover:text-primary"
                          >
                            {memorial.firstname} {memorial.lastname}
                          </Link>
                        </>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(r.createdAt, locale)}
                    </p>
                  </header>
                  <p className="mt-2 text-sm">
                    <span className="font-display text-xs font-bold uppercase tracking-wide text-muted-foreground">
                      {t('relationship')}
                    </span>{' '}
                    <span className="text-foreground">{r.relationship}</span>
                  </p>
                  {r.note && (
                    <blockquote className="mt-2 border-l-2 border-border pl-3 text-sm italic text-muted-foreground">
                      {r.note}
                    </blockquote>
                  )}
                  <footer className="mt-4 flex justify-end">
                    <AdminRequestActions
                      requestId={r.id}
                      memorialId={r.memorialId}
                      memorialSlug={memorial?.slug ?? ''}
                      labels={labels}
                    />
                  </footer>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {resolved.length > 0 && (
        <section className="mt-10 space-y-3">
          <h2 className="font-display text-base font-bold text-foreground">
            {t('historyTitle')}
          </h2>
          <ul className="divide-y divide-border overflow-hidden rounded-md border border-border bg-white">
            {resolved.slice(0, 20).map((r) => {
              const memorial = memorialMap.get(r.memorialId);
              const requesterEmail =
                requesterEmails.get(r.userId) ?? r.userId.slice(0, 8);
              return (
                <li
                  key={r.id}
                  className="flex flex-wrap items-baseline justify-between gap-2 p-3 text-sm"
                >
                  <span>
                    <span className="font-display font-bold text-foreground">
                      {requesterEmail}
                    </span>
                    {memorial && (
                      <span className="ml-2 text-xs italic text-muted-foreground">
                        {memorial.firstname} {memorial.lastname}
                      </span>
                    )}
                  </span>
                  <span
                    className={[
                      'rounded-full px-2 py-0.5 font-display text-[10px] font-bold uppercase tracking-wide',
                      r.status === 'accepted'
                        ? 'bg-primary/10 text-primary'
                        : 'bg-foreground/10 text-foreground/70',
                    ].join(' ')}
                  >
                    {r.status === 'accepted' ? t('accepted') : t('declined')}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </DashboardShell>
  );
}
