import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { Skeleton } from '@/components/Skeleton';

export default function ProfileLoading() {
  return (
    <DashboardShell title="…">
      <div className="space-y-8">
        <div className="space-y-5 rounded-lg border border-border bg-white p-6 shadow-sm">
          <Skeleton className="h-4 w-32 rounded" />
          <Skeleton className="h-10 w-full rounded" />
          <div className="grid gap-5 sm:grid-cols-2">
            <Skeleton className="h-10 w-full rounded" />
            <Skeleton className="h-10 w-full rounded" />
          </div>
          <div className="flex justify-end">
            <Skeleton className="h-10 w-24 rounded" />
          </div>
        </div>
        <div className="rounded-lg border border-border bg-white p-6 shadow-sm">
          <Skeleton className="h-5 w-40 rounded" />
          <Skeleton className="mt-3 h-3 w-2/3 rounded" />
          <Skeleton className="mt-4 h-10 w-48 rounded" />
        </div>
      </div>
    </DashboardShell>
  );
}
