import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { getCurrentUser } from '@/lib/supabase/server';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { SettingsAccordion } from '@/components/dashboard/SettingsAccordion';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { ProfileForm } from './ProfileForm';

export const metadata: Metadata = {
  title: 'Settings',
  robots: { index: false, follow: false },
};

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/dashboard/profile');

  const t = await getTranslations('dashboard.profile');
  const meta =
    (user.user_metadata as
      | { full_name?: string; nickname?: string; avatar_url?: string | null }
      | null) ?? {};

  return (
    <DashboardShell title="Settings">
      <Breadcrumb
        items={[{ label: 'Settings', href: '/dashboard/profile' }, { label: 'My account' }]}
        className="-mt-2 mb-4"
      />
      <p className="mb-6 text-sm text-muted-foreground">{t('subtitle')}</p>

      <SettingsAccordion
        ariaLabel="Account settings"
        sections={[
          {
            id: 'my-account',
            title: 'My account',
            description: 'Profile picture, personal information, contact email.',
            defaultOpen: true,
            content: (
              <ProfileForm
                defaultValues={{
                  fullName: meta.full_name ?? '',
                  nickname: meta.nickname ?? '',
                  email: user.email ?? '',
                  avatarUrl: meta.avatar_url ?? null,
                }}
              />
            ),
          },
          {
            id: 'sign-in-security',
            title: 'Sign in and Security',
            description: 'Password and security questions.',
            content: (
              <p className="text-sm italic text-muted-foreground">
                Coming soon : reset password, security questions, two-factor authentication.
              </p>
            ),
          },
          {
            id: 'donations',
            title: 'Donations',
            description: 'Manage donations made and received.',
            content: (
              <p className="text-sm italic text-muted-foreground">
                Coming soon : view your donations history and donations received on your memorials.
              </p>
            ),
          },
          {
            id: 'request-payment',
            title: 'Request Payment',
            description: 'Configure how you receive donation payouts.',
            content: (
              <p className="text-sm italic text-muted-foreground">
                Coming soon : payout method setup (PayPal / bank transfer) and tax forms.
              </p>
            ),
          },
        ]}
      />
    </DashboardShell>
  );
}
