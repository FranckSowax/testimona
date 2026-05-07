import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { Skeleton, SkeletonCard } from '@/components/Skeleton';

export default function DashboardLoading() {
  return (
    <DashboardShell title="…" action={<Skeleton className="h-10 w-40" />}>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <li key={i}>
            <SkeletonCard />
          </li>
        ))}
      </ul>
    </DashboardShell>
  );
}
