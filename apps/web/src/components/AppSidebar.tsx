import { getTranslations } from 'next-intl/server';
import { getUnseenNotificationsCount } from '@/lib/notifications/count';
import { AppSidebarNav } from './AppSidebarNav';
import { AdSlot } from './AdSlot';

export async function AppSidebar() {
  const [navT, badge] = await Promise.all([
    getTranslations('dashboard.nav'),
    getUnseenNotificationsCount(),
  ]);

  return (
    <aside aria-label={navT('aria')} className="space-y-6">
      <AppSidebarNav
        labels={{
          home: navT('home'),
          memorials: navT('memorials'),
          testimonials: navT('testimonials'),
          notifications: navT('notifications'),
          settings: navT('settings'),
          aria: navT('aria'),
        }}
        notificationsBadge={badge}
      />

      <AdSlot
        slot="home-sidebar"
        fallback={
          <div
            aria-label="Advertisement placeholder"
            className="h-[420px] rounded-md border border-dashed border-border bg-white p-4"
          >
            <p className="text-xs text-muted-foreground">Ads slot · home-sidebar</p>
          </div>
        }
      />
    </aside>
  );
}
