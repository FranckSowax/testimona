export default function NotificationsLoading() {
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
