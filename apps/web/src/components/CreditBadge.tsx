import { Link } from '@/i18n/navigation';
import { getCurrentUser } from '@/lib/supabase/server';
import { getBalance } from '@/lib/credits/balance';

/**
 * Compact credit balance pill linking to the buy-credits page. Renders
 * nothing for anonymous visitors.
 */
export async function CreditBadge() {
  const user = await getCurrentUser();
  if (!user) return null;
  const balance = await getBalance(user.id);

  return (
    <Link
      href="/dashboard/profile/credits"
      aria-label={`${balance} crédits Testimona — acheter plus`}
      className="press-scale border-border font-display text-foreground hover:border-primary hover:text-primary inline-flex items-center gap-1.5 rounded-full border bg-white px-3 py-1.5 text-xs font-bold transition-colors"
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="text-accent"
      >
        <path d="M12 2L4 7v10l8 5 8-5V7z" />
        <path d="M12 22V12" />
        <path d="M4 7l8 5 8-5" />
      </svg>
      <span className="tabular">{balance}</span>
    </Link>
  );
}
