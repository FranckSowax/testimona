import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { getUnseenNotificationsCount } from '@/lib/notifications/count';
import { Button } from './ui/Button';
import { AppSidebarNav } from './AppSidebarNav';

export async function AppSidebar() {
  const [t, navT, badge] = await Promise.all([
    getTranslations('home.sidebar'),
    getTranslations('dashboard.nav'),
    getUnseenNotificationsCount(),
  ]);

  return (
    <aside aria-label={navT('aria')} className="space-y-4">
      <Link href="/dashboard/new">
        <Button variant="primary" fullWidth>
          {t('createMemorial')}
        </Button>
      </Link>
      <AppSidebarNav
        labels={{
          memorials: navT('memorials'),
          testimonials: navT('testimonials'),
          notifications: navT('notifications'),
          profile: navT('profile'),
          aria: navT('aria'),
        }}
        notificationsBadge={badge}
      />
    </aside>
  );
}
