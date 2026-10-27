import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getFormatter, getTranslations, setRequestLocale } from 'next-intl/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/supabase/server';
import { getDossier, getPerson, listInvitations, listMembers } from '@/modules/dossier/repo';
import { canManageMembers } from '@/modules/dossier/roles';
import { InviteForm } from '@/modules/dossier/ui/InviteForm';
import { RevokeButton } from '@/modules/dossier/ui/RevokeButton';

export const metadata: Metadata = { robots: { index: false, follow: false } };

const IdSchema = z.string().uuid();

export default async function MembersPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  if (!IdSchema.safeParse(id).success) notFound();

  const [t, format, user, dossier] = await Promise.all([
    getTranslations('dossier'),
    getFormatter(),
    getCurrentUser(),
    getDossier(id),
  ]);
  if (!dossier || !user) notFound();

  const [person, members] = await Promise.all([getPerson(id), listMembers(id)]);
  const myRole = members.find((m) => m.userId === user.id)?.role ?? null;
  const manager = canManageMembers(myRole);
  const now = new Date();
  const invitations = manager
    ? (await listInvitations(id)).filter((i) => !i.usedAt && new Date(i.expiresAt) > now)
    : [];
  const personName = person ? `${person.firstName} ${person.lastName}` : dossier.title;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8 px-4 py-8 sm:px-6 lg:py-12">
      <h1 className="font-display text-foreground text-3xl font-bold tracking-tight">
        {t('members.title')}
      </h1>

      <ul className="divide-border border-border divide-y rounded-2xl border">
        {members.map((m) => (
          <li key={m.userId} className="flex items-center justify-between gap-3 px-5 py-3">
            <span className="text-foreground">
              {m.displayName ?? t('members.unnamed')}
              {m.userId === user.id && (
                <span className="text-muted-foreground"> ({t('members.you')})</span>
              )}
            </span>
            <span className="text-muted-foreground text-sm">{t(`members.roles.${m.role}`)}</span>
          </li>
        ))}
      </ul>

      <section className="space-y-4">
        <h2 className="font-display text-foreground text-xl font-semibold">
          {t('members.inviteTitle')}
        </h2>
        {manager ? (
          <InviteForm
            dossierId={id}
            personName={personName}
            emailEnabled={Boolean(process.env.RESEND_API_KEY)}
          />
        ) : (
          <p className="text-muted-foreground">{t('members.readOnly')}</p>
        )}
      </section>

      {invitations.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-display text-foreground text-lg font-semibold">
            {t('members.pendingTitle')}
          </h2>
          <ul className="divide-border border-border divide-y rounded-2xl border">
            {invitations.map((inv) => (
              <li
                key={inv.id}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
              >
                <span className="text-foreground">
                  {t(`members.roles.${inv.role}`)}
                  {inv.email ? ` · ${inv.email}` : ''}
                  <span className="text-muted-foreground text-sm">
                    {' · '}
                    {t('members.expires', {
                      date: format.dateTime(new Date(inv.expiresAt), { dateStyle: 'medium' }),
                    })}
                  </span>
                </span>
                <RevokeButton
                  dossierId={id}
                  invitationId={inv.id}
                  hiddenLabel={`${t(`members.roles.${inv.role}`)}${inv.email ? `, ${inv.email}` : ''}, ${t(
                    'members.expires',
                    { date: format.dateTime(new Date(inv.expiresAt), { dateStyle: 'medium' }) },
                  )}`}
                />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
