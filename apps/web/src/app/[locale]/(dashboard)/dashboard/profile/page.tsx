import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { getCurrentUser } from '@/lib/supabase/server';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { SettingsAccordion } from '@/components/dashboard/SettingsAccordion';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { ProfileForm } from './ProfileForm';
import { SecuritySection } from './SecuritySection';
import { DonationsHistorySection } from './DonationsHistorySection';
import { PayoutSection } from './PayoutSection';

export const metadata: Metadata = {
  title: 'Settings',
  robots: { index: false, follow: false },
};

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/dashboard/profile');
  const { locale } = await params;

  const [t, tSec, tPay, tShared] = await Promise.all([
    getTranslations('dashboard.profile'),
    getTranslations('dashboard.profile.security'),
    getTranslations('dashboard.profile.payout'),
    getTranslations('dashboard.profile'),
  ]);
  const meta =
    (user.user_metadata as
      | { full_name?: string; nickname?: string; avatar_url?: string | null }
      | null) ?? {};

  const securityLabels = {
    formTitle: tSec('formTitle'),
    formSubtitle: tSec('formSubtitle'),
    newPassword: tSec('newPassword'),
    confirmPassword: tSec('confirmPassword'),
    save: tSec('save'),
    saving: tSec('saving'),
    saved: tSec('saved'),
    resetTitle: tSec('resetTitle'),
    resetBody: tSec('resetBody'),
    resetCta: tSec('resetCta'),
    resetSent: tSec('resetSent'),
  };

  const payoutLabels = {
    intro: tPay('intro'),
    methodLabel: tPay('methodLabel'),
    methodHint: tPay('methodHint'),
    methodPaypal: tPay('methodPaypal'),
    methodBank: tPay('methodBank'),
    methodOther: tPay('methodOther'),
    noteLabel: tPay('noteLabel'),
    notePlaceholder: tPay('notePlaceholder'),
    submit: tPay('submit'),
    submitting: tPay('submitting'),
    sent: tPay('sent'),
  };

  return (
    <DashboardShell title={tShared('title')}>
      <Breadcrumb
        items={[
          { label: tShared('title'), href: '/dashboard/profile' },
          { label: tShared('breadcrumbAccount') },
        ]}
        className="-mt-2 mb-4"
      />
      <p className="mb-6 text-sm text-muted-foreground">{t('subtitle')}</p>

      <SettingsAccordion
        ariaLabel={tShared('accordionAria')}
        sections={[
          {
            id: 'my-account',
            title: tShared('myAccount'),
            description: tShared('myAccountDesc'),
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
            title: tShared('securityTitle'),
            description: tShared('securityDesc'),
            content: <SecuritySection labels={securityLabels} />,
          },
          {
            id: 'donations',
            title: tShared('donationsTitle'),
            description: tShared('donationsDesc'),
            content: <DonationsHistorySection locale={locale} />,
          },
          {
            id: 'request-payment',
            title: tShared('payoutTitle'),
            description: tShared('payoutDesc'),
            content: <PayoutSection labels={payoutLabels} />,
          },
        ]}
      />
    </DashboardShell>
  );
}
