import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { Skeleton, SkeletonText } from '@/components/Skeleton';

export default function TestimonialsLoading() {
  return (
    <DashboardShell title="…">
      <ul className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <li key={i} className="rounded-lg border border-border bg-white p-5 shadow-sm">
            <Skeleton className="h-3 w-32 rounded" />
            <Skeleton className="mt-3 h-5 w-1/2 rounded" />
            <SkeletonText lines={2} className="mt-3" />
            <Skeleton className="mt-4 h-3 w-1/3 rounded" />
          </li>
        ))}
      </ul>
    </DashboardShell>
  );
}
