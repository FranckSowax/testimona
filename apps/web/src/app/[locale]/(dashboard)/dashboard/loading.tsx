/**
 * Minimal loading state — replaces the previous 6-skeleton-card grid that
 * looked like the page had loaded with empty content. A small centered
 * spinner makes "still loading" obvious instead of presenting fake UI
 * the user keeps waiting for to fill in.
 */
export default function DashboardLoading() {
  return (
    <div
      role="status"
      aria-label="Chargement"
      className="mx-auto flex min-h-[50dvh] w-full max-w-6xl items-center justify-center px-4 py-12"
    >
      <span className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}
