import { Link } from '@/i18n/navigation';
import { getBalance } from '@/lib/credits/balance';

export async function CreditsSummarySection({ userId }: { userId: string }) {
  const balance = await getBalance(userId);
  return (
    <div className="rounded-xl border border-border bg-surface/40 p-4 sm:flex sm:items-center sm:justify-between sm:gap-4">
      <div>
        <p className="font-display text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Solde courant
        </p>
        <p className="mt-1 flex items-baseline gap-2 font-display">
          <span className="tabular text-3xl font-bold text-foreground">
            {balance}
          </span>
          <span className="text-sm text-muted-foreground">
            crédit{balance === 1 ? '' : 's'}
          </span>
        </p>
      </div>
      <Link
        href="/dashboard/profile/credits"
        className="press-scale mt-3 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 font-display text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90 sm:mt-0"
      >
        Acheter des crédits
      </Link>
    </div>
  );
}
