import { getTranslations } from 'next-intl/server';

export default async function NotificationsLoading() {
  const t = await getTranslations('dashboard.notifications');
  return (
    <div
      role="status"
      aria-label={t('loadingAria')}
      className="mx-auto flex min-h-[50dvh] w-full max-w-6xl items-center justify-center px-4 py-12"
    >
      <span className="border-primary h-10 w-10 animate-spin rounded-full border-4 border-t-transparent" />
    </div>
  );
}
