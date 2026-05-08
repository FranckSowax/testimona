import type { ReactNode } from 'react';
import { AppSidebar } from '@/components/AppSidebar';

export function DashboardShell({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8 lg:py-12">
      <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
        <aside className="hidden lg:block">
          <div className="sticky top-24">
            <AppSidebar />
          </div>
        </aside>

        <main className="min-w-0">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
            <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
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
