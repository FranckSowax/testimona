import { getTranslations } from 'next-intl/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { InviteCoOwnerForm } from './InviteCoOwnerForm';
import { MemberRemoveButton } from './MemberRemoveButton';

interface MemberRow {
  id: string;
  userId: string | null;
  invitedEmail: string | null;
  status: string;
  createdAt: string;
}

/**
 * Owner-only panel to manage co-owners (G3): invite by email + list current
 * admins and pending invites.
 */
export async function MemorialMembersSection({
  memorialId,
  slug,
}: {
  memorialId: string;
  slug: string;
}) {
  const t = await getTranslations('memorial.membersSection');
  const adminDb = getSupabaseAdminClient();
  const { data: rows } = await adminDb
    .from('MemorialMember')
    .select('id, userId, invitedEmail, status, createdAt')
    .eq('memorialId', memorialId)
    .neq('status', 'rejected')
    .order('createdAt', { ascending: true })
    .returns<MemberRow[]>();
  const members = rows ?? [];

  // Resolve a display label (account email when linked, else invited email).
  const labels = new Map<string, string>();
  await Promise.all(
    members.map(async (m) => {
      if (m.userId) {
        const { data } = await adminDb.auth.admin.getUserById(m.userId);
        labels.set(m.id, data?.user?.email ?? m.invitedEmail ?? '—');
      } else {
        labels.set(m.id, m.invitedEmail ?? '—');
      }
    }),
  );

  return (
    <section className="border-border mt-8 rounded-lg border bg-white p-5 shadow-sm">
      <header className="mb-3">
        <h3 className="font-display text-foreground text-base font-bold">{t('title')}</h3>
        <p className="text-muted-foreground mt-1 text-sm">{t('subtitle')}</p>
      </header>

      <InviteCoOwnerForm memorialId={memorialId} slug={slug} />

      {members.length > 0 && (
        <ul className="divide-border mt-4 divide-y">
          {members.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
              <span className="min-w-0">
                <span className="font-display text-foreground text-sm font-bold">
                  {labels.get(m.id)}
                </span>
                <span
                  className={[
                    'font-display ml-2 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                    m.status === 'accepted'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-accent/15 text-accent',
                  ].join(' ')}
                >
                  {m.status === 'accepted' ? t('admin') : t('pendingInvite')}
                </span>
              </span>
              <MemberRemoveButton memberId={m.id} slug={slug} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
