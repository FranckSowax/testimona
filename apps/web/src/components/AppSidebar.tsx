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
          clips: 'Clips',
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
            className="border-border h-[420px] rounded-md border border-dashed bg-white p-4"
          >
            <p className="text-muted-foreground text-xs">Ads slot · home-sidebar</p>
          </div>
        }
      />
    </aside>
  );
}
