import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { getCurrentUser } from '@/lib/supabase/server';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { ProfileForm } from './ProfileForm';
import { getUnseenNotificationsCount } from '@/lib/notifications/count';

export const metadata: Metadata = {
  title: 'Mon profil',
  robots: { index: false, follow: false },
};

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/dashboard/profile');

  const [t, notificationsBadge] = await Promise.all([
    getTranslations('dashboard.profile'),
    getUnseenNotificationsCount(),
  ]);
  const meta =
    (user.user_metadata as
      | { full_name?: string; nickname?: string; avatar_url?: string | null }
      | null) ?? {};

  return (
    <DashboardShell title={t('title')} notificationsBadge={notificationsBadge}>
      <p className="-mt-4 mb-6 text-sm text-muted-foreground">{t('subtitle')}</p>
      <ProfileForm
        defaultValues={{
          fullName: meta.full_name ?? '',
          nickname: meta.nickname ?? '',
          email: user.email ?? '',
          avatarUrl: meta.avatar_url ?? null,
        }}
      />
    </DashboardShell>
  );
}
