import type { ReactNode } from 'react';
import { getTranslations } from 'next-intl/server';
import { AdminSidebarNav } from './AdminSidebarNav';

export async function AdminShell({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  const t = await getTranslations('admin.nav');

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:py-10">
      <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
        <aside className="hidden lg:block">
          <div className="sticky top-24 space-y-4">
            <div className="rounded-md border border-border bg-white p-3">
              <p className="font-display text-xs font-bold uppercase tracking-wide text-muted-foreground">
                {t('header')}
              </p>
            </div>
            <AdminSidebarNav
              labels={{
                overview: t('overview'),
                users: t('users'),
                memorials: t('memorials'),
                testimonials: t('testimonials'),
                donations: t('donations'),
                reports: t('reports'),
                ads: t('ads'),
                clips: 'Clips',
                credits: 'Crédits',
                settings: t('settings'),
                aria: t('aria'),
              }}
            />
          </div>
        </aside>

        <main className="min-w-0">
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
