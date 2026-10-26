import { Link } from '@/i18n/navigation';
import { getBalance } from '@/lib/credits/balance';

export async function CreditsSummarySection({ userId }: { userId: string }) {
  const balance = await getBalance(userId);
  return (
    <div className="border-border bg-surface/40 rounded-xl border p-4 sm:flex sm:items-center sm:justify-between sm:gap-4">
      <div>
        <p className="font-display text-muted-foreground text-xs font-bold uppercase tracking-wider">
          Solde courant
        </p>
        <p className="font-display mt-1 flex items-baseline gap-2">
          <span className="tabular text-foreground text-3xl font-bold">{balance}</span>
          <span className="text-muted-foreground text-sm">crédit{balance === 1 ? '' : 's'}</span>
        </p>
      </div>
      <Link
        href="/dashboard/profile/credits"
        className="press-scale bg-primary font-display text-primary-foreground mt-3 inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-bold transition-opacity hover:opacity-90 sm:mt-0"
      >
        Acheter des crédits
      </Link>
    </div>
  );
}
