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
    <section className="mt-8 rounded-lg border border-border bg-white p-5 shadow-sm">
      <header className="mb-3">
        <h3 className="font-display text-base font-bold text-foreground">
          Co-administrateurs
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Invitez d&apos;autres proches à gérer cette page. Ils recevront un
          e-mail et pourront accepter ou refuser.
        </p>
      </header>

      <InviteCoOwnerForm memorialId={memorialId} slug={slug} />

      {members.length > 0 && (
        <ul className="mt-4 divide-y divide-border">
          {members.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
              <span className="min-w-0">
                <span className="font-display text-sm font-bold text-foreground">
                  {labels.get(m.id)}
                </span>
                <span
                  className={[
                    'ml-2 rounded-full px-2 py-0.5 font-display text-[10px] font-bold uppercase tracking-wider',
                    m.status === 'accepted'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-accent/15 text-accent',
                  ].join(' ')}
                >
                  {m.status === 'accepted' ? 'Administrateur' : 'Invitation en attente'}
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
