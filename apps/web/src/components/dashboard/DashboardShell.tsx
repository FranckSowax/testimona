import type { ReactNode } from 'react';
import { getTranslations } from 'next-intl/server';
import { getUnseenNotificationsCount } from '@/lib/notifications/count';
import { AppSidebar } from '@/components/AppSidebar';
import { DashboardMobileNav } from './DashboardMobileNav';

export async function DashboardShell({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  const [navT, badge] = await Promise.all([
    getTranslations('dashboard.nav'),
    getUnseenNotificationsCount(),
  ]);
  const labels = {
    home: navT('home'),
    memorials: navT('memorials'),
    testimonials: navT('testimonials'),
    notifications: navT('notifications'),
    settings: navT('settings'),
    aria: navT('aria'),
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:py-12">
      <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
        <aside className="hidden lg:block">
          <div className="sticky top-24">
            <AppSidebar />
          </div>
        </aside>

        <main className="min-w-0">
          <DashboardMobileNav labels={labels} notificationsBadge={badge} />
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
            <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              {title}
            </h1>
            {action && <div className="flex items-center gap-2">{action}</div>}
          </header>
          <div className="mt-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
