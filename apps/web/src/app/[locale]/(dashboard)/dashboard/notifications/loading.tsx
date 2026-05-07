import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { Skeleton } from '@/components/Skeleton';

export default function NotificationsLoading() {
  return (
    <DashboardShell title="…">
      <ul className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <li
            key={i}
            className="flex items-start gap-3 rounded-lg border border-border bg-white p-4 shadow-sm"
          >
            <Skeleton className="mt-1.5 h-2.5 w-2.5 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-2/3 rounded" />
              <Skeleton className="h-3 w-1/3 rounded" />
            </div>
          </li>
        ))}
      </ul>
    </DashboardShell>
  );
}
